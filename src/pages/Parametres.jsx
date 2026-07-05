import { useState, useEffect, useRef } from 'react'
import { Store, Palette, User, Upload, Check, Sparkles } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'

const COULEURS_PRESET = [
  { nom: 'Violet', valeur: '#635BFF' },
  { nom: 'Bleu', valeur: '#2563EB' },
  { nom: 'Vert', valeur: '#059669' },
  { nom: 'Orange', valeur: '#EA580C' },
  { nom: 'Rose', valeur: '#DB2777' },
  { nom: 'Rouge', valeur: '#DC2626' },
]

const ONGLETS = [
  { id: 'boutique', label: 'Boutique', icon: Store },
  { id: 'apparence', label: 'Apparence', icon: Palette },
  { id: 'compte', label: 'Compte', icon: User },
]

function Parametres() {
  const [ongletActif, setOngletActif] = useState('boutique')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">Paramètres</h1>
      <p className="text-text-secondary mt-1">Personnalise ton application</p>

      <div className="mt-6 flex gap-1 border-b border-border overflow-x-auto">
        {ONGLETS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setOngletActif(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              ongletActif === id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-lg">
        {ongletActif === 'boutique' && <OngletBoutique />}
        {ongletActif === 'apparence' && <OngletApparence />}
        {ongletActif === 'compte' && <OngletCompte />}
      </div>
    </div>
  )
}

function OngletBoutique() {
  const { parametres, mettreAJour, televerserLogo } = useParametres()
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [televersement, setTeleversement] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const fichierRef = useRef(null)

  useEffect(() => {
    setNom(parametres.nom_boutique || '')
    setTelephone(parametres.telephone || '')
    setAdresse(parametres.adresse || '')
  }, [parametres])

  async function enregistrer(e) {
    e.preventDefault()
    setEnregistrement(true)
    await mettreAJour({ nom_boutique: nom, telephone, adresse })
    setEnregistrement(false)
    setConfirme(true)
    setTimeout(() => setConfirme(false), 2000)
  }

  async function gererChangementFichier(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setTeleversement(true)
    await televerserLogo(fichier)
    setTeleversement(false)
  }

  return (
    <form onSubmit={enregistrer} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text mb-2">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
            {parametres.logo_url ? (
              <img src={parametres.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store size={24} className="text-text-secondary" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fichierRef.current?.click()}
            disabled={televersement}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-text hover:bg-bg transition-colors disabled:opacity-50"
          >
            <Upload size={16} />
            {televersement ? 'Envoi...' : 'Changer le logo'}
          </button>
          <input
            ref={fichierRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={gererChangementFichier}
            className="hidden"
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">PNG, JPG ou WEBP. Utilisé sur tes factures.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Nom de la boutique</label>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Téléphone</label>
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="07 00 00 00 00"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Adresse</label>
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Abidjan, Côte d'Ivoire"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <button
        type="submit"
        disabled={enregistrement}
        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {confirme ? <Check size={16} /> : null}
        {enregistrement ? 'Enregistrement...' : confirme ? 'Enregistré' : 'Enregistrer'}
      </button>
    </form>
  )
}

function OngletApparence() {
  const { parametres, mettreAJour } = useParametres()
  const [couleurPersonnalisee, setCouleurPersonnalisee] = useState(parametres.accent_color || '#635BFF')

  useEffect(() => {
    setCouleurPersonnalisee(parametres.accent_color || '#635BFF')
  }, [parametres.accent_color])

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-text mb-3">Mode d'affichage</label>
        <div className="flex gap-3">
          {[
            { valeur: 'clair', label: 'Clair' },
            { valeur: 'sombre', label: 'Sombre' },
          ].map(({ valeur, label }) => (
            <button
              key={valeur}
              onClick={() => mettreAJour({ theme_mode: valeur })}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                parametres.theme_mode === valeur
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:bg-card'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-3">Couleur d'accent</label>
        <div className="flex flex-wrap gap-3">
          {COULEURS_PRESET.map(({ nom, valeur }) => (
            <button
              key={valeur}
              title={nom}
              onClick={() => mettreAJour({ accent_color: valeur })}
              className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-bg transition-all"
              style={{
                backgroundColor: valeur,
                '--tw-ring-color': parametres.accent_color === valeur ? valeur : 'transparent',
              }}
            >
              {parametres.accent_color === valeur && <Check size={16} className="text-white" />}
            </button>
          ))}

          <label
            className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer relative overflow-hidden"
            title="Couleur personnalisée"
          >
            <input
              type="color"
              value={couleurPersonnalisee}
              onChange={(e) => {
                setCouleurPersonnalisee(e.target.value)
                mettreAJour({ accent_color: e.target.value })
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Palette size={16} className="text-text-secondary" />
          </label>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Couleur actuelle : <span className="font-mono">{parametres.accent_color}</span>
        </p>
      </div>
    </div>
  )
}

function OngletCompte() {
  const { parametres } = useParametres()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
  }, [])

  const estPremium = parametres.plan === 'premium'

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Adresse email</label>
        <p className="px-3 py-2 rounded-lg border border-border bg-card text-text-secondary text-sm">
          {email}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">Plan actuel</p>
            <span
              className={`inline-block mt-1 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                estPremium ? 'text-accent bg-accent/10' : 'text-text-secondary bg-bg'
              }`}
            >
              {estPremium ? 'Premium' : 'Gratuit'}
            </span>
          </div>
          {!estPremium && (
            <button
              disabled
              title="Bientôt disponible"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-text-secondary text-sm font-medium cursor-not-allowed"
            >
              <Sparkles size={16} />
              Passer en Premium
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Les fonctionnalités Premium arrivent bientôt : mode hors-ligne, SMS, statistiques avancées...
        </p>
      </div>
    </div>
  )
}

export default Parametres