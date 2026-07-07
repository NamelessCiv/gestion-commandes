import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const ParametresContext = createContext(null)

const PARAMETRES_PAR_DEFAUT = {
  nom_boutique: 'Ma Boutique',
  telephone: '',
  adresse: '',
  logo_url: null,
  theme_mode: 'clair',
  accent_color: '#635BFF',
  plan: 'gratuit',
}

// Éclaircit (montant positif) ou assombrit (montant négatif) une couleur hex
function ajusterCouleur(hex, montant) {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + montant
  let g = ((num >> 8) & 0x00ff) + montant
  let b = (num & 0x0000ff) + montant
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Applique le mode (classe .dark sur <html>) + la couleur d'accent (variables CSS)
function appliquerTheme(mode, accent) {
  const racine = document.documentElement
  if (mode === 'sombre') {
    racine.classList.add('dark')
  } else {
    racine.classList.remove('dark')
  }
  racine.style.setProperty('--color-accent', accent)
  racine.style.setProperty('--color-accent-hover', ajusterCouleur(accent, mode === 'sombre' ? 30 : -30))
}

export function ParametresProvider({ children }) {
  const [parametres, setParametres] = useState(PARAMETRES_PAR_DEFAUT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let annule = false
    // Empêche une réponse réseau "en retard" d'un ancien utilisateur
    // d'écraser les données du nouvel utilisateur (race condition).
    let idUtilisateurCourant = null

    async function charger(userIdCible) {
      let { data } = await supabase
        .from('parametres_boutique')
        .select('*')
        .eq('user_id', userIdCible)
        .maybeSingle()

      if (!data) {
        const { data: { user } } = await supabase.auth.getUser()
        const nomBoutiqueInscription = user?.user_metadata?.nom_boutique
        const { data: nouveau, error: erreurInsertion } = await supabase
          .from('parametres_boutique')
          .insert({
            user_id: userIdCible,
            ...PARAMETRES_PAR_DEFAUT,
            ...(nomBoutiqueInscription ? { nom_boutique: nomBoutiqueInscription } : {}),
          })
          .select()
          .single()

        if (erreurInsertion) {
          // Conflit (409) : une autre exécution a déjà créé la ligne entre-temps
          // (ex. double appel du useEffect en développement). On récupère
          // simplement la ligne existante au lieu de considérer ça comme une erreur.
          const { data: existant } = await supabase
            .from('parametres_boutique')
            .select('*')
            .eq('user_id', userIdCible)
            .maybeSingle()
          data = existant
        } else {
          data = nouveau
        }
      }

      // Si l'utilisateur a changé pendant l'appel réseau, ou si le
      // Provider a été démonté, on ignore ce résultat périmé.
      if (annule || userIdCible !== idUtilisateurCourant) return

      if (data) {
        setParametres(data)
        appliquerTheme(data.theme_mode, data.accent_color)
      } else {
        setParametres(PARAMETRES_PAR_DEFAUT)
        appliquerTheme(PARAMETRES_PAR_DEFAUT.theme_mode, PARAMETRES_PAR_DEFAUT.accent_color)
      }
      setLoading(false)
    }

    // Réinitialise immédiatement l'affichage (avant même le fetch réseau)
    // pour qu'il soit impossible d'afficher, même brièvement, les données
    // d'un compte précédent pendant le chargement du nouveau.
    function reinitialiserAffichage() {
      setParametres(PARAMETRES_PAR_DEFAUT)
      appliquerTheme(PARAMETRES_PAR_DEFAUT.theme_mode, PARAMETRES_PAR_DEFAUT.accent_color)
    }

    // Chargement initial
    supabase.auth.getSession().then(({ data: { session } }) => {
      idUtilisateurCourant = session?.user?.id || null
      if (session?.user) {
        reinitialiserAffichage()
        charger(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Réagit à chaque connexion / déconnexion, même sans démontage du Provider
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nouvelId = session?.user?.id || null

      if (event === 'SIGNED_OUT' || !nouvelId) {
        idUtilisateurCourant = null
        reinitialiserAffichage()
        setLoading(false)
        return
      }

      // Évite de recharger inutilement si c'est le même utilisateur
      // (ex. simple rafraîchissement de token)
      if (nouvelId === idUtilisateurCourant) return

      idUtilisateurCourant = nouvelId
      setLoading(true)
      // Efface immédiatement les données de l'utilisateur précédent avant
      // de lancer le fetch : plus aucune fenêtre où l'ancien compte reste visible.
      reinitialiserAffichage()
      charger(nouvelId)
    })

    return () => {
      annule = true
      subscription?.unsubscribe()
    }
  }, [])

  const mettreAJour = useCallback(async (changements) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data, error } = await supabase
      .from('parametres_boutique')
      .update(changements)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!error && data) {
      setParametres(data)
      if (changements.theme_mode || changements.accent_color) {
        appliquerTheme(data.theme_mode, data.accent_color)
      }
    }
    return { data, error }
  }, [])

  const televerserLogo = useCallback(async (fichier) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const extension = fichier.name.split('.').pop()
    const chemin = `${user.id}/logo.${extension}`

    const { error: erreurUpload } = await supabase.storage
      .from('logos')
      .upload(chemin, fichier, { upsert: true })

    if (erreurUpload) return { error: erreurUpload.message }

    const { data: urlPublique } = supabase.storage.from('logos').getPublicUrl(chemin)
    // Ajoute un paramètre pour forcer le rafraîchissement du cache navigateur
    const logoUrlAvecCache = `${urlPublique.publicUrl}?t=${Date.now()}`

    return mettreAJour({ logo_url: logoUrlAvecCache })
  }, [mettreAJour])

  return (
    <ParametresContext.Provider value={{ parametres, loading, mettreAJour, televerserLogo }}>
      {children}
    </ParametresContext.Provider>
  )
}

export function useParametres() {
  const contexte = useContext(ParametresContext)
  if (!contexte) {
    throw new Error('useParametres doit être utilisé à l\'intérieur d\'un ParametresProvider')
  }
  return contexte
}