// Fichier : pages/Clients.jsx
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ChevronDown, ChevronUp, Users, ShoppingBag, Loader2 } from 'lucide-react'

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Clients() {

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [clientOuvert, setClientOuvert] = useState(null)

  useEffect(() => {
    async function fetchClients() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('commandes')
          .select('*')
          .eq('user_id', user.id)

        if (error) console.error("Erreur lecture clients:", error)

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
        console.error("Erreur chargement des clients :", err)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  const clientsFiltrés = clients.filter(c =>
    c.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    c.telephone.includes(recherche)
  )

  return (
    <div className="p-6 space-y-6 text-text max-w-6xl mx-auto">
      
      {/* Entête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-text flex items-center gap-2">
            <Users size={24} className="text-brand" /> Portefeuille Clients ({clientsFiltrés.length})
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Analyse des habitudes d'achat et carnet de contacts</p>
        </div>

        {/* Barre de Recherche */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-3.5 text-text-secondary" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-xl text-sm text-text outline-none focus:border-brand transition-all shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-secondary text-xs font-bold uppercase tracking-wider">
          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand" />
          Chargement du carnet client...
        </div>
      ) : clientsFiltrés.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/40 p-6">
          <p className="text-sm text-text-secondary">Aucun client enregistré.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-muted/50 text-text-secondary font-bold border-b border-border">
                  <th className="p-4 uppercase tracking-wider">Client</th>
                  <th className="p-4 uppercase tracking-wider text-center">Commandes</th>
                  <th className="p-4 uppercase tracking-wider text-right">Total Dépensé</th>
                  <th className="p-4 uppercase tracking-wider text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clientsFiltrés.map((c, index) => {
                  const estOuvert = clientOuvert === index
                  return (
                    <Fragment key={index}>
                      <tr className="hover:bg-surface-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-muted border border-border text-text font-display font-bold flex items-center justify-center text-sm uppercase">
                              {c.nom.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold font-display text-text text-sm">{c.nom}</p>
                              <p className="text-text-secondary font-mono text-[11px] mt-0.5">{c.telephone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-text text-sm">
                          {c.nbCommandes}
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-cta text-sm chiffres">
                          {formaterMontant(c.totalDepense)} F
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setClientOuvert(estOuvert ? null : index)}
                            className="p-2 hover:bg-surface-muted rounded-lg transition-all inline-flex items-center cursor-pointer text-text-secondary hover:text-text"
                          >
                            {estOuvert ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Accordéon Historique */}
                      {estOuvert && (
                        <tr>
                          <td colSpan="4" className="bg-surface-muted/30 p-4 border-t border-b border-border">
                            <div className="space-y-2">
                              <p className="text-[0.75rem] font-bold text-text-secondary uppercase tracking-wider">Historique d'achat</p>
                              <div className="space-y-2">
                                {c.achats.map((ach, aIdx) => (
                                  <div key={aIdx} className="flex justify-between items-center bg-card p-3 rounded-xl border border-border text-xs shadow-2xs">
                                    <div className="flex items-center gap-2">
                                      <ShoppingBag size={14} className="text-brand shrink-0" />
                                      <div>
                                        <p className="font-bold text-text">Commande du {new Date(ach.created_at).toLocaleDateString('fr-FR')}</p>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-surface-muted text-text-secondary border border-border rounded mt-0.5">
                                          {ach.statut}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-mono font-medium text-text chiffres">{formaterMontant(ach.total)} F</span>
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