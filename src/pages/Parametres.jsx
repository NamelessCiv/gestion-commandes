import { useState, useEffect, useRef } from 'react'
import { Store, Palette, User, Upload, Check, Sparkles, Link2, Copy, ExternalLink, MessageCircle } from 'lucide-react'
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

// Fonction utilitaire pour transformer le nom de la boutique en URL propre (Slug)
const genererSlug = (texte) => {
  return texte
    .toLowerCase()
    .normalize("NFD") // Supprime les accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_ ]/g, "") // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, "-"); // Remplace les espaces par des tirets
}

export default function Parametres() {
  const [ongletActif, setOngletActif] = useState('boutique')
  const { parametres, mettreAJour } = useParametres()
  const accentColor = parametres?.accent_color || '#635BFF'
  
  // États du formulaire
  const [nomBoutique, setNomBoutique] = useState('')
  const [lienPublic, setLienPublic] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [numeroWhatsapp, setNumeroWhatsapp] = useState('')
  const [nomUtilisateur, setNomUtilisateur] = useState('') // Conservé localement pour l'interface
  
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const fileInputRef = useRef(null)

  // Synchronisation des états locaux avec le contexte
  useEffect(() => {
    if (parametres) {
      setNomBoutique(parametres.nom_boutique || '')
      setLienPublic(parametres.lien_public || '')
      setLogoUrl(parametres.logo_url || '')
      setNumeroWhatsapp(parametres.numero_whatsapp || '')
      setNomUtilisateur(parametres.nom_utilisateur || '') 
    }
  }, [parametres])

  // Génération dynamique de l'URL absolue de la vitrine
  const urlVitrine = `${window.location.origin}/boutique/${parametres?.lien_public || ''}`

  const copierLien = () => {
    if (!parametres?.lien_public) return
    navigator.clipboard.writeText(urlVitrine)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  // Sauvegarde globale
  const handleSauvegarder = async (e) => {
    e.preventDefault()
    setChargement(true)
    setMessage('')
    setErreur('')

    // Si le champ du lien public est vide, on le génère automatiquement depuis le nom
    const lienFinal = lienPublic.trim()
      ? lienPublic.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : genererSlug(nomBoutique);

    try {
      if (typeof mettreAJour !== 'function') {
        throw new Error("La fonction mettreAJour n'est pas définie dans le contexte.");
      }

      // CORRECTION : On n'envoie plus nom_utilisateur car la colonne n'existe pas dans ta table Supabase
      const { error } = await mettreAJour({
        nom_boutique: nomBoutique,
        lien_public: lienFinal,
        numero_whatsapp: numeroWhatsapp.trim()
      })

      if (error) {
        setErreur(`Erreur de base de données : ${error.message}`)
      } else {
        setLienPublic(lienFinal)
        setMessage('Paramètres mis à jour avec succès !')
      }
    } catch (err) {
      console.error("Erreur détaillée de mise à jour :", err)
      setErreur(`Erreur système : ${err.message}`)
    } finally {
      setChargement(false)
    }
  };

  // Upload du logo vers Supabase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setChargement(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('boutique-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('boutique-assets')
        .getPublicUrl(filePath)

      if (typeof mettreAJour === 'function') {
        await mettreAJour({ logo_url: publicUrl })
      }
      setLogoUrl(publicUrl)
      setMessage('Logo mis à jour avec succès !')
    } catch (err) {
      setErreur("Échec de l'importation du logo.")
    } finally {
      setChargement(false)
    }
  };

  const changerCouleurPreset = async (valeur) => {
    if (typeof mettreAJour === 'function') {
      await mettreAJour({ accent_color: valeur })
    }
  };

  const estPremium = parametres?.premium || false

  return (
    <div className="bg-transparent text-text min-h-screen pb-12 w-full transition-colors duration-150">
      <main className="max-w-xl mx-auto px-4">
        
        {/* En-tête de la page */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Paramètres</h1>
          <p className="text-sm text-text-secondary mt-1">Personnalise ton application et gère ta vitrine</p>
        </div>

        {/* Barre des Onglets */}
        <div className="flex bg-card p-1 rounded-xl border border-border shadow-2xs mb-6 overflow-x-auto scrollbar-none">
          {ONGLETS.map(({ id, label, icon: Icon }) => {
            const estActif = ongletActif === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setOngletActif(id)}
                style={{
                  backgroundColor: estActif ? accentColor : 'transparent',
                  color: estActif ? '#ffffff' : 'var(--color-text-secondary)'
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 justify-center ${
                  !estActif && 'hover:bg-surface-muted'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Messages d'alerte */}
        {message && <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl mb-4">{message}</div>}
        {erreur && <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl mb-4">{erreur}</div>}

        {/* CONTENU : BOUTIQUE */}
        {ongletActif === 'boutique' && (
          <div className="space-y-6">
            
            {/* ENCART DE GENERATION AUTOMATIQUE DU LIEN DE LA VITRINE */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div>
                <h2 className="text-sm font-black text-text flex items-center gap-2">
                  <Link2 size={16} className="text-text-secondary" /> Lien de ta boutique en ligne
                </h2>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Généré automatiquement. Partage ce lien à tes clients pour recevoir tes commandes en direct.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-surface-muted p-2 rounded-xl border border-border">
                <span className="font-mono text-xs text-text-secondary px-2 break-all flex-1 select-all py-1.5 sm:py-0">
                  {parametres?.lien_public ? urlVitrine : "En attente du nom de ton commerce..."}
                </span>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={copierLien}
                    disabled={!parametres?.lien_public}
                    className="h-8 px-3 bg-card border border-border text-text hover:bg-surface-muted rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {copie ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copier</span>
                      </>
                    )}
                  </button>

                  <a
  href={`/boutique/${lienPublic}`} // <-- Utilise "lienPublic" à la place de "parametres?.lien_public"
  target="_blank"
  rel="noreferrer"
  className={`h-8 px-3 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-3xs ${
    lienPublic ? 'hover:opacity-90' : 'pointer-events-none opacity-50'
  }`}
  style={{ backgroundColor: accentColor }}
>
  <ExternalLink size={12} />
  <span>Visiter</span>
</a>
                </div>
              </div>
            </div>

            {/* FORMULAIRE PRINCIPAL */}
            <form onSubmit={handleSauvegarder} className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center pb-2 border-b border-border/50">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-border overflow-hidden flex items-center justify-center relative shadow-3xs">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="text-text-secondary" size={24} />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Upload size={14} />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">Identité Visuelle</h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">Clique sur l'icône pour charger le logo de ta marque.</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Nom de la boutique</label>
                  <input 
                    required 
                    type="text" 
                    value={nomBoutique} 
                    onChange={(e) => {
                      setNomBoutique(e.target.value)
                      if (!parametres?.lien_public) {
                        setLienPublic(genererSlug(e.target.value))
                      }
                    }} 
                    placeholder="Ex: Mon Super Commerce"
                    className="w-full h-10 px-3 bg-surface-muted border border-border rounded-xl text-xs outline-none focus:border-border-dark transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Identifiant d'extension d'URL (Lien personnalisé alternatif)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[11px] font-mono text-text-secondary select-none">/boutique/</span>
                    <input 
                      type="text" 
                      value={lienPublic} 
                      onChange={(e) => setLienPublic(e.target.value)} 
                      placeholder="Laisse vide pour autogénérer"
                      className="w-full h-10 pl-[64px] pr-3 bg-surface-muted border border-border rounded-xl text-xs font-mono outline-none focus:border-border-dark transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MessageCircle size={12} className="text-emerald-600" /> Numéro WhatsApp de la boutique
                  </label>
                  <input
                    type="tel"
                    value={numeroWhatsapp}
                    onChange={(e) => setNumeroWhatsapp(e.target.value)}
                    placeholder="Ex: 2250700000000 (avec l'indicatif pays, sans le +)"
                    className="w-full h-10 px-3 bg-surface-muted border border-border rounded-xl text-xs outline-none focus:border-border-dark transition-all"
                  />
                  <p className="text-[10px] text-text-secondary mt-1">
                    C'est sur ce numéro que tes clients enverront leur bon de commande depuis ta vitrine.
                  </p>
                </div>
              </div>

              <button type="submit" disabled={chargement} style={{ backgroundColor: accentColor }} className="w-full h-10 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer">
                {chargement ? 'Sauvegarde...' : 'Enregistrer les modifications'}
              </button>
            </form>
          </div>
        )}

        {/* CONTENU : APPARENCE */}
        {ongletActif === 'apparence' && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider">Thème de l'application</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">Sélectionne la couleur principale pour personnaliser l'interface globale et ta vitrine.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COULEURS_PRESET.map((c) => {
                const estSelectionne = accentColor.toLowerCase() === c.valeur.toLowerCase()
                return (
                  <button
                    key={c.nom}
                    type="button"
                    onClick={() => changerCouleurPreset(c.valeur)}
                    className="p-2.5 rounded-xl border border-border bg-surface-muted/50 hover:bg-surface-muted flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <div className="w-5 h-5 rounded-full shadow-3xs flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: c.valeur }}>
                      {estSelectionne && <Check size={10} className="text-white" />}
                    </div>
                    <span className={`text-[10px] font-bold ${estSelectionne ? 'text-text' : 'text-text-secondary'}`}>{c.nom}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CONTENU : COMPTE */}
        {ongletActif === 'compte' && (
          <form onSubmit={handleSauvegarder} className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider">Informations du compte</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">Gère tes informations personnelles d'administrateur.</p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Nom complet du gestionnaire</label>
              <input required type="text" value={nomUtilisateur} onChange={(e) => setNomUtilisateur(e.target.value)} className="w-full h-10 px-3 bg-surface-muted border border-border rounded-xl text-xs outline-none focus:border-border-dark transition-all" />
            </div>
            <button type="submit" disabled={chargement} style={{ backgroundColor: accentColor }} className="w-full h-10 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer">
              {chargement ? 'Sauvegarde...' : 'Enregistrer le compte'}
            </button>
          </form>
        )}

        {/* BLOC PREMIUM */}
        <div className="mt-6 rounded-2xl border border-border bg-bg/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Plan & Licences</p>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                estPremium 
                  ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-text-secondary bg-card border border-border shadow-2xs'
              }`}>
                {estPremium ? 'Premium Actif' : 'Version Gratuite'}
              </span>
            </div>
            {!estPremium && (
              <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs font-bold text-text-secondary cursor-not-allowed uppercase tracking-wider">
                <Sparkles size={12} /> Upgrade
              </button>
            )}
          </div>
          <p className="text-[11px] text-text-secondary leading-normal">
            Les modules Premium arriveront prochainement dans ton espace : synchronisation hors-ligne, notifications WhatsApp automatiques et bilans comptables avancés.
          </p>
        </div>

      </main>
    </div>
  )
}