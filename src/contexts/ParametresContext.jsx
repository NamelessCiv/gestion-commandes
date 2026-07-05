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

    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      let { data } = await supabase
        .from('parametres_boutique')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        const { data: nouveau, error: erreurInsertion } = await supabase
          .from('parametres_boutique')
          .insert({ user_id: user.id, ...PARAMETRES_PAR_DEFAUT })
          .select()
          .single()

        if (erreurInsertion) {
          // Conflit (409) : une autre exécution a déjà créé la ligne entre-temps
          // (ex. double appel du useEffect en développement). On récupère
          // simplement la ligne existante au lieu de considérer ça comme une erreur.
          const { data: existant } = await supabase
            .from('parametres_boutique')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
          data = existant
        } else {
          data = nouveau
        }
      }

      if (!annule && data) {
        setParametres(data)
        appliquerTheme(data.theme_mode, data.accent_color)
      }
      setLoading(false)
    }

    charger()
    return () => { annule = true }
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