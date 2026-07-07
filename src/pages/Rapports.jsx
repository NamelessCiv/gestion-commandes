import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { maintenantServeur, debutPeriodeUTC } from '../utils/dateServeur'
import { useParametres } from '../contexts/ParametresContext'
import { TrendingUp, ShoppingBag, BarChart3 } from 'lucide-react'

const PERIODES = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
]

function formaterMontant(nombre) {
  const arrondi = Math.round(Number(nombre) || 0)
  return arrondi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function Rapports() {
  const { parametres } = useParametres()
  const [periode, setPeriode] = useState('semaine')
  const [loading, setLoading] = useState(true)
  const [totalVentes, setTotalVentes] = useState(0)
  const [nombreCommandes, setNombreCommandes] = useState(0)
  const [topProduits, setTopProduits] = useState([])

  useEffect(() => {
  async function fetchRapport() {
    setLoading(true)
    
    // 1. Récupérer l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 2. Récupérer ses statistiques de vente uniques
    const { data: commandes } = await supabase
      .from('commandes')
      .select('*')
      .eq('user_id', user.id) // 👈 Sécurisation ici

    const filtrées = commandes || []
    const total = filtrées.reduce((sum, c) => sum + Number(c.total || 0), 0)
    setTotalVentes(total)
    setNombreCommandes(filtrées.length)

    const agregation = {}
    filtrées.forEach((c) => {
      const items = Array.isArray(c.produits) ? c.produits : []
      items.forEach((p) => {
        const nom = p.nom || 'Article inconnu'
        if (!agregation[nom]) {
          agregation[nom] = { nom, quantite: 0, montant: 0 }
        }
        agregation[nom].quantite += Number(p.quantite || 1)
        agregation[nom].montant += Number(p.prix || 0) * Number(p.quantite || 1)
      })
    })

    const triés = Object.values(agregation)
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5)

    setTopProduits(triés)
    setLoading(false)
  }
  fetchRapport()
}, [])

  const accentColor = parametres.accent_color || '#635BFF'

  return (
    <div className="bg-transparent text-gray-900 min-h-screen pb-12 w-full">
      <main className="px-4 py-6 max-w-5xl mx-auto">
        
        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-gray-950">Rapports</h1>
            <p className="text-sm text-gray-500 mt-1">Bilan et performance de tes ventes</p>
          </div>

          {/* Sélecteur de Période Premium */}
          <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] self-start md:self-auto">
            {PERIODES.map((p) => {
              const estActif = periode === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => setPeriode(p.value)}
                  style={{
                    backgroundColor: estActif ? accentColor : 'transparent',
                    color: estActif ? '#FFFFFF' : '#6B7280'
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider"
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 animate-pulse py-4">Analyse des flux financiers en cours...</p>
        ) : (
          <>
            {/* Bento Grid Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Carte Chiffre d'Affaires */}
              <div className="bg-white p-5 rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold tracking-wider text-[11px] uppercase">Chiffre d'Affaires</span>
                  <p className="text-headline-md md:text-headline-lg font-bold text-gray-950 font-mono">
                    {formaterMontant(totalVentes)} <span className="text-sm font-sans font-medium text-gray-400">FCFA</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                  <TrendingUp size={20} />
                </div>
              </div>

              {/* Carte Volumes Commandes */}
              <div className="bg-white p-5 rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold tracking-wider text-[11px] uppercase">Commandes Validées</span>
                  <p className="text-headline-md md:text-headline-lg font-bold text-gray-950 font-mono">
                    {nombreCommandes} <span className="text-sm font-sans font-medium text-gray-400">ventes</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                  <ShoppingBag size={20} />
                </div>
              </div>

            </div>

            {/* Section Graphique & Liste Produits */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-gray-400" />
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top produits (par montant vendu)</h2>
              </div>

              {topProduits.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-white">
                  <p className="text-sm text-gray-400 font-medium">Aucune donnée transactionnelle sur cette période.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 space-y-6">
                  
                  {/* Container Graphique Minimaliste */}
                  <div className="w-full h-[230px] -ml-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProduits} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="nom"
                          width={110}
                          tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => `${formaterMontant(value)} FCFA`}
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #F3F4F6', 
                            fontSize: '12px',
                            boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
                            fontWeight: '600'
                          }}
                        />
                        <Bar dataKey="montant" fill={accentColor} radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Liste Épurée des Articles Performants */}
                  <div className="divide-y divide-gray-50 border-t border-gray-50 pt-2">
                    {topProduits.map((p) => (
                      <div key={p.nom} className="flex items-center justify-between py-3 first:pt-1 last:pb-1 text-sm">
                        <span className="font-semibold text-gray-900">{p.nom}</span>
                        <span className="text-gray-500 font-medium font-mono text-xs">
                          {p.quantite} unité{p.quantite > 1 ? 's' : ''} · <span className="font-bold text-gray-950">{formaterMontant(p.montant)} FCFA</span>
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Rapports