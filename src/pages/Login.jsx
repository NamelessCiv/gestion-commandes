import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ShoppingBag, Layers } from 'lucide-react'

function Login() {
  const navigate = useNavigate()
  const [modeInscription, setModeInscription] = useState(false)
  const [modeMotDePasseOublie, setModeMotDePasseOublie] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [motDePasseVisible, setMotDePasseVisible] = useState(false)
  const [nomBoutique, setNomBoutique] = useState('')
  const [categorieBoutique, setCategorieBoutique] = useState('commerce_classique') 
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)

  // Vérification de session
  useEffect(() => {
    let estMonte = true;

    async function verifierSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && estMonte) {
        navigate('/dashboard', { replace: true })
      } else if (estMonte) {
        setChargement(false)
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
            categorie_boutique: categorieBoutique
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

  if (chargement && email === '') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text-secondary text-xs font-bold uppercase tracking-wider">
        Chargement de l'espace...
      </div>
    );
  }

  const titre = modeMotDePasseOublie
    ? 'Mot de passe oublié'
    : modeInscription
    ? 'Créer votre boutique'
    : 'Content de te revoir'

  const sousTitre = modeMotDePasseOublie
    ? 'Reçois un lien par email pour le réinitialiser.'
    : modeInscription
    ? 'Rejoins les commerçants qui simplifient leur gestion.'
    : 'Connecte-toi pour accéder à ton tableau de bord.'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative bg-bg transition-colors duration-150 overflow-hidden">
      
      {/* Halo lumineux d'arrière-plan (couleurs brand/cta subtiles) */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cta/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 space-y-6">
        
        {/* Logo / Badge Marque */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-xl shadow-lg border border-white/10">
            MB
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary mt-1">Ma Boutique</span>
        </div>

        {/* Carte Formulaire Principal */}
        <form onSubmit={handleSubmit} className="w-full bg-card border border-border rounded-2xl shadow-modal p-6 sm:p-7 space-y-4">
          
          <div className="text-center mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">{titre}</h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">{sousTitre}</p>
          </div>

          {modeInscription && (
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
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
                    className="w-full pl-11 pr-4 h-11 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Type de commerce
                </label>
                <div className="relative">
                  <Layers size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
                  <select
                    value={categorieBoutique}
                    onChange={(e) => setCategorieBoutique(e.target.value)}
                    className="w-full pl-11 pr-4 h-11 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="commerce_classique">Commerce classique</option>
                    <option value="groupage_alibaba">Groupage Alibaba</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Adresse Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full pl-11 pr-4 h-11 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
                  required
                />
              </div>
            </div>

            {!modeMotDePasseOublie && (
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
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
                    className="w-full pl-11 pr-11 h-11 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMotDePasseVisible((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text transition-colors cursor-pointer"
                  >
                    {motDePasseVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!modeInscription && !modeMotDePasseOublie && (
            <div className="text-right pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setModeMotDePasseOublie(true)
                  setErreur('')
                  setMessage('')
                }}
                className="text-xs text-cta hover:underline font-semibold transition-colors cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Messages de Notification */}
          {erreur && (
            <div className="text-xs text-error font-medium bg-error-bg/60 border border-error/20 rounded-xl p-3 leading-relaxed">
              {erreur}
            </div>
          )}
          {message && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 leading-relaxed">
              {message}
            </div>
          )}

          {/* Bouton d'Action CTA */}
          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-cta text-white h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
          >
            {chargement
              ? 'Traitement...'
              : modeMotDePasseOublie
              ? 'Envoyer le lien'
              : modeInscription
              ? "Commencer l'aventure"
              : 'Se connecter'}
            {!chargement && <ArrowRight size={16} />}
          </button>

          {/* Bascule Mode Inscription / Connexion */}
          <div className="pt-2 border-t border-border/60 text-center">
            <button
              type="button"
              onClick={() => {
                setModeInscription(!modeInscription)
                setModeMotDePasseOublie(false)
                setErreur('')
                setMessage('')
              }}
              className="text-xs text-text-secondary hover:text-text transition-colors cursor-pointer"
            >
              {modeMotDePasseOublie ? (
                '← Retour à la connexion'
              ) : modeInscription ? (
                <>Déjà un compte ? <span className="text-cta font-bold">Se connecter</span></>
              ) : (
                <>Pas encore de compte ? <span className="text-cta font-bold">S'inscrire</span></>
              )}
            </button>
          </div>

        </form>

        {/* Footer Sécurisé */}
        <div className="flex justify-center items-center gap-2 opacity-60">
          <ShieldCheck size={14} className="text-text-secondary" />
          <p className="text-[11px] text-text-secondary font-medium">Plateforme sécurisée · Abidjan, CI</p>
        </div>

      </div>
    </div>
  )
}

export default Login