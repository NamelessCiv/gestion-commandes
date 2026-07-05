import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, X, Pencil, Check, History } from 'lucide-react'

const LIBELLES_MOUVEMENT = {
  entree: 'Entrée',
  sortie: 'Sortie',
}

function Stock() {
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [quantite, setQuantite] = useState('')

  // Édition d'un produit existant (nom, prix, seuil d'alerte)
  const [editionId, setEditionId] = useState(null)
  const [editionNom, setEditionNom] = useState('')
  const [editionPrix, setEditionPrix] = useState('')
  const [editionSeuil, setEditionSeuil] = useState('')
  const [enregistrementEdition, setEnregistrementEdition] = useState(false)

  // Historique des mouvements de stock d'un produit
  const [produitHistorique, setProduitHistorique] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [chargementHistorique, setChargementHistorique] = useState(false)

  async function fetchProduits() {
    setLoading(true)
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setProduits(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProduits()
  }, [])

  async function handleAjouter(e) {
    e.preventDefault()
    if (!nom || !prix) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('produits').insert({
      nom,
      prix: parseFloat(prix),
      quantite: parseInt(quantite) || 0,
      user_id: user.id,
    })

    if (error) {
      alert("Erreur lors de l'ajout : " + error.message)
      return
    }

    setNom('')
    setPrix('')
    setQuantite('')
    setShowForm(false)
    fetchProduits()
  }

  async function ajusterQuantite(produit, delta) {
    const nouvelleQuantite = Math.max(0, produit.quantite + delta)

    const { error } = await supabase
      .from('produits')
      .update({ quantite: nouvelleQuantite })
      .eq('id', produit.id)

    if (error) {
      alert('Erreur : ' + error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('mouvements_stock').insert({
      produit_id: produit.id,
      type: delta > 0 ? 'entree' : 'sortie',
      quantite: Math.abs(delta),
      user_id: user.id,
    })

    fetchProduits()
  }

  function commencerEdition(produit) {
    setEditionId(produit.id)
    setEditionNom(produit.nom)
    setEditionPrix(String(produit.prix))
    setEditionSeuil(String(produit.seuil_alerte ?? 5))
  }

  function annulerEdition() {
    setEditionId(null)
    setEditionNom('')
    setEditionPrix('')
    setEditionSeuil('')
  }

  async function enregistrerEdition(produitId) {
    if (!editionNom || !editionPrix) return

    setEnregistrementEdition(true)

    const { error } = await supabase
      .from('produits')
      .update({
        nom: editionNom,
        prix: parseFloat(editionPrix),
        seuil_alerte: parseInt(editionSeuil) || 0,
      })
      .eq('id', produitId)

    setEnregistrementEdition(false)

    if (error) {
      alert('Erreur lors de la modification : ' + error.message)
      return
    }

    annulerEdition()
    fetchProduits()
  }

  async function ouvrirHistorique(produit) {
    setProduitHistorique(produit)
    setChargementHistorique(true)

    const { data, error } = await supabase
      .from('mouvements_stock')
      .select('*')
      .eq('produit_id', produit.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
      setMouvements([])
    } else {
      setMouvements(data || [])
    }
    setChargementHistorique(false)
  }

  function fermerHistorique() {
    setProduitHistorique(null)
    setMouvements([])
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Stock</h1>
          <p className="text-text-secondary mt-1">Gère tes produits et quantités</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annuler' : 'Ajouter un produit'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAjouter}
          className="mt-6 bg-card border border-border rounded-xl p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text mb-1">Nom du produit</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Robe wax"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text mb-1">Prix (FCFA)</label>
              <input
                type="number"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text mb-1">Quantité initiale</label>
              <input
                type="number"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Enregistrer le produit
          </button>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-text-secondary text-sm">Chargement...</p>
        ) : produits.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary text-sm">Aucun produit pour le moment.</p>
            <p className="text-text-secondary text-sm">Ajoute ton premier produit pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {produits.map((produit) => {
              const enEdition = editionId === produit.id

              if (enEdition) {
                return (
                  <div
                    key={produit.id}
                    className="bg-card border border-accent rounded-xl p-4 space-y-3"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Nom du produit
                        </label>
                        <input
                          type="text"
                          value={editionNom}
                          onChange={(e) => setEditionNom(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Prix (FCFA)
                        </label>
                        <input
                          type="number"
                          value={editionPrix}
                          onChange={(e) => setEditionPrix(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Seuil alerte
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editionSeuil}
                          onChange={(e) => setEditionSeuil(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => enregistrerEdition(produit.id)}
                        disabled={enregistrementEdition}
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Check size={15} />
                        {enregistrementEdition ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={annulerEdition}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={produit.id}
                  className="flex items-center justify-between bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{produit.nom}</p>
                      <p className="text-sm text-text-secondary">{produit.prix} FCFA</p>
                    </div>
                    <button
                      onClick={() => commencerEdition(produit)}
                      title="Modifier le nom, le prix ou le seuil d'alerte"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-bg hover:text-accent transition-colors shrink-0"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => ouvrirHistorique(produit)}
                      title="Voir l'historique des mouvements"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-bg hover:text-accent transition-colors shrink-0"
                    >
                      <History size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => ajusterQuantite(produit, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text hover:bg-bg transition-colors"
                    >
                      -
                    </button>
                    <span
                      className={`w-10 text-center text-sm font-semibold ${
                        produit.quantite <= (produit.seuil_alerte ?? 5)
                          ? 'text-error'
                          : 'text-text'
                      }`}
                    >
                      {produit.quantite}
                    </span>
                    <button
                      onClick={() => ajusterQuantite(produit, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text hover:bg-bg transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal historique des mouvements de stock */}
      {produitHistorique && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-text">Historique du stock</h2>
              <button
                onClick={fermerHistorique}
                className="text-text-secondary hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">{produitHistorique.nom}</p>

            {chargementHistorique ? (
              <p className="text-text-secondary text-sm">Chargement...</p>
            ) : mouvements.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <p className="text-text-secondary text-sm">Aucun mouvement enregistré.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {mouvements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                  >
                    <span className="text-text-secondary">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span
                      className={`font-medium ${
                        m.type === 'entree' ? 'text-success' : 'text-error'
                      }`}
                    >
                      {m.type === 'entree' ? '+' : '-'}
                      {m.quantite} · {LIBELLES_MOUVEMENT[m.type] || m.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Stock