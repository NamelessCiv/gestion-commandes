import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Login() {
  const [modeInscription, setModeInscription] = useState(false)
  const [modeMotDePasseOublie, setModeMotDePasseOublie] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(false)

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
      const { error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
      })

      if (error) {
        setErreur(
          error.message.includes('already registered')
            ? 'Ce compte existe déjà. Connecte-toi directement.'
            : 'Erreur : ' + error.message
        )
      } else {
        setMessage('Compte créé ! Tu es maintenant connecté(e).')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      })

      if (error) {
        setErreur('Email ou mot de passe incorrect.')
      }
    }

    setChargement(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-text">
            {modeMotDePasseOublie
              ? 'Mot de passe oublié'
              : modeInscription
              ? 'Créer un compte'
              : 'Connexion'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {modeMotDePasseOublie
              ? 'Reçois un lien par email pour le réinitialiser'
              : modeInscription
              ? 'Crée ton compte pour commencer'
              : 'Accède à ta boutique'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        {!modeMotDePasseOublie && (
          <div>
            <label className="block text-sm font-medium text-text mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              minLength={6}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            {modeInscription && (
              <p className="text-xs text-text-secondary mt-1">Minimum 6 caractères.</p>
            )}
          </div>
        )}

        {!modeInscription && !modeMotDePasseOublie && (
          <button
            type="button"
            onClick={() => {
              setModeMotDePasseOublie(true)
              setErreur('')
              setMessage('')
            }}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            Mot de passe oublié ?
          </button>
        )}

        {erreur && <p className="text-sm text-error">{erreur}</p>}
        {message && <p className="text-sm text-success">{message}</p>}

        <button
          type="submit"
          disabled={chargement}
          className="w-full bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {chargement
            ? 'Chargement...'
            : modeMotDePasseOublie
            ? 'Envoyer le lien'
            : modeInscription
            ? 'Créer mon compte'
            : 'Se connecter'}
        </button>

        <button
          type="button"
          onClick={() => {
            setModeInscription(!modeInscription)
            setModeMotDePasseOublie(false)
            setErreur('')
            setMessage('')
          }}
          className="w-full text-sm text-accent hover:text-accent-hover transition-colors text-center"
        >
          {modeMotDePasseOublie
            ? 'Retour à la connexion'
            : modeInscription
            ? 'Déjà un compte ? Se connecter'
            : "Pas encore de compte ? S'inscrire"}
        </button>
      </form>
    </div>
  )
}

export default Login