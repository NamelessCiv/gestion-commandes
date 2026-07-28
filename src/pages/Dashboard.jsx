import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Users, ShoppingCart, Wallet, AlertTriangle, X, Bell, ArrowRight, Sparkles
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const STYLE_STATUT = {
  en_attente: { label: 'En attente', classes: 'bg-cta/10 text-cta' },
  payee: { label: 'Payée', classes: 'bg-success-bg text-success' },
  en_preparation: { label: 'En préparation', classes: 'bg-blue-100 text-blue-700' },
  expediee: { label: 'Expédiée', classes: 'bg-purple-100 text-purple-700' },
  livree: { label: 'Livrée', classes: 'bg-success-bg text-success' },
}

function formaterDateResume(dateISO) {
  if (!dateISO) return ''
  const d = new Date(dateISO)
  const aujourdHui = new Date()
  const estAujourdHui = d.toDateString() === aujourdHui.toDateString()
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (estAujourdHui) return `Aujourd'hui à ${heure}`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ` à ${heure}`
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
  const [resumeIA, setResumeIA] = useState(null)
  const [dateResumeIA, setDateResumeIA] = useState(null)
  const [loadingIA, setLoadingIA] = useState(true)

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

      // 4. Distribution sur les 7 derniers jours calendaires (fenêtre glissante,
      // et non plus un simple regroupement par nom de jour qui mélangeait
      // des semaines différentes entre elles)
      const aujourdHui = new Date()
      const septDerniersJours = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(aujourdHui)
        d.setDate(aujourdHui.getDate() - i)
        septDerniersJours.push({
          cle: d.toDateString(),
          jour: JOURS[(d.getDay() + 6) % 7], // Aligne Lundi = index 0
          montant: 0,
        })
      }

      listeCommandes.forEach((c) => {
        const cleCommande = new Date(c.created_at).toDateString()
        const jourCorrespondant = septDerniersJours.find((j) => j.cle === cleCommande)
        if (jourCorrespondant) {
          jourCorrespondant.montant += Number(c.total || 0)
        }
      })
      setVentesSemaine(septDerniersJours)

      // Récupération du nombre de produits distincts dans la boutique
      const { count } = await supabase.from('produits').select('*', { count: 'exact', head: true })
      setNbProduits(count || 0)

      setLoading(false)
    }

    async function fetchResumeIA() {
      setLoadingIA(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingIA(false)
        return
      }

      // Hypothèse sur le nom des colonnes : adapter si le schéma réel diffère
      // (ex: resume_texte au lieu de resume)
      const { data, error } = await supabase
        .from('insights_ia')
        .select('resume, genere_le')
        .eq('user_id', user.id)
        .order('genere_le', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setResumeIA(data.resume)
        setDateResumeIA(data.genere_le)
      }

      setLoadingIA(false)
    }

    fetchDashboardData()
    fetchResumeIA()
  }, [])

  const maxSemaine = Math.max(...ventesSemaine.map((v) => v.montant), 1)

  return (
    <div className="space-y-6 p-6 bg-bg text-text min-h-screen max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-headline-lg-mobile sm:text-headline-lg text-text">Tableau de bord</h1>
        <p className="text-sm text-text-secondary mt-1">Vue d'ensemble de ton activité commerciale</p>
      </div>

      {/* Résumé IA du jour */}
      {loadingIA ? null : resumeIA ? (
        <div className="bg-brand rounded-2xl p-5 shadow-card flex gap-3 items-start">
          <div className="shrink-0 mt-0.5">
            <Sparkles size={18} className="text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white">Résumé du jour</h2>
              {dateResumeIA && (
                <span className="text-[10px] text-white/60 shrink-0">{formaterDateResume(dateResumeIA)}</span>
              )}
            </div>
            <p className="text-sm text-white/90 mt-1 leading-relaxed">{resumeIA}</p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-5 shadow-card flex gap-3 items-center">
          <Sparkles size={18} className="text-text-secondary shrink-0" />
          <p className="text-xs text-text-secondary">
            Le résumé IA du jour n'est pas encore disponible. Il sera généré automatiquement demain matin.
          </p>
        </div>
      )}

      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <p className="text-text-secondary text-label-caps">Articles en Stock</p>
          <p className="chiffres font-mono text-2xl font-bold mt-1 text-text">{loading ? '...' : nbProduits}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <p className="text-text-secondary text-label-caps">Clients Actifs</p>
          <p className="chiffres font-mono text-2xl font-bold mt-1 text-text">{loading ? '...' : nbClients}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card border-l-4 border-l-cta">
          <p className="text-cta text-label-caps">En attente</p>
          <p className="chiffres font-mono text-2xl font-bold mt-1 text-cta">{loading ? '...' : nbCommandesAttente}</p>
        </div>
        <div className="bg-brand rounded-2xl p-5 shadow-card">
          <p className="text-white/60 text-label-caps">Ventes du Mois</p>
          <p className="chiffres text-price mt-2 truncate text-cta">{loading ? '...' : `${formaterMontant(ventesDuMois)} F`}</p>
        </div>
      </div>

      {/* Graphiques hebdomadaires & Produits populaires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-card flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-text">Activité de la semaine</h2>
            <p className="text-xs text-text-secondary">Volume global enregistré par jour</p>
          </div>
          <div className="h-40 flex items-end justify-between gap-2 pt-4 border-b border-border">
            {ventesSemaine.map((v) => (
              <div key={v.jour} className="flex flex-col items-center gap-2 w-full group">
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${v.montant > 0 ? 'bg-brand' : 'bg-surface-muted'}`}
                  style={{ height: `${Math.max((v.montant / maxSemaine) * 100, 6)}%` }}
                  title={`${formaterMontant(v.montant)} F`}
                />
                <span className="text-[10px] font-bold text-text-secondary uppercase">{v.jour}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card flex flex-col gap-4">
          <h2 className="text-sm font-bold text-text">Top Articles</h2>
          {topProduits.length === 0 ? (
            <p className="text-xs text-text-secondary py-6">Aucune vente enregistrée.</p>
          ) : (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {topProduits.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-bold text-text">{p.nom}</p>
                    <p className="text-text-secondary text-[10px]">{p.quantite} unité(s) vendue(s)</p>
                  </div>
                  <span className="chiffres font-mono font-bold text-brand">{formaterMontant(p.montant)} F</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tableau des dernières commandes */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-bold text-text">Flux des commandes récentes</h2>
          <Link to="/commandes" className="text-xs font-bold text-brand hover:underline">Voir tout</Link>
        </div>

        {commandesRecentes.length === 0 ? (
          <p className="text-xs text-text-secondary p-6 text-center">Aucune transaction récente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-muted text-text-secondary font-bold">
                  <th className="p-3 uppercase tracking-wider">Client</th>
                  <th className="p-3 uppercase tracking-wider">Statut</th>
                  <th className="p-3 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commandesRecentes.map((c) => {
                  const style = STYLE_STATUT[c.statut] || { label: c.statut, classes: 'bg-surface-muted text-text-secondary' }
                  return (
                    <tr key={c.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-text">{c.nom_client || 'Client Anonyme'}</p>
                        <p className="text-text-secondary text-[10px]">{c.telephone_client || 'Pas de numéro'}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${style.classes}`}>{style.label}</span>
                      </td>
                      <td className="p-3 text-right chiffres font-mono font-bold text-text">{formaterMontant(c.total)} F</td>
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