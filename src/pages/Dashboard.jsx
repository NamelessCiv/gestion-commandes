import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, Clock, TrendingUp, Check, ArrowRight, AlertTriangle, X, Bell } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { maintenantServeur, debutPeriodeUTC } from '../utils/dateServeur'

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [nbProduits, setNbProduits] = useState(0)
  const [nbClients, setNbClients] = useState(0)
  const [nbCommandesAttente, setNbCommandesAttente] = useState(0)
  const [ventesDuMois, setVentesDuMois] = useState(0)
  const [aDejaCommande, setADejaCommande] = useState(false)
  const [produitsStockBas, setProduitsStockBas] = useState([])
  const [alerteVisible, setAlerteVisible] = useState(true)
  const [commandesAAncienne, setCommandesAAncienne] = useState([])
  const [alerteRappelVisible, setAlerteRappelVisible] = useState(true)

  useEffect(() => {
    async function fetchResume() {
      setLoading(true)

      const heureServeur = await maintenantServeur()
      const debutMois = debutPeriodeUTC(heureServeur, 'mois')

      const [
        { data: tousLesProduits },
        { count: countClients },
        { count: countAttente },
        { count: countTotalCommandes },
        { data: commandesDuMois },
        { data: commandesEnAttenteToutes },
      ] = await Promise.all([
        supabase.from('produits').select('id, nom, quantite, seuil_alerte'),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase
          .from('commandes')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'en_attente'),
        supabase.from('commandes').select('*', { count: 'exact', head: true }),
        supabase
          .from('commandes')
          .select('total')
          .in('statut', ['payee', 'expediee', 'livree'])
          .gte('created_at', debutMois.toISOString()),
        supabase
          .from('commandes')
          .select('id, created_at, total, clients(nom)')
          .eq('statut', 'en_attente')
          .order('created_at', { ascending: true }),
      ])

      const produits = tousLesProduits || []
      setNbProduits(produits.length)
      setNbClients(countClients || 0)
      setNbCommandesAttente(countAttente || 0)
      setADejaCommande((countTotalCommandes || 0) > 0)
      setVentesDuMois((commandesDuMois || []).reduce((s, c) => s + Number(c.total), 0))

      const stockBas = produits
        .filter((p) => p.quantite <= (p.seuil_alerte ?? 5))
        .sort((a, b) => a.quantite - b.quantite)
      setProduitsStockBas(stockBas)

      const SEUIL_24H_MS = 24 * 60 * 60 * 1000
      const anciennes = (commandesEnAttenteToutes || [])
        .map((c) => ({
          ...c,
          attenteMs: heureServeur.getTime() - new Date(c.created_at).getTime(),
        }))
        .filter((c) => c.attenteMs >= SEUIL_24H_MS)
      setCommandesAAncienne(anciennes)

      setLoading(false)
    }

    fetchResume()
  }, [])

  function formaterAttente(ms) {
    const heures = Math.floor(ms / (1000 * 60 * 60))
    if (heures < 48) return `${heures}h`
    const jours = Math.floor(heures / 24)
    return `${jours} jour${jours > 1 ? 's' : ''}`
  }

  const afficherOnboarding = !loading && nbProduits === 0 && nbClients === 0 && !aDejaCommande

  const etapes = [
    {
      fait: nbProduits > 0,
      titre: 'Ajoute ton premier produit',
      description: 'Nom, prix et quantité en stock.',
      lien: '/stock',
      libelleLien: 'Aller au Stock',
    },
    {
      fait: nbClients > 0,
      titre: 'Ajoute ton premier client',
      description: 'Nom et téléphone, pour suivre ses commandes.',
      lien: '/commandes',
      libelleLien: 'Créer une commande',
    },
    {
      fait: aDejaCommande,
      titre: 'Crée ta première commande',
      description: 'Choisis un client, ajoute des produits, c\'est parti.',
      lien: '/commandes',
      libelleLien: 'Aller aux Commandes',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">Tableau de bord</h1>
      <p className="text-text-secondary mt-1">Vue d'ensemble de ta boutique</p>

      {/* Bandeau d'alerte stock bas */}
      {!loading && produitsStockBas.length > 0 && alerteVisible && (
        <div className="mt-6 bg-error/10 border border-error/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">
                {produitsStockBas.length} produit{produitsStockBas.length > 1 ? 's' : ''} à réapprovisionner
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {produitsStockBas
                  .slice(0, 4)
                  .map((p) => `${p.nom} (${p.quantite})`)
                  .join(', ')}
                {produitsStockBas.length > 4 ? `, +${produitsStockBas.length - 4} autre(s)` : ''}
              </p>
              <Link
                to="/stock"
                className="inline-flex items-center gap-1 text-sm font-medium text-error mt-2 hover:underline"
              >
                Voir le stock
                <ArrowRight size={13} />
              </Link>
            </div>
            <button
              onClick={() => setAlerteVisible(false)}
              className="text-text-secondary hover:text-text transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bandeau de rappel : commandes en attente depuis plus de 24h */}
      {!loading && commandesAAncienne.length > 0 && alerteRappelVisible && (
        <div className="mt-6 bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Bell size={18} className="text-accent shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">
                {commandesAAncienne.length} commande{commandesAAncienne.length > 1 ? 's' : ''} en attente depuis plus de 24h
              </p>
              <div className="mt-2 space-y-1">
                {commandesAAncienne.slice(0, 4).map((c) => (
                  <p key={c.id} className="text-sm text-text-secondary">
                    {c.clients?.nom || 'Client non renseigné'} · en attente depuis {formaterAttente(c.attenteMs)} · {Number(c.total).toLocaleString()} FCFA
                  </p>
                ))}
                {commandesAAncienne.length > 4 && (
                  <p className="text-sm text-text-secondary">
                    +{commandesAAncienne.length - 4} autre(s)
                  </p>
                )}
              </div>
              <Link
                to="/commandes"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent mt-2 hover:underline"
              >
                Voir les commandes
                <ArrowRight size={13} />
              </Link>
            </div>
            <button
              onClick={() => setAlerteRappelVisible(false)}
              className="text-text-secondary hover:text-text transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-medium mb-2">
            <Package size={14} />
            Produits en stock
          </div>
          <p className="text-2xl font-semibold text-text">{loading ? '—' : nbProduits}</p>
          {!loading && produitsStockBas.length > 0 && (
            <p className="text-xs text-error font-medium mt-1">
              {produitsStockBas.length} à réapprovisionner
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-medium mb-2">
            <Users size={14} />
            Clients
          </div>
          <p className="text-2xl font-semibold text-text">{loading ? '—' : nbClients}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-medium mb-2">
            <Clock size={14} />
            Commandes en attente
          </div>
          <p className="text-2xl font-semibold text-text">{loading ? '—' : nbCommandesAttente}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-medium mb-2">
            <TrendingUp size={14} />
            Ventes ce mois
          </div>
          <p className="text-2xl font-semibold text-text">
            {loading ? '—' : `${ventesDuMois.toLocaleString()} FCFA`}
          </p>
        </div>
      </div>

      {/* Checklist de démarrage — uniquement si la boutique est vide */}
      {afficherOnboarding && (
        <div className="mt-8 bg-card border border-border rounded-xl p-5 max-w-xl">
          <h2 className="text-base font-semibold text-text">Bienvenue ! Démarre en 3 étapes</h2>
          <p className="text-text-secondary text-sm mt-1">
            Ta boutique est prête. Voici comment prendre en main l'app.
          </p>

          <div className="mt-5 space-y-3">
            {etapes.map((etape, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 rounded-lg border p-3 transition-colors ${
                  etape.fait ? 'border-success/30 bg-success/5' : 'border-border'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                    etape.fait
                      ? 'bg-success text-white'
                      : 'bg-bg border border-border text-text-secondary'
                  }`}
                >
                  {etape.fait ? <Check size={15} /> : index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      etape.fait ? 'text-text-secondary line-through' : 'text-text'
                    }`}
                  >
                    {etape.titre}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{etape.description}</p>
                </div>

                {!etape.fait && (
                  <Link
                    to={etape.lien}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors shrink-0"
                  >
                    {etape.libelleLien}
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard