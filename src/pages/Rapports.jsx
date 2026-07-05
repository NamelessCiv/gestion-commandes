import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { maintenantServeur, debutPeriodeUTC } from '../utils/dateServeur'

const PERIODES = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
]

function Rapports() {
  const [periode, setPeriode] = useState('semaine')
  const [loading, setLoading] = useState(true)
  const [totalVentes, setTotalVentes] = useState(0)
  const [nombreCommandes, setNombreCommandes] = useState(0)
  const [topProduits, setTopProduits] = useState([])

  useEffect(() => {
    async function fetchRapport() {
      setLoading(true)
      const heureServeur = await maintenantServeur()
      const dateDebut = debutPeriodeUTC(heureServeur, periode)

      const { data: commandes } = await supabase
        .from('commandes')
        .select('id, total, commande_items(quantite, prix_unitaire, produit_id, produits(nom))')
        .in('statut', ['payee', 'expediee', 'livree'])
        .gte('created_at', dateDebut.toISOString())

      const total = (commandes || []).reduce((sum, c) => sum + Number(c.total), 0)
      setTotalVentes(total)
      setNombreCommandes((commandes || []).length)

      // Regrouper les ventes par produit
      const ventesParProduit = {}
      ;(commandes || []).forEach((c) => {
        ;(c.commande_items || []).forEach((item) => {
          const nom = item.produits?.nom || 'Produit supprimé'
          if (!ventesParProduit[nom]) {
            ventesParProduit[nom] = { nom, quantite: 0, montant: 0 }
          }
          ventesParProduit[nom].quantite += item.quantite
          ventesParProduit[nom].montant += item.quantite * item.prix_unitaire
        })
      })

      const classement = Object.values(ventesParProduit)
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 5)

      setTopProduits(classement)
      setLoading(false)
    }

    fetchRapport()
  }, [periode])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">Rapports</h1>
      <p className="text-text-secondary mt-1">Bilan de tes ventes</p>

      <div className="flex gap-2 mt-6">
        {PERIODES.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriode(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periode === p.value
                ? 'bg-text text-white'
                : 'bg-card border border-border text-text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm mt-6">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-text-secondary text-sm mb-2">Total des ventes</p>
              <p className="text-2xl font-semibold text-text">
                {totalVentes.toLocaleString()} FCFA
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-text-secondary text-sm mb-2">Commandes payées</p>
              <p className="text-2xl font-semibold text-text">{nombreCommandes}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-text mb-3">Top produits (par montant vendu)</h2>
            {topProduits.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-text-secondary text-sm">
                  Aucune vente sur cette période.
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProduits} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nom"
                      width={100}
                      tick={{ fontSize: 12, fill: '#0A0A0A' }}
                    />
                    <Tooltip
                      formatter={(value) => `${value.toLocaleString()} FCFA`}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                    />
                    <Bar dataKey="montant" fill="#635BFF" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {topProduits.map((p) => (
                    <div key={p.nom} className="flex items-center justify-between text-sm">
                      <span className="text-text">{p.nom}</span>
                      <span className="text-text-secondary">
                        {p.quantite} vendu{p.quantite > 1 ? 's' : ''} · {p.montant.toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Rapports