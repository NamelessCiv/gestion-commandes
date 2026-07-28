// Fichier : pages/Parametres.jsx
import { useState, useEffect, useRef } from 'react'
import { Store, User, Upload, Check, Sparkles, Link2, Copy, ExternalLink, MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'

const ONGLETS = [
  { id: 'boutique', label: 'Boutique', icon: Store },
  { id: 'compte', label: 'Compte', icon: User },
]

const genererSlug = (texte) => {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function Parametres() {
  const [ongletActif, setOngletActif] = useState('boutique')
  const { parametres, mettreAJour } = useParametres()
  
  const [nomBoutique, setNomBoutique] = useState('')
  const [lienPublic, setLienPublic] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [numeroWhatsapp, setNumeroWhatsapp] = useState('')
  const [nomUtilisateur, setNomUtilisateur] = useState('')
  
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (parametres) {
      setNomBoutique(parametres.nom_boutique || '')
      setLienPublic(parametres.lien_public || '')
      setLogoUrl(parametres.logo_url || '')
      setNumeroWhatsapp(parametres.numero_whatsapp || '')
      setNomUtilisateur(parametres.nom_utilisateur || '') 
    }
  }, [parametres])

  const urlVitrine = `${window.location.origin}/boutique/${parametres?.lien_public || ''}`

  const copierLien = () => {
    if (!parametres?.lien_public) return
    navigator.clipboard.writeText(urlVitrine)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  const handleSauvegarder = async (e) => {
    e.preventDefault()
    setChargement(true)
    setMessage('')
    setErreur('')

    const lienFinal = lienPublic.trim()
      ? lienPublic.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : genererSlug(nomBoutique);

    try {
      if (typeof mettreAJour !== 'function') {
        throw new Error("La fonction mettreAJour n'est pas définie dans le contexte.");
      }

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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setChargement(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/logo-${Date.now()}.${fileExt}`

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

  const estPremium = parametres?.premium || false

  return (
    <div className="p-6 space-y-6 text-text max-w-2xl mx-auto">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-text">Paramètres</h1>
        <p className="text-sm text-text-secondary mt-0.5">Personnalise ton application et gère l'identité de ta vitrine</p>
      </div>

      {/* Barre d'Onglets KOHO */}
      <div className="flex bg-card p-1 rounded-2xl border border-border shadow-2xs overflow-x-auto scrollbar-none">
        {ONGLETS.map(({ id, label, icon: Icon }) => {
          const estActif = ongletActif === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOngletActif(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 justify-center ${
                estActif ? 'bg-cta text-white' : 'text-text-secondary hover:bg-surface-muted'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Alertas */}
      {message && <div className="p-3.5 bg-success-bg border border-success/20 text-success text-xs font-bold rounded-xl">{message}</div>}
      {erreur && <div className="p-3.5 bg-error-bg border border-error/20 text-error text-xs font-bold rounded-xl">{erreur}</div>}

      {/* ONGLET : BOUTIQUE */}
      {ongletActif === 'boutique' && (
        <div className="space-y-6">
          
          {/* Lien Vitrine */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3.5">
            <div>
              <h2 className="text-sm font-bold font-display text-text flex items-center gap-2">
                <Link2 size={16} className="text-brand" /> Lien de ta boutique en ligne
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Partage ce lien à tes clients pour recevoir tes commandes en direct.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-surface-muted p-2 rounded-xl border border-border">
              <span className="font-mono text-xs text-text-secondary px-2 break-all flex-1 select-all py-1.5 sm:py-0">
                {parametres?.lien_public ? urlVitrine : "En attente du nom de ton commerce..."}
              </span>

              <div className="flex gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={copierLien}
                  disabled={!parametres?.lien_public}
                  className="h-9 px-3.5 bg-card border border-border text-text hover:bg-surface-muted rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {copie ? (
                    <>
                      <Check size={14} className="text-success" />
                      <span className="text-success">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copier</span>
                    </>
                  )}
                </button>

                <a
                  href={`/boutique/${lienPublic}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`h-9 px-3.5 bg-cta text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    lienPublic ? 'hover:opacity-90' : 'pointer-events-none opacity-50'
                  }`}
                >
                  <ExternalLink size={14} />
                  <span>Visiter</span>
                </a>
              </div>
            </div>
          </div>

          {/* Formulaire Boutique */}
          <form onSubmit={handleSauvegarder} className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
            
            <div className="flex flex-col sm:flex-row gap-4 items-center pb-4 border-b border-border">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-border overflow-hidden flex items-center justify-center relative shadow-xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="text-text-secondary" size={24} />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Upload size={16} />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Identité Visuelle</h3>
                <p className="text-xs text-text-secondary mt-0.5">Clique sur le carré pour uploader le logo de ta marque.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[0.75rem] font-bold text-text-secondary uppercase tracking-wider block">Nom de la boutique</label>
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
                  className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand transition-all" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[0.75rem] font-bold text-text-secondary uppercase tracking-wider block">Lien d'accès personnalisé</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-mono text-text-secondary select-none">/boutique/</span>
                  <input 
                    type="text" 
                    value={lienPublic} 
                    onChange={(e) => setLienPublic(e.target.value)} 
                    placeholder="autogénéré-si-vide"
                    className="w-full h-11 pl-[82px] pr-4 bg-bg border border-border rounded-xl text-sm text-text font-mono outline-none focus:border-brand transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.75rem] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle size={14} className="text-[#25D366]" /> Numéro WhatsApp de réception
                </label>
                <input
                  type="tel"
                  value={numeroWhatsapp}
                  onChange={(e) => setNumeroWhatsapp(e.target.value)}
                  placeholder="Ex: 2250700000000"
                  className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand transition-all font-mono"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Les clients y enverront leur bon de commande directement depuis ta vitrine.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={chargement} 
                className="w-full h-11 bg-cta text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {chargement && <Loader2 size={16} className="animate-spin" />}
                {chargement ? 'Sauvegarde...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ONGLET : COMPTE */}
      {ongletActif === 'compte' && (
        <form onSubmit={handleSauvegarder} className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">Informations du compte</h2>
            <p className="text-xs text-text-secondary mt-0.5">Gère tes informations d'administrateur.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[0.75rem] font-bold text-text-secondary uppercase tracking-wider block">Nom du gestionnaire</label>
            <input 
              required 
              type="text" 
              value={nomUtilisateur} 
              onChange={(e) => setNomUtilisateur(e.target.value)} 
              className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand transition-all" 
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={chargement} 
              className="w-full h-11 bg-cta text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {chargement && <Loader2 size={16} className="animate-spin" />}
              {chargement ? 'Sauvegarde...' : 'Enregistrer les informations'}
            </button>
          </div>
        </form>
      )}

      {/* PLAN PREMIUM */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Licence d'utilisation</p>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mt-1 border ${
              estPremium 
                ? 'text-success bg-success-bg border-success/20' 
                : 'text-text-secondary bg-surface-muted border-border'
            }`}>
              {estPremium ? 'Premium Actif' : 'Version Standard'}
            </span>
          </div>
          {!estPremium && (
            <button disabled className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-muted border border-border text-xs font-bold text-text-secondary cursor-not-allowed uppercase tracking-wider">
              <Sparkles size={14} /> Upgrade
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Accède prochainement aux options avancées : export comptable, notifications automatiques et personnalisation complète.
        </p>
      </div>

    </div>
  )
}