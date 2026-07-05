import { useState } from 'react'
import { supabase } from '../supabaseClient'

function ReinitialiserMotDePasse() {
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)
  const [chargement, setChargement] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const { error } = await supabase.auth.updateUser({ password: motDePasse })

    if (error) {
      setErreur('Erreur : ' + error.message)
    } else {
      setSucces(true)
    }

    setChargement(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Nouveau mot de passe</h1>
          <p className="text-sm text-text-secondary mt-1">Choisis ton nouveau mot de passe</p>
        </div>

        {succes ? (
          <div>
            <p className="text-sm text-success">
              Mot de passe mis à jour ! Tu peux maintenant retourner sur l'app et te connecter.
            </p>
            
              href="/" <a
              className="inline-block mt-3 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              Retour à l'app
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                minLength={6}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <p className="text-xs text-text-secondary mt-1">Minimum 6 caractères.</p>
            </div>

            {erreur && <p className="text-sm text-error">{erreur}</p>}

            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {chargement ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ReinitialiserMotDePasse