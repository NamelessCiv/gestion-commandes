// Fichier : pages/Login.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'

function Login() {
  const navigate = useNavigate()
  const [modeInscription, setModeInscription] = useState(false)
  const [modeMotDePasseOublie, setModeMotDePasseOublie] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [motDePasseVisible, setMotDePasseVisible] = useState(false)
  const [nomBoutique, setNomBoutique] = useState('')
  // Ajout de l'état pour la catégorie (Commerce classique par défaut)
  const [categorieBoutique, setCategorieBoutique] = useState('commerce_classique') 
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true) // Commencer à true pour éviter le flash du formulaire si connecté

  // Vérification de session propre et unique
  useEffect(() => {
    let estMonte = true;

    async function verifierSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && estMonte) {
        navigate('/dashboard', { replace: true })
      } else if (estMonte) {
        setChargement(false) // On arrête le chargement initial uniquement si non connecté
      }
    }

    verifierSession()

    return () => {
      estMonte = false
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setMessage('')
    setChargement(true)

    if (modeMotDePasseOublie) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      })

      if (error) {
        setErreur('Erreur : ' + error.message)
      } else {
        setMessage('Email envoyé ! Vérifie ta boîte mail pour réinitialiser ton mot de passe.')
      }
      setChargement(false)
      return
    }

    if (modeInscription) {
      const { error, data } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: {
          data: {
            nom_boutique: nomBoutique.trim() || 'Ma Boutique',
            categorie_boutique: categorieBoutique // Stockage de la décision clé (classique vs alibaba)
          },
        },
      })

      if (error) {
        setErreur(
          error.message.includes('already registered')
            ? 'Ce compte existe déjà. Connecte-toi directement.'
            : 'Erreur : ' + error.message
        )
        setChargement(false)
      } else if (data?.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setMessage('Compte créé ! Tu es maintenant connecté(e).')
        setChargement(false)
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      })

      if (error) {
        setErreur('Email ou mot de passe incorrect.')
        setChargement(false)
      } else if (data?.session) {
        navigate('/dashboard', { replace: true })
      }
    }
  }

  // Si l'application vérifie la session au premier chargement, on affiche un écran neutre
  if (chargement && email === '') {
    return <div className="min-h-screen flex items-center justify-center bg-bg text-text-secondary">Chargement...</div>;
  }

  const titre = modeMotDePasseOublie
    ? 'Mot de passe oublié'
    : modeInscription
    ? 'Créer votre boutique'
    : 'Content de te revoir'

  const sousTitre = modeMotDePasseOublie
    ? 'Reçois un lien par email pour le réinitialiser.'
    : modeInscription
    ? 'Rejoins les commerçantes qui gèrent leur boutique avec Ma Boutique.'
    : 'Connecte-toi pour accéder à ta boutique.'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden relative bg-bg">
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-xl shadow-lift">
            MB
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full bg-card rounded-2xl shadow-lift p-7 space-y-5">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">{titre}</h1>
            <p className="text-sm text-text-secondary mt-1.5">{sousTitre}</p>
          </div>

          {modeInscription && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Nom de la boutique
                </label>
                <div className="relative">
                  <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                  <input
                    type="text"
                    value={nomBoutique}
                    onChange={(e) => setNomBoutique(e.target.value)}
                    placeholder="Ex : Chez Aïcha"
                    maxLength={50}
                    className="w-full pl-11 pr-4 py-3 bg-bg border border-border rounded-xl text-sm input-halo"
                    required
                  />
                </div>
              </div>

              {/* Intégration du sélecteur demandé dans ton résumé */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Type de commerce
                </label>
                <select
                  value={categorieBoutique}
                  onChange={(e) => setCategorieBoutique(e.target.value)}
                  className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm input-halo"
                >
                  <option value="commerce_classique">Commerce classique</option>
                  <option value="groupage_alibaba">Groupage Alibaba</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full pl-11 pr-4 py-3 bg-bg border border-border rounded-xl text-sm input-halo"
                required
              />
            </div>
          </div>

          {!modeMotDePasseOublie && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                <input
                  type={motDePasseVisible ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-bg border border-border rounded-xl text-sm input-halo"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMotDePasseVisible((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-accent transition-colors"
                >
                  {motDePasseVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {!modeInscription && !modeMotDePasseOublie && (
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={() => {
                  setModeMotDePasseOublie(true)
                  setErreur('')
                  setMessage('')
                }}
                className="text-sm text-accent hover:text-accent-hover transition-colors font-medium"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {erreur && (
            <p className="text-sm text-error bg-error-bg rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-error-bg)' }}>
              {erreur}
            </p>
          )}
          {message && (
            <p className="text-sm text-success bg-success-bg rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-success-bg)' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-accent hover:opacity-90 text-white px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-soft"
          >
            {chargement
              ? 'Traitement en cours...'
              : modeMotDePasseOublie
              ? 'Envoyer le lien'
              : modeInscription
              ? "Commencer l'aventure"
              : 'Se connecter'}
            {!chargement && <ArrowRight size={16} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setModeInscription(!modeInscription)
              setModeMotDePasseOublie(false)
              setErreur('')
              setMessage('')
            }}
            className="w-full text-sm text-text-secondary hover:text-accent transition-colors text-center pt-1"
          >
            {modeMotDePasseOublie ? (
              'Retour à la connexion'
            ) : modeInscription ? (
              <>Déjà un compte ? <span className="text-accent font-semibold">Se connecter</span></>
            ) : (
              <>Pas encore de compte ? <span className="text-accent font-semibold">S'inscrire</span></>
            )}
          </button>
        </form>

        <div className="mt-6 flex justify-center items-center gap-2 opacity-60">
          <ShieldCheck size={15} className="text-text-secondary" />
          <p className="text-xs text-text-secondary font-medium">Plateforme sécurisée · Abidjan, CI</p>
        </div>
      </div>
    </div>
  )
}

export default Login