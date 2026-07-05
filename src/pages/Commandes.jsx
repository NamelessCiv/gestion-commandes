import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'

const STATUTS = [
  { value: 'en_attente', label: 'En attente', color: 'text-text-secondary bg-border/50' },
  { value: 'payee', label: 'Payée', color: 'text-success bg-success/10' },
  { value: 'en_preparation', label: 'En préparation', color: 'text-accent bg-accent/10' },
  { value: 'expediee', label: 'Expédiée', color: 'text-accent bg-accent/10' },
  { value: 'livree', label: 'Livrée', color: 'text-success bg-success/10' },
]

// Une commande est considérée "payée" (donc déjà déduite du stock) dès qu'elle
// est payee, expediee ou livree
const STATUTS_PAYES = ['payee', 'expediee', 'livree']

function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [clients, setClients] = useState([])
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [recherche, setRecherche] = useState('')

  // Formulaire de création
  const [clientId, setClientId] = useState('')
  const [nouveauClientNom, setNouveauClientNom] = useState('')
  const [nouveauClientTel, setNouveauClientTel] = useState('')
  const [lignes, setLignes] = useState([{ produit_id: '', quantite: 1 }])

  // Édition d'une commande existante (modification des quantités)
  const [commandeEnEdition, setCommandeEnEdition] = useState(null) // commande d'origine
  const [quantitesEdition, setQuantitesEdition] = useState({}) // { item_id: quantite }
  const [enregistrementEdition, setEnregistrementEdition] = useState(false)

  async function fetchTout() {
    setLoading(true)
    const [{ data: cmds }, { data: cls }, { data: prods }] = await Promise.all([
      supabase
        .from('commandes')
        .select('*, clients(nom, telephone), commande_items(*, produits(nom))')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('nom'),
      supabase.from('produits').select('*').order('nom'),
    ])
    setCommandes(cmds || [])
    setClients(cls || [])
    setProduits(prods || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTout()
  }, [])

  function ajouterLigne() {
    setLignes([...lignes, { produit_id: '', quantite: 1 }])
  }

  function retirerLigne(index) {
    setLignes(lignes.filter((_, i) => i !== index))
  }

  function majLigne(index, champ, valeur) {
    const copie = [...lignes]
    copie[index][champ] = valeur
    setLignes(copie)
  }

  function calculerTotal() {
    return lignes.reduce((total, ligne) => {
      const produit = produits.find((p) => p.id === ligne.produit_id)
      if (!produit) return total
      return total + produit.prix * Number(ligne.quantite || 0)
    }, 0)
  }

  async function handleCreerCommande(e) {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()

    let finalClientId = clientId

    if (!finalClientId && nouveauClientNom) {
      const { data: nouveauClient, error: errClient } = await supabase
        .from('clients')
        .insert({ nom: nouveauClientNom, telephone: nouveauClientTel, user_id: user.id })
        .select()
        .single()

      if (errClient) {
        alert('Erreur création client : ' + errClient.message)
        return
      }
      finalClientId = nouveauClient.id
    }

    const lignesValides = lignes.filter((l) => l.produit_id && l.quantite > 0)
    if (lignesValides.length === 0) {
      alert('Ajoute au moins un produit à la commande.')
      return
    }

    const total = calculerTotal()

    const { data: commande, error: errCommande } = await supabase
      .from('commandes')
      .insert({ client_id: finalClientId || null, total, statut: 'en_attente', user_id: user.id })
      .select()
      .single()

    if (errCommande) {
      alert('Erreur création commande : ' + errCommande.message)
      return
    }

    const items = lignesValides.map((l) => {
      const produit = produits.find((p) => p.id === l.produit_id)
      return {
        commande_id: commande.id,
        produit_id: l.produit_id,
        quantite: Number(l.quantite),
        prix_unitaire: produit.prix,
      }
    })

    const { error: errItems } = await supabase.from('commande_items').insert(items)
    if (errItems) {
      alert('Erreur ajout produits : ' + errItems.message)
      return
    }

    setClientId('')
    setNouveauClientNom('')
    setNouveauClientTel('')
    setLignes([{ produit_id: '', quantite: 1 }])
    setShowForm(false)
    fetchTout()
  }

  async function changerStatut(commande, nouveauStatut) {
    const ancienStatut = commande.statut

    const { error } = await supabase
      .from('commandes')
      .update({ statut: nouveauStatut })
      .eq('id', commande.id)

    if (error) {
      alert('Erreur : ' + error.message)
      return
    }

    const etaitPayee = STATUTS_PAYES.includes(ancienStatut)
    const estPayeeMaintenant = STATUTS_PAYES.includes(nouveauStatut)

    const { data: { user } } = await supabase.auth.getUser()

    // Passage vers un statut "payé" (depuis un statut non payé) : on déduit le stock
    if (estPayeeMaintenant && !etaitPayee) {
      for (const item of commande.commande_items) {
        const produit = produits.find((p) => p.id === item.produit_id)
        if (!produit) continue

        const nouvelleQuantite = Math.max(0, produit.quantite - item.quantite)

        await supabase
          .from('produits')
          .update({ quantite: nouvelleQuantite })
          .eq('id', produit.id)

        await supabase.from('mouvements_stock').insert({
          produit_id: produit.id,
          type: 'sortie',
          quantite: item.quantite,
          commande_id: commande.id,
          user_id: user.id,
        })
      }
    }

    // Marche arrière : on repasse d'un statut "payé" à un statut non payé : on remet le stock
    if (!estPayeeMaintenant && etaitPayee) {
      for (const item of commande.commande_items) {
        const produit = produits.find((p) => p.id === item.produit_id)
        if (!produit) continue

        const nouvelleQuantite = produit.quantite + item.quantite

        await supabase
          .from('produits')
          .update({ quantite: nouvelleQuantite })
          .eq('id', produit.id)

        await supabase.from('mouvements_stock').insert({
          produit_id: produit.id,
          type: 'entree',
          quantite: item.quantite,
          commande_id: commande.id,
          user_id: user.id,
        })
      }
    }

    fetchTout()
  }

  // ===== Édition des quantités d'une commande existante =====

  function ouvrirEdition(commande) {
    setCommandeEnEdition(commande)
    const initial = {}
    commande.commande_items.forEach((item) => {
      initial[item.id] = item.quantite
    })
    setQuantitesEdition(initial)
  }

  function fermerEdition() {
    setCommandeEnEdition(null)
    setQuantitesEdition({})
  }

  function majQuantiteEdition(itemId, valeur) {
    setQuantitesEdition((prev) => ({ ...prev, [itemId]: valeur }))
  }

  function calculerTotalEdition() {
    if (!commandeEnEdition) return 0
    return commandeEnEdition.commande_items.reduce((total, item) => {
      const q = Number(quantitesEdition[item.id] ?? item.quantite)
      return total + q * item.prix_unitaire
    }, 0)
  }

  async function enregistrerEdition() {
    if (!commandeEnEdition) return
    setEnregistrementEdition(true)

    const { data: { user } } = await supabase.auth.getUser()
    const commandeEstPayee = STATUTS_PAYES.includes(commandeEnEdition.statut)

    for (const item of commandeEnEdition.commande_items) {
      const ancienneQuantite = item.quantite
      const nouvelleQuantite = Math.max(0, Number(quantitesEdition[item.id] ?? ancienneQuantite))

      if (nouvelleQuantite === ancienneQuantite) continue

      // Met à jour la quantité de la ligne de commande
      await supabase
        .from('commande_items')
        .update({ quantite: nouvelleQuantite })
        .eq('id', item.id)

      // Si la commande est déjà payée, le stock a déjà été déduit une fois :
      // on ajuste le stock de la différence pour ne pas fausser les chiffres
      if (commandeEstPayee) {
        const produit = produits.find((p) => p.id === item.produit_id)
        if (produit) {
          const delta = ancienneQuantite - nouvelleQuantite // positif = on rend du stock
          const nouvelleQuantiteProduit = Math.max(0, produit.quantite + delta)

          await supabase
            .from('produits')
            .update({ quantite: nouvelleQuantiteProduit })
            .eq('id', produit.id)

          await supabase.from('mouvements_stock').insert({
            produit_id: produit.id,
            type: delta > 0 ? 'entree' : 'sortie',
            quantite: Math.abs(delta),
            commande_id: commandeEnEdition.id,
            user_id: user.id,
          })
        }
      }
    }

    // Met à jour le total de la commande
    const nouveauTotal = calculerTotalEdition()
    await supabase
      .from('commandes')
      .update({ total: nouveauTotal })
      .eq('id', commandeEnEdition.id)

    setEnregistrementEdition(false)
    fermerEdition()
    fetchTout()
  }

  // ===== Suppression d'une commande =====

  async function supprimerCommande(commande) {
    const confirmation = window.confirm(
      `Supprimer définitivement la commande de ${commande.clients?.nom || 'ce client'} (${commande.total.toLocaleString()} FCFA) ?`
    )
    if (!confirmation) return

    const { data: { user } } = await supabase.auth.getUser()
    const commandeEstPayee = STATUTS_PAYES.includes(commande.statut)

    // Si la commande était payée, on remet le stock avant de la supprimer
    // pour ne pas fausser le stock réel
    if (commandeEstPayee) {
      for (const item of commande.commande_items) {
        const produit = produits.find((p) => p.id === item.produit_id)
        if (!produit) continue

        const nouvelleQuantite = produit.quantite + item.quantite

        await supabase
          .from('produits')
          .update({ quantite: nouvelleQuantite })
          .eq('id', produit.id)

        await supabase.from('mouvements_stock').insert({
          produit_id: produit.id,
          type: 'entree',
          quantite: item.quantite,
          commande_id: commande.id,
          user_id: user.id,
        })
      }
    }

    await supabase.from('commande_items').delete().eq('commande_id', commande.id)
    const { error } = await supabase.from('commandes').delete().eq('id', commande.id)

    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
      return
    }

    fetchTout()
  }

  const commandesFiltrees = commandes.filter((c) => {
    const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut

    const texte = recherche.trim().toLowerCase()
    const matchRecherche =
      texte === '' ||
      (c.clients?.nom || '').toLowerCase().includes(texte) ||
      (c.commande_items || []).some((i) =>
        (i.produits?.nom || '').toLowerCase().includes(texte)
      )

    return matchStatut && matchRecherche
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Commandes</h1>
          <p className="text-text-secondary mt-1">Suis toutes tes commandes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annuler' : 'Nouvelle commande'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreerCommande}
          className="mt-6 bg-card border border-border rounded-xl p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text mb-1">Client existant</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">— Ou crée un nouveau client ci-dessous —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          {!clientId && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-1">Nouveau client - Nom</label>
                <input
                  type="text"
                  value={nouveauClientNom}
                  onChange={(e) => setNouveauClientNom(e.target.value)}
                  placeholder="Ex : Fatou Koné"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-1">Téléphone</label>
                <input
                  type="text"
                  value={nouveauClientTel}
                  onChange={(e) => setNouveauClientTel(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text">Produits</label>
            {lignes.map((ligne, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={ligne.produit_id}
                  onChange={(e) => majLigne(index, 'produit_id', e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Choisir un produit</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.prix} FCFA) — stock: {p.quantite}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={ligne.quantite}
                  onChange={(e) => majLigne(index, 'quantite', e.target.value)}
                  className="w-20 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {lignes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => retirerLigne(index)}
                    className="text-text-secondary hover:text-error transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={ajouterLigne}
              className="text-sm text-accent font-medium hover:text-accent-hover transition-colors"
            >
              + Ajouter un produit
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium text-text">
              Total : {calculerTotal().toLocaleString()} FCFA
            </span>
            <button
              type="submit"
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Créer la commande
            </button>
          </div>
        </form>
      )}

      <input
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par client ou produit..."
        className="mt-6 w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltreStatut('tous')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            filtreStatut === 'tous' ? 'bg-text text-white' : 'bg-card border border-border text-text-secondary'
          }`}
        >
          Toutes
        </button>
        {STATUTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFiltreStatut(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filtreStatut === s.value ? 'bg-text text-white' : 'bg-card border border-border text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm">Chargement...</p>
        ) : commandesFiltrees.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary text-sm">
              {recherche.trim() || filtreStatut !== 'tous'
                ? 'Aucune commande ne correspond à ta recherche.'
                : 'Aucune commande pour le moment.'}
            </p>
          </div>
        ) : (
          commandesFiltrees.map((commande) => {
            const statutInfo = STATUTS.find((s) => s.value === commande.statut)
            return (
              <div
                key={commande.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-text">
                      {commande.clients?.nom || 'Client non renseigné'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {commande.commande_items?.map((i) => i.produits?.nom).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {commande.total.toLocaleString()} FCFA
                    </span>
                    <select
                      value={commande.statut}
                      onChange={(e) => changerStatut(commande, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-accent ${statutInfo?.color}`}
                    >
                      {STATUTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => ouvrirEdition(commande)}
                      title="Modifier les quantités"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-bg hover:text-accent transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => supprimerCommande(commande)}
                      title="Supprimer la commande"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-bg hover:text-error transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal d'édition des quantités */}
      {commandeEnEdition && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text">Modifier la commande</h2>
              <button
                onClick={fermerEdition}
                className="text-text-secondary hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              {commandeEnEdition.clients?.nom || 'Client non renseigné'}
            </p>

            <div className="space-y-3">
              {commandeEnEdition.commande_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{item.produits?.nom || 'Produit'}</p>
                    <p className="text-xs text-text-secondary">{item.prix_unitaire} FCFA / unité</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={quantitesEdition[item.id] ?? item.quantite}
                    onChange={(e) => majQuantiteEdition(item.id, e.target.value)}
                    className="w-20 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <span className="text-sm font-medium text-text">
                Nouveau total : {calculerTotalEdition().toLocaleString()} FCFA
              </span>
            </div>

            {STATUTS_PAYES.includes(commandeEnEdition.statut) && (
              <p className="text-xs text-text-secondary mt-2">
                Cette commande est déjà payée : le stock sera ajusté automatiquement selon tes changements.
              </p>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={enregistrerEdition}
                disabled={enregistrementEdition}
                className="flex-1 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {enregistrementEdition ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={fermerEdition}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Commandes