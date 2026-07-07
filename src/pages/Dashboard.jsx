import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Users, ShoppingCart, Wallet, AlertTriangle, X, Bell, ArrowRight
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const STYLE_STATUT = {
  en_attente: { label: 'En attente', classes: 'bg-amber-100 text-amber-700' },
  payee: { label: 'Payée', classes: 'bg-green-100 text-green-700' },
  en_preparation: { label: 'En préparation', classes: 'bg-blue-100 text-blue-700' },
  expediee: { label: 'Expédiée', classes: 'bg-purple-100 text-purple-700' },
  livree: { label: 'Livrée', classes: 'bg-green-100 text-green-700' },
}

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [nbProduits, setNbProduits] = useState(0)
  const [nbClients, setNbClients] = useState(0)
  const [nbCommandesAttente, setNbCommandesAttente] = useState(0)
  const [ventesDuMois, setVentesDuMois] = useState(0)
  const [commandesRecentes, setCommandesRecentes] = useState([])
  const [topProduits, setTopProduits] = useState([])
  const [ventesSemaine, setVentesSemaine] = useState(JOURS.map((j) => ({ jour: j, montant: 0 })))

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)

      // Récupération globale des commandes (structure simplifiée)
      const { data: commandes } = await supabase
        .from('commandes')
        .select('*')
        .order('created_at', { ascending: false })

      const listeCommandes = commandes || []
      
      // 1. Calculs simples
      setNbCommandesAttente(listeCommandes.filter(c => c.statut === 'en_attente').length)
      setCommandesRecentes(listeCommandes.slice(0, 5))

      // 2. Chiffre d'affaires du mois en cours
      const maintenant = new Date()
      const commandesDuMois = listeCommandes.filter(c => {
        const d = new Date(c.created_at)
        return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear()
      })
      setVentesDuMois(commandesDuMois.reduce((sum, c) => sum + Number(c.total || 0), 0))

      // 3. Agrégation des clients uniques et des produits populaires
      const clientsUniques = new Set()
      const topArticles = {}

      listeCommandes.forEach(c => {
        if (c.telephone_client || c.nom_client) {
          clientsUniques.add(c.telephone_client || c.nom_client)
        }

        const items = Array.isArray(c.produits) ? c.produits : []
        items.forEach(item => {
          const nom = item.nom || 'Article'
          if (!topArticles[nom]) topArticles[nom] = { nom, quantite: 0, montant: 0 }
          topArticles[nom].quantite += Number(item.quantite || 1)
          topArticles[nom].montant += Number(item.quantite || 1) * Number(item.prix || 0)
        })
      })

      setNbClients(clientsUniques.size)
      setTopProduits(Object.values(topArticles).sort((a, b) => b.montant - a.montant).slice(0, 3))

      // 4. Distribution sur les jours de la semaine
      const totauxParJour = JOURS.map((j) => ({ jour: j, montant: 0 }))
      listeCommandes.slice(0, 30).forEach((c) => {
        const jourIndex = (new Date(c.created_at).getDay() + 6) % 7 // Aligne Lundi = 0
        if (jourIndex >= 0 && jourIndex < 7) {
          totauxParJour[jourIndex].montant += Number(c.total || 0)
        }
      })
      setVentesSemaine(totauxParJour)

      // Récupération du nombre de produits distincts dans la boutique
      const { count } = await supabase.from('produits').select('*', { count: 'exact', head: true })
      setNbProduits(count || 0)

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const maxSemaine = Math.max(...ventesSemaine.map((v) => v.montant), 1)

  return (
    <div className="space-y-6 p-6 bg-transparent text-gray-900 min-h-screen max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de ton activité commerciale</p>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <p className="text-gray-400 font-bold text-[10px] tracking-wider uppercase">Articles en Stock</p>
          <p className="text-2xl font-bold font-mono mt-1">{loading ? '...' : nbProduits}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <p className="text-gray-400 font-bold text-[10px] tracking-wider uppercase">Clients Actifs</p>
          <p className="text-2xl font-bold font-mono mt-1">{loading ? '...' : nbClients}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs border-l-4 border-indigo-600">
          <p className="text-indigo-600 font-bold text-[10px] tracking-wider uppercase">En attente</p>
          <p className="text-2xl font-bold font-mono mt-1 text-indigo-600">{loading ? '...' : nbCommandesAttente}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <p className="text-gray-400 font-bold text-[10px] tracking-wider uppercase">Ventes du Mois</p>
          <p className="text-lg font-bold font-mono mt-2 truncate text-gray-950">{loading ? '...' : `${formaterMontant(ventesDuMois)} F`}</p>
        </div>
      </div>

      {/* Graphiques hebdomadaires & Produits populaires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Activité de la semaine</h2>
            <p className="text-xs text-gray-400">Volume global enregistré par jour</p>
          </div>
          <div className="h-40 flex items-end justify-between gap-2 pt-4 border-b border-gray-100">
            {ventesSemaine.map((v) => (
              <div key={v.jour} className="flex flex-col items-center gap-2 w-full group">
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${v.montant > 0 ? 'bg-indigo-500' : 'bg-gray-100'}`}
                  style={{ height: `${Math.max((v.montant / maxSemaine) * 100, 6)}%` }}
                  title={`${formaterMontant(v.montant)} F`}
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase">{v.jour}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-900">Top Articles</h2>
          {topProduits.length === 0 ? (
            <p className="text-xs text-gray-400 py-6">Aucune vente enregistrée.</p>
          ) : (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {topProduits.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0">
                  <div>
                    <p className="font-bold text-gray-800">{p.nom}</p>
                    <p className="text-gray-400 text-[10px]">{p.quantite} unité(s) vendue(s)</p>
                  </div>
                  <span className="font-mono font-bold text-indigo-600">{formaterMontant(p.montant)} F</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tableau des dernières commandes */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-900">Flux des commandes récentes</h2>
          <Link to="/commandes" className="text-xs font-bold text-indigo-600 hover:underline">Voir tout</Link>
        </div>

        {commandesRecentes.length === 0 ? (
          <p className="text-xs text-gray-400 p-6 text-center">Aucune transaction récente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 font-bold">
                  <th className="p-3 uppercase tracking-wider">Client</th>
                  <th className="p-3 uppercase tracking-wider">Statut</th>
                  <th className="p-3 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commandesRecentes.map((c) => {
                  const style = STYLE_STATUT[c.statut] || { label: c.statut, classes: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-gray-900">{c.nom_client || 'Client Anonyme'}</p>
                        <p className="text-gray-400 text-[10px]">{c.telephone_client || 'Pas de numéro'}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${style.classes}`}>{style.label}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-950">{formaterMontant(c.total)} F</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}