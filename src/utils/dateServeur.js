import { supabase } from '../supabaseClient'

// Récupère l'heure actuelle du serveur Supabase — fiable, indépendante
// de l'horloge (potentiellement mal réglée) de l'appareil de l'utilisateur.
export async function maintenantServeur() {
  const { data, error } = await supabase.rpc('heure_serveur')
  if (error || !data) {
    // Repli sur l'horloge locale si la requête échoue, pour ne jamais bloquer l'app
    return new Date()
  }
  return new Date(data)
}

// Calcule le début d'une période (jour / semaine / mois) en UTC à partir
// d'une date de référence (idéalement l'heure serveur ci-dessus).
// La Côte d'Ivoire étant en UTC+0 toute l'année, minuit UTC = minuit à Abidjan.
export function debutPeriodeUTC(dateReference, periode) {
  const d = new Date(dateReference)

  if (periode === 'jour') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }

  if (periode === 'semaine') {
    const jourSemaine = d.getUTCDay() || 7 // dimanche (0) devient 7
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - jourSemaine + 1))
  }

  if (periode === 'mois') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  }

  return d
}