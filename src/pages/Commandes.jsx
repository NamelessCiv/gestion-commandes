import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp, MapPin, Phone, MessageCircle, Package, Loader2, Search, Filter, AlertCircle } from 'lucide-react'

const STATUTS = [
  { valeur: 'en_attente', label: 'En attente', couleur: 'bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold' },
  { valeur: 'confirmee', label: 'Confirmée', couleur: 'bg-blue-500/10 text-blue-700 border-blue-500/20 font-bold' },
  { valeur: 'en_livraison', label: 'En livraison', couleur: 'bg-purple-500/10 text-purple-700 border-purple-500/20 font-bold' },
  { valeur: 'livree', label: 'Livrée', couleur: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold' },
  { valeur: 'annulee', label: 'Annulée', couleur: 'bg-red-500/10 text-red-700 border-red-500/20 font-bold' },
]

const getStatutInfo = (valeur) => STATUTS.find((s) => s.valeur === valeur) || STATUTS[0]

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [commandeOuverte, setCommandeOuverte] = useState(null)
  const [maj, setMaj] = useState(null)

  // Filtres & Recherche
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    chargerCommandes()
  }, [])

  async function chargerCommandes() {
    try {
      setChargement(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('commandes')
        .select(`
          id, total, statut, created_at, source, statut_paiement,
          nom_client, telephone_client, adresse_livraison, produits,
          clients:client_id ( nom, telephone, adresse )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommandes(data || [])
    } catch (err) {
      console.error('Erreur chargement commandes:', err)
    } finally {
      setChargement(false)
    }
  }

  // Ajustement automatique du stock lors de l'annulation ou rétablissement
  async function ajusterStockProduits(produitsCommande, sens) {
    // sens : +1 pour réapprovisionner (annulation), -1 pour déduire
    if (!Array.isArray(produitsCommande)) return

    for (const item of produitsCommande) {
      if (!item.id) continue

      // Récupérer le produit actuel
      const { data: produit } = await supabase
        .from('produits')
        .select('quantite, variantes')
        .eq('id', item.id)
        .single()

      if (!produit) continue

      const qteDiff = (Number(item.quantite) || 1) * sens
      const nouveauStockTotal = Math.max(0, (produit.quantite || 0) + qteDiff)

      let variantesMaj = produit.variantes
      if (Array.isArray(variantesMaj) && item.variante) {
        variantesMaj = variantesMaj.map(v => {
          if (v.nom === item.variante) {
            return { ...v, quantite: Math.max(0, (Number(v.quantite) || 0) + qteDiff) }
          }
          return v
        })
      }

      await supabase
        .from('produits')
        .update({
          quantite: nouveauStockTotal,
          variantes: variantesMaj
        })
        .eq('id', item.id)
    }
  }

  async function changerStatut(cmd, nouveauStatut) {
    if (cmd.statut === nouveauStatut) return
    setMaj(cmd.id)

    try {
      // 1. Gestion du stock si la commande passe à "annulée" ou sort de "annulée"
      if (nouveauStatut === 'annulee' && cmd.statut !== 'annulee') {
        await ajusterStockProduits(cmd.produits, +1) // Réapprovisionner
      } else if (cmd.statut === 'annulee' && nouveauStatut !== 'annulee') {
        await ajusterStockProduits(cmd.produits, -1) // Re-déduire
      }

      // 2. Mettre à jour la commande
      const { error } = await supabase
        .from('commandes')
        .update({ statut: nouveauStatut })
        .eq('id', cmd.id)

      if (error) throw error

      setCommandes((prev) =>
        prev.map((c) => (c.id === cmd.id ? { ...c, statut: nouveauStatut } : c))
      )
    } catch (err) {
      console.error('Erreur mise à jour statut:', err)
      alert("Impossible de mettre à jour le statut. Réessaye.")
    } finally {
      setMaj(null)
    }
  }

  // Filtrage des commandes
  const commandesFiltrees = commandes.filter((cmd) => {
    const nom = (cmd.clients?.nom || cmd.nom_client || '').toLowerCase()
    const tel = (cmd.clients?.telephone || cmd.telephone_client || '').toLowerCase()
    const matchRecherche = nom.includes(recherche.toLowerCase()) || tel.includes(recherche.toLowerCase())
    const matchStatut = filtreStatut === 'tous' || cmd.statut === filtreStatut

    return matchRecherche && matchStatut
  })

  // Total des commandes filtrées (hors annulées)
  const totalFiltré = commandesFiltrees
    .filter(c => c.statut !== 'annulee')
    .reduce((sum, c) => sum + (Number(c.total) || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-5 text-text max-w-6xl mx-auto transition-colors duration-150">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-text">Carnet de Commandes</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Suivi en temps réel des ventes et livraisons clients</p>
        </div>

        <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center justify-between sm:justify-end gap-3 shadow-2xs">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Volume affiché :</span>
          <span className="font-mono font-bold text-sm text-cta">{formaterMontant(totalFiltré)} FCFA</span>
        </div>
      </div>

      {/* Barre de Recherche et Filtres par Statut */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Recherche */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 text-text-secondary" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom client ou téléphone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full h-10 sm:h-11 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
          />
        </div>

        {/* Onglets Filtres Statut */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFiltreStatut('tous')}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              filtreStatut === 'tous' ? 'bg-brand text-white border-brand' : 'bg-card text-text-secondary border-border hover:bg-bg'
            }`}
          >
            Toutes ({commandes.length})
          </button>
          {STATUTS.map((s) => {
            const count = commandes.filter((c) => c.statut === s.valeur).length
            return (
              <button
                key={s.valeur}
                onClick={() => setFiltreStatut(s.valeur)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                  filtreStatut === s.valeur ? 'bg-brand text-white border-brand' : 'bg-card text-text-secondary border-border hover:bg-bg'
                }`}
              >
                {s.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste des Commandes */}
      {chargement ? (
        <div className="py-20 text-center text-text-secondary text-xs font-bold uppercase tracking-wider">
          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand" />
          Chargement du carnet...
        </div>
      ) : commandesFiltrees.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/40 p-6 space-y-2">
          <AlertCircle size={28} className="mx-auto text-text-secondary/60" />
          <p className="text-sm font-medium text-text-secondary">Aucune commande ne correspond à tes critères.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commandesFiltrees.map((cmd) => {
            const nom = cmd.clients?.nom || cmd.nom_client || 'Client inconnu'
            const telephone = cmd.clients?.telephone || cmd.telephone_client || null
            const adresse = cmd.clients?.adresse || cmd.adresse_livraison || null
            const statutInfo = getStatutInfo(cmd.statut)
            const estOuverte = commandeOuverte === cmd.id
            const produitsListe = Array.isArray(cmd.produits) ? cmd.produits : []

            return (
              <div key={cmd.id} className="bg-card border border-border rounded-2xl shadow-2xs overflow-hidden transition-all hover:border-border/80">
                
                {/* Ligne principale */}
                <div
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer hover:bg-bg/50 transition-colors"
                  onClick={() => setCommandeOuverte(estOuverte ? null : cmd.id)}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="font-bold font-display text-sm sm:text-base text-text truncate">{nom}</p>
                      {cmd.source && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-bg border border-border rounded text-text-secondary uppercase">
                          {cmd.source}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <span className="font-mono text-[11px] bg-bg px-1.5 py-0.5 rounded border border-border">
                        #{String(cmd.id).slice(0, 8).toUpperCase()}
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-cta">{formaterMontant(cmd.total)} FCFA</span>
                      <span>•</span>
                      <span>
                        {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase border ${statutInfo.couleur}`}>
                      {statutInfo.label}
                    </span>
                    {estOuverte ? <ChevronUp size={18} className="text-text-secondary" /> : <ChevronDown size={18} className="text-text-secondary" />}
                  </div>
                </div>

                {/* Détail dépliable */}
                {estOuverte && (
                  <div className="border-t border-border bg-bg/40 p-4 sm:p-5 space-y-4">
                    
                    {/* Infos client */}
                    {(telephone || adresse) && (
                      <div className="space-y-2 bg-card border border-border p-3.5 rounded-xl">
                        {telephone && (
                          <p className="text-xs text-text flex items-center gap-2 font-mono">
                            <Phone size={14} className="text-brand shrink-0" />
                            <span>{telephone}</span>
                          </p>
                        )}
                        {adresse && (
                          <p className="text-xs text-text flex items-center gap-2">
                            <MapPin size={14} className="text-brand shrink-0" />
                            <span>{adresse}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Liste des articles commandés */}
                    {produitsListe.length > 0 && (
                      <div className="bg-card rounded-xl border border-border p-4 space-y-2.5">
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
                          <Package size={14} className="text-brand" /> Articles commandés
                        </p>
                        <div className="divide-y divide-border">
                          {produitsListe.map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-xs py-2 first:pt-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="font-medium text-text">{p.nom}</span>
                                {p.variante && (
                                  <span className="ml-2 text-[10px] font-mono font-bold px-1.5 py-0.5 bg-bg border border-border rounded text-text-secondary">
                                    Option: {p.variante}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-text-secondary mr-2">× {p.quantite}</span>
                                <span className="font-mono font-bold text-text">{formaterMontant((p.prix || 0) * (p.quantite || 1))} F</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions de statut & Contact WhatsApp */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary font-medium hidden sm:inline">Statut commande :</span>
                        <select
                          value={cmd.statut}
                          disabled={maj === cmd.id}
                          onChange={(e) => changerStatut(cmd, e.target.value)}
                          className="h-10 px-3 border border-border rounded-xl text-xs font-bold bg-card text-text outline-none focus:border-brand disabled:opacity-50 cursor-pointer shadow-2xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUTS.map((s) => (
                            <option key={s.valeur} value={s.valeur}>{s.label}</option>
                          ))}
                        </select>
                        {maj === cmd.id && <Loader2 size={16} className="animate-spin text-brand" />}
                      </div>

                      {telephone && (
                        <a
                          href={`https://wa.me/${telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Bonjour ${nom}, concernant votre commande #${String(cmd.id).slice(0, 8).toUpperCase()} sur Ma Boutique :`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-10 px-4 bg-[#25D366] hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                        >
                          <MessageCircle size={15} />
                          <span>Contacter sur WhatsApp</span>
                        </a>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}