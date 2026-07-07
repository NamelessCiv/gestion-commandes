import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp, MapPin, Phone, MessageCircle, Package } from 'lucide-react'

// Statuts possibles pour une commande — adapte librement les labels/couleurs ici
const STATUTS = [
  { valeur: 'en_attente', label: 'En attente', couleur: 'bg-amber-100 text-amber-800' },
  { valeur: 'confirmee', label: 'Confirmée', couleur: 'bg-blue-100 text-blue-800' },
  { valeur: 'en_livraison', label: 'En livraison', couleur: 'bg-indigo-100 text-indigo-800' },
  { valeur: 'livree', label: 'Livrée', couleur: 'bg-emerald-100 text-emerald-800' },
  { valeur: 'annulee', label: 'Annulée', couleur: 'bg-red-100 text-red-800' },
]

const getStatutInfo = (valeur) => STATUTS.find((s) => s.valeur === valeur) || STATUTS[0]

export default function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [commandeOuverte, setCommandeOuverte] = useState(null)
  const [maj, setMaj] = useState(null) // id de la commande en cours de mise à jour de statut

  useEffect(() => {
    chargerCommandes()
  }, [])

  async function chargerCommandes() {
    try {
      setChargement(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // On récupère à la fois la relation "clients" (commandes créées manuellement)
      // ET les champs à plat (commandes venant de la vitrine publique)
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

  async function changerStatut(id, nouveauStatut) {
    setMaj(id)
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: nouveauStatut })
        .eq('id', id)

      if (error) throw error

      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statut: nouveauStatut } : c))
      )
    } catch (err) {
      console.error('Erreur mise à jour statut:', err)
      alert("Impossible de mettre à jour le statut. Réessaye.")
    } finally {
      setMaj(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Carnet de Commandes</h1>
      {chargement ? (
        <p>Chargement...</p>
      ) : commandes.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune commande reçue pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {commandes.map((cmd) => {
            // Fallback : priorité à la relation "clients", sinon aux champs à plat de la vitrine
            const nom = cmd.clients?.nom || cmd.nom_client || 'Client inconnu'
            const telephone = cmd.clients?.telephone || cmd.telephone_client || null
            const adresse = cmd.clients?.adresse || cmd.adresse_livraison || null
            const statutInfo = getStatutInfo(cmd.statut)
            const estOuverte = commandeOuverte === cmd.id
            const produitsListe = Array.isArray(cmd.produits) ? cmd.produits : []

            return (
              <div key={cmd.id} className="border rounded-xl shadow-sm overflow-hidden">
                {/* Ligne principale */}
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setCommandeOuverte(estOuverte ? null : cmd.id)}
                >
                  <div>
                    <p className="font-bold text-lg">{nom}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-mono text-xs text-gray-400">#{String(cmd.id).slice(0, 8).toUpperCase()}</span>
                      {' · '}
                      Total: {cmd.total.toLocaleString()} FCFA
                      {' · '}
                      {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statutInfo.couleur}`}>
                      {statutInfo.label}
                    </span>
                    {estOuverte ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Détail dépliable */}
                {estOuverte && (
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    {/* Infos client */}
                    <div className="space-y-1.5">
                      {telephone && (
                        <p className="text-xs text-gray-600 flex items-center gap-2">
                          <Phone size={12} className="text-gray-400" /> {telephone}
                        </p>
                      )}
                      {adresse && (
                        <p className="text-xs text-gray-600 flex items-center gap-2">
                          <MapPin size={12} className="text-gray-400" /> {adresse}
                        </p>
                      )}
                    </div>

                    {/* Détail des produits */}
                    {produitsListe.length > 0 && (
                      <div className="bg-white rounded-lg border p-3 space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                          <Package size={12} /> Produits commandés
                        </p>
                        {produitsListe.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-700">
                            <span>{p.nom} × {p.quantite}</span>
                            <span className="font-mono">{(p.prix * p.quantite).toLocaleString()} F</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-2">
                      <select
                        value={cmd.statut}
                        disabled={maj === cmd.id}
                        onChange={(e) => changerStatut(cmd.id, e.target.value)}
                        className="h-9 px-3 border rounded-lg text-xs font-bold bg-white disabled:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUTS.map((s) => (
                          <option key={s.valeur} value={s.valeur}>{s.label}</option>
                        ))}
                      </select>

                      {telephone && (
                        <a
                          href={`https://wa.me/${telephone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 px-3 bg-[#25D366] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle size={13} /> Contacter le client
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