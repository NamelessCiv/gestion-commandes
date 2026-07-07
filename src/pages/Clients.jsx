import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ChevronDown, ChevronUp, Users, ShoppingBag } from 'lucide-react'
import { useParametres } from '../contexts/ParametresContext'

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Clients() {
  const { parametres } = useParametres()
  const accentColor = parametres?.accent_color || '#493ee5'

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [clientOuvert, setClientOuvert] = useState(null)

  useEffect(() => {
    async function fetchClients() {
      setLoading(true)
      try {
        // 1. Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // 2. Charger les commandes filtrées par user_id
        const { data, error } = await supabase
          .from('commandes')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error("Erreur de lecture Supabase :", error)
        }

        // 3. Regroupement intelligent par client unique
        const regroupement = {}
        if (data) {
          data.forEach((c) => {
            const cle = (c.telephone_client || c.nom_client || 'anonyme').trim().toLowerCase()
            if (!regroupement[cle]) {
              regroupement[cle] = {
                nom: c.nom_client || 'Client Inconnu',
                telephone: c.telephone_client || 'Non spécifié',
                totalDepense: 0,
                nbCommandes: 0,
                achats: []
              }
            }
            regroupement[cle].totalDepense += Number(c.total || 0)
            regroupement[cle].nbCommandes += 1
            regroupement[cle].achats.push(c)
          })
        }
        setClients(Object.values(regroupement))
      } catch (err) {
        console.error("Erreur système lors du chargement des clients :", err)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  // Filtrage en temps réel selon la recherche
  const clientsFiltrés = clients.filter(c =>
    c.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    c.telephone.includes(recherche)
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 text-gray-900">
      
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 flex items-center gap-2">
            <Users size={24} style={{ color: accentColor }} /> Clients ({clientsFiltrés.length})
          </h1>
          <p className="text-xs font-medium text-gray-500 mt-1">Gère ton portefeuille client et analyse leurs habitudes d'achat</p>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher un nom ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 transition-all shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-medium">Chargement du fichier clients...</div>
      ) : clientsFiltrés.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-2xs">
          <p className="text-sm text-gray-400 font-medium">Aucun client trouvé.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100">
                  <th className="p-4 uppercase tracking-wider">Informations Client</th>
                  <th className="p-4 uppercase tracking-wider text-center">Commandes</th>
                  <th className="p-4 uppercase tracking-wider text-right">Total Dépensé</th>
                  <th className="p-4 uppercase tracking-wider text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientsFiltrés.map((c, index) => {
                  const estOuvert = clientOuvert === index
                  return (
                    <Fragment key={index}>
                      <tr className="hover:bg-gray-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 font-black flex items-center justify-center text-sm uppercase">
                              {c.nom.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-950 text-sm">{c.nom}</p>
                              <p className="text-gray-400 font-mono text-[11px] mt-0.5">{c.telephone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-700 text-sm">
                          {c.nbCommandes}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-gray-950 text-sm">
                          {formaterMontant(c.totalDepense)} F
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setClientOuvert(estOuvert ? null : index)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-all inline-flex items-center cursor-pointer"
                          >
                            {estOuvert ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Sous-tableau déroulant pour l'historique d'achat */}
                      {estOuvert && (
                        <tr>
                          <td colSpan="4" className="bg-neutral-50/50 p-4 border-t border-b border-gray-100">
                            <div className="space-y-2">
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Historique complet des transactions</p>
                              <div className="space-y-1">
                                {c.achats.map((ach, aIdx) => (
                                  <div key={aIdx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-3xs text-xs">
                                    <div className="flex items-center gap-2">
                                      <ShoppingBag size={14} className="text-gray-400" />
                                      <div>
                                        <p className="font-bold text-gray-900">Achat du {new Date(ach.created_at).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">{ach.statut}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-950">{formaterMontant(ach.total)} F</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}