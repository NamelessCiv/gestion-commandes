import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Eye, EyeOff, Globe, Package, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'

function Stock() {
  const { parametres } = useParametres()
  const accentColor = parametres?.accent_color || '#635BFF'
  const estGroupage = parametres?.categorie === 'groupage_alibaba'

  const [produits, setProduits] = useState([])
  const [recherche, setRecherche] = useState('')
  const [chargement, setChargement] = useState(true)
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const [produitSelectionne, setProduitSelectionne] = useState(null)

  // Formulaire State
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [quantite, setQuantite] = useState('')
  const [seuilAlerte, setSeuilAlerte] = useState('5')
  const [enLigne, setEnLigne] = useState(false)
  const [descriptionPublique, setDescriptionPublique] = useState('')
  const [quantiteMinimale, setQuantiteMinimale] = useState('1')
  const [photoUrl, setPhotoUrl] = useState('')
  
  // Nouveaux états pour la gestion de l'upload de fichier
  const [uploadeEnCours, setUploadeEnCours] = useState(false)

  useEffect(() => {
    chargerProduits()
  }, [])

  async function chargerProduits() {
    try {
      setChargement(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProduits(data || [])
    } catch (err) {
      console.error('Erreur chargement produits:', err)
    } finally {
      setChargement(false)
    }
  }

  function ouvrirModale(prod = null) {
    if (prod) {
      setProduitSelectionne(prod)
      setNom(prod.nom || '')
      setPrix(prod.prix?.toString() || '')
      setQuantite(prod.quantite?.toString() || '')
      setSeuilAlerte(prod.seuil_alerte?.toString() || '5')
      setEnLigne(prod.en_ligne || false)
      setDescriptionPublique(prod.description_publique || '')
      setQuantiteMinimale(prod.quantite_minimale?.toString() || '1')
      setPhotoUrl(prod.photo_url || '')
    } else {
      setProduitSelectionne(null)
      setNom('')
      setPrix('')
      setQuantite('')
      setSeuilAlerte('5')
      setEnLigne(false)
      setDescriptionPublique('')
      setQuantiteMinimale('1')
      setPhotoUrl('')
    }
    setModaleOuverte(true)
  }

  // Fonction magique pour uploader l'image sur Supabase Storage
  async function gérerChangementFichier(e) {
    const fichier = e.target.files[0]
    if (!fichier) return

    try {
      setUploadeEnCours(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Création d'un nom de fichier unique basé sur le timestamp pour éviter les doublons
      const extensionFichier = fichier.name.split('.').pop()
      const nomFichierUnique = `${user.id}/${Date.now()}.${extensionFichier}`

      // Upload du fichier dans le bucket 'photos-produits'
      const { data, error } = await supabase.storage
        .from('photos-produits')
        .upload(nomFichierUnique, fichier, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Récupération de l'URL publique de l'image stockée
      const { data: { publicUrl } } = supabase.storage
        .from('photos-produits')
        .getPublicUrl(nomFichierUnique)

      setPhotoUrl(publicUrl)
    } catch (err) {
      console.error('Erreur lors de l\'upload de l\'image:', err)
      alert('Impossible d\'uploader l\'image. Vérifie que ton bucket storage est bien créé et public.')
    } finally {
      setUploadeEnCours(false)
    }
  }

  async function soumettreFormulaire(e) {
    e.preventDefault()
    if (uploadeEnCours) {
      alert("Patiente un instant, l'image est en train d'être envoyée...")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        nom: nom.trim(),
        prix: parseFloat(prix) || 0,
        quantite: parseInt(quantite) || 0,
        seuil_alerte: parseInt(seuilAlerte) || 5,
        en_ligne: enLigne,
        description_publique: descriptionPublique.trim(),
        quantite_minimale: estGroupage ? Math.max(1, parseInt(quantiteMinimale) || 1) : 1,
        photo_url: photoUrl,
        user_id: user.id
      }

      if (produitSelectionne) {
        const { error } = await supabase
          .from('produits')
          .update(payload)
          .eq('id', produitSelectionne.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('produits')
          .insert([payload])
        if (error) throw error
      }

      setModaleOuverte(false)
      chargerProduits()
    } catch (err) {
      console.error('Erreur enregistrement produit:', err)
    }
  }

  async function supprimerProduit(id) {
    if (!window.confirm('Supprimer cet article définitivement ?')) return
    try {
      const { error } = await supabase
        .from('produits')
        .delete()
        .eq('id', id)
      if (error) throw error
      chargerProduits()
    } catch (err) {
      console.error('Erreur suppression produit:', err)
    }
  }

  const produitsFiltres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="space-y-6 text-text transition-colors duration-150">
      
      {/* En-tête du Stock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Catalogue & Stock</h1>
          <p className="text-sm text-text-secondary mt-0.5">Gère ton inventaire et tes publications en ligne</p>
        </div>
        <button
          onClick={() => ouvrirModale()}
          style={{ backgroundColor: accentColor }}
          className="flex items-center justify-center gap-2 text-white font-bold text-xs px-5 h-11 rounded-xl shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus size={16} />
          Ajouter un article
        </button>
      </div>

      {/* Barre de Recherche */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-3.5 text-text-secondary" size={16} />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-xl text-sm text-text outline-none focus:border-border transition-all"
        />
      </div>

      {/* Liste / Grille des Produits */}
      {chargement ? (
        <div className="py-20 text-center text-text-secondary text-xs font-bold uppercase tracking-wider">Chargement de la réserve...</div>
      ) : produitsFiltres.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <p className="text-sm text-text-secondary">Aucun article trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {produitsFiltres.map((prod) => {
            const sousSeuil = prod.quantite <= (prod.seuil_alerte || 5)
            return (
              <div
                key={prod.id}
                className="bg-card border border-border rounded-2xl p-4 flex gap-4 shadow-2xs hover:shadow-xs transition-all duration-200 relative group"
              >
                {/* Miniature Image ou Initiale */}
                <div className="w-16 h-16 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary font-bold text-lg overflow-hidden shrink-0">
                  {prod.photo_url ? (
                    <img src={prod.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    prod.nom.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Corps de la carte */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-text truncate">{prod.nom}</h3>
                      
                      {/* Badge Statut en Ligne */}
                      {prod.en_ligne ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                          <Eye size={10} /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-text-secondary rounded-md">
                          <EyeOff size={10} /> Privé
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-black tracking-tight" style={{ color: accentColor }}>
                      {prod.prix.toLocaleString('fr-FR')} FCFA
                      {estGroupage && prod.quantite_minimale > 1 && (
                        <span className="text-[10px] font-semibold text-text-secondary ml-1.5 font-sans">
                          (Lot min: {prod.quantite_minimale})
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Stock State */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      sousSeuil 
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/10' 
                        : 'bg-bg text-text-secondary border border-border'
                    }`}>
                      Stock : {prod.quantite}
                    </span>
                    {sousSeuil && (
                      <span className="text-amber-600 flex items-center gap-1 text-[11px] font-semibold">
                        <AlertTriangle size={12} /> Stock bas
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions contextuelles */}
                <div className="flex flex-col gap-1 shrink-0 justify-center">
                  <button
                    onClick={() => ouvrirModale(prod)}
                    className="w-8 h-8 rounded-lg hover:bg-bg flex items-center justify-center text-text-secondary hover:text-text transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => supprimerProduit(prod.id)}
                    className="w-8 h-8 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-text-secondary hover:text-rose-600 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODALE AJOUT / MODIFICATION */}
      {modaleOuverte && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-5 my-8">
            
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">
                {produitSelectionne ? 'Modifier l\'article' : 'Nouvel article'}
              </h2>
              <button
                onClick={() => setModaleOuverte(false)}
                className="w-8 h-8 rounded-lg bg-bg hover:bg-border/50 text-text-secondary hover:text-text flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={soumettreFormulaire} className="space-y-4">
              
              {/* Infos de base */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Désignation du produit</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Robe en soie Premium"
                  className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Prix (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={prix}
                    onChange={(e) => setPrix(e.target.value)}
                    placeholder="15000"
                    className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Stock Initial</label>
                  <input
                    type="number"
                    required
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    placeholder="50"
                    className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all"
                  />
                </div>
              </div>

              {/* CONFIGURATION VITRINE CLIENT */}
              <div className="pt-3 border-t border-border space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <Globe size={14} style={{ color: accentColor }} />
                  <span>Options de la vitrine publique</span>
                </div>

                {/* Toggle En ligne */}
                <label className="flex items-center justify-between bg-bg/50 border border-border p-3 rounded-xl cursor-pointer select-none hover:bg-bg transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text block">Publier sur ma vitrine</span>
                    <span className="text-[11px] text-text-secondary block">Rendre visible cet article aux clients externes</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enLigne}
                    onChange={(e) => setEnLigne(e.target.checked)}
                    className="w-4 h-4 rounded-md border-border accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Zone Photo par Upload natif */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Photo du produit</label>
                  
                  <div className="flex items-center gap-4">
                    {/* Zone de prévisualisation */}
                    <div className="w-20 h-20 rounded-xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0 relative bg-neutral-50 dark:bg-neutral-900">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Aperçu" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-text-secondary/40" />
                      )}
                      
                      {uploadeEnCours && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                          <Loader2 size={18} className="animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Zone d'input cliquable */}
                    <label className="flex-1 flex flex-col items-center justify-center h-20 border border-dashed border-border rounded-xl cursor-pointer bg-bg/30 hover:bg-bg transition-all p-2 text-center select-none">
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={16} style={{ color: accentColor }} />
                        <span className="text-xs font-bold text-text">Choisir une image</span>
                        <span className="text-[10px] text-text-secondary">PNG, JPG (max 5Mo)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={gérerChangementFichier}
                        disabled={uploadeEnCours}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* MOQ visible EXCLUSIVEMENT pour le Groupage Alibaba */}
                  {estGroupage && (
                    <div className="space-y-1 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                        <Package size={13} />
                        <label className="uppercase tracking-wider">Quantité minimale (MOQ)</label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={quantiteMinimale}
                        onChange={(e) => setQuantiteMinimale(e.target.value)}
                        className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all font-mono font-bold"
                      />
                      <p className="text-[10px] text-text-secondary leading-relaxed">
                        Chaque ajout au panier de la cliente se fera obligatoirement par multiples de cette quantité.
                      </p>
                    </div>
                  )}

                  {/* Description Publique */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Description commerciale (Vitrine)</label>
                    <textarea
                      value={descriptionPublique}
                      onChange={(e) => setDescriptionPublique(e.target.value)}
                      placeholder="Détails du produit, tailles disponibles, matières, délais de livraison..."
                      rows={3}
                      className="w-full p-3 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seuil Alerte */}
              <div className="space-y-1 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Seuil d'alerte stock bas</label>
                <input
                  type="number"
                  value={seuilAlerte}
                  onChange={(e) => setSeuilAlerte(e.target.value)}
                  className="w-full h-11 px-4 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:bg-card transition-all"
                />
              </div>

              {/* Boutons validation */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModaleOuverte(false)}
                  className="h-11 px-4 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-text-secondary hover:bg-bg transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadeEnCours}
                  style={{ backgroundColor: accentColor }}
                  className="h-11 px-5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  Confirmer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Stock