import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Eye, EyeOff, Globe, Package, Upload, Image as ImageIcon, Loader2, Tag } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'

const TAILLES_VETEMENTS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const POINTURES_CHAUSSURES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']

function Stock() {
  const { parametres } = useParametres()
  const estGroupage = parametres?.categorie === 'groupage_alibaba'

  const [produits, setProduits] = useState([])
  const [recherche, setRecherche] = useState('')
  const [chargement, setChargement] = useState(true)
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const [produitSelectionne, setProduitSelectionne] = useState(null)

  // Formulaire State (garantis initialisés avec des chaînes ou booléens)
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [quantite, setQuantite] = useState('')
  const [seuilAlerte, setSeuilAlerte] = useState('5')
  const [enLigne, setEnLigne] = useState(false)
  const [descriptionPublique, setDescriptionPublique] = useState('')
  const [quantiteMinimale, setQuantiteMinimale] = useState('1')
  const [photoUrl, setPhotoUrl] = useState('')

  // State Variantes (Tailles & Pointures)
  const [typeVariante, setTypeVariante] = useState('aucune') // 'aucune', 'vetement', 'chaussure'
  const [variantes, setVariantes] = useState([])
  
  // Upload State
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

  function changerTypeVariante(type) {
    setTypeVariante(type)
    if (type === 'aucune') {
      setVariantes([])
    } else if (type === 'vetement') {
      setVariantes(TAILLES_VETEMENTS.map(t => ({ nom: t, quantite: 0, actif: false })))
    } else if (type === 'chaussure') {
      setVariantes(POINTURES_CHAUSSURES.map(p => ({ nom: p, quantite: 0, actif: false })))
    }
  }

  function toggleVariante(index) {
    const maj = [...variantes]
    maj[index].actif = !maj[index].actif
    if (!maj[index].actif) maj[index].quantite = 0
    setVariantes(maj)

    // Recalculer le stock total des variantes actives
    const totalVariantes = maj.reduce((sum, v) => sum + (v.actif ? Number(v.quantite || 0) : 0), 0)
    setQuantite(totalVariantes.toString())
  }

  function changerQuantiteVariante(index, qte) {
    const maj = [...variantes]
    maj[index].quantite = Math.max(0, parseInt(qte) || 0)
    setVariantes(maj)

    // Recalculer le stock total
    const totalVariantes = maj.reduce((sum, v) => sum + (v.actif ? Number(v.quantite || 0) : 0), 0)
    setQuantite(totalVariantes.toString())
  }

  function ouvrirModale(prod = null) {
    if (prod) {
      setProduitSelectionne(prod)
      setNom(prod.nom || '')
      setPrix(prod.prix != null ? prod.prix.toString() : '')
      setQuantite(prod.quantite != null ? prod.quantite.toString() : '')
      setSeuilAlerte(prod.seuil_alerte != null ? prod.seuil_alerte.toString() : '5')
      setEnLigne(Boolean(prod.en_ligne))
      setDescriptionPublique(prod.description_publique || '')
      setQuantiteMinimale(prod.quantite_minimale != null ? prod.quantite_minimale.toString() : '1')
      setPhotoUrl(prod.photo_url || '')
      setTypeVariante(prod.type_variante || 'aucune')
      setVariantes(Array.isArray(prod.variantes) ? prod.variantes : [])
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
      setTypeVariante('aucune')
      setVariantes([])
    }
    setModaleOuverte(true)
  }

  async function gérerChangementFichier(e) {
    const fichier = e.target.files[0]
    if (!fichier) return

    try {
      setUploadeEnCours(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const extensionFichier = fichier.name.split('.').pop()
      const nomFichierUnique = `${user.id}/${Date.now()}.${extensionFichier}`

      const { error } = await supabase.storage
        .from('photos-produits')
        .upload(nomFichierUnique, fichier, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('photos-produits')
        .getPublicUrl(nomFichierUnique)

      setPhotoUrl(publicUrl || '')
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

      // Filtrer uniquement les variantes sélectionnées
      const variantesActives = typeVariante !== 'aucune' 
        ? variantes.filter(v => v.actif).map(v => ({ nom: v.nom, quantite: Number(v.quantite) || 0 }))
        : []

      const payload = {
        nom: nom.trim(),
        prix: parseFloat(prix) || 0,
        quantite: parseInt(quantite) || 0,
        seuil_alerte: parseInt(seuilAlerte) || 5,
        en_ligne: enLigne,
        description_publique: descriptionPublique.trim(),
        quantite_minimale: estGroupage ? Math.max(1, parseInt(quantiteMinimale) || 1) : 1,
        photo_url: photoUrl,
        type_variante: typeVariante,
        variantes: variantesActives,
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
    (p.nom || '').toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 text-text transition-colors duration-150">
      
      {/* En-tête & Bouton Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">Catalogue & Stock</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Gère ton inventaire, déclinaisons et publications</p>
        </div>
        <button
          onClick={() => ouvrirModale()}
          className="flex items-center justify-center gap-2 bg-cta text-white font-bold text-xs px-4 sm:px-5 h-10 sm:h-11 rounded-xl shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer uppercase tracking-wider w-full sm:w-auto"
        >
          <Plus size={16} />
          <span>Ajouter un article</span>
        </button>
      </div>

      {/* Barre de Recherche */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-3 text-text-secondary" size={16} />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={recherche || ''}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full h-10 sm:h-11 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
        />
      </div>

      {/* Liste / Grille des Produits */}
      {chargement ? (
        <div className="py-20 text-center text-text-secondary text-xs font-bold uppercase tracking-wider">
          Chargement de la réserve...
        </div>
      ) : produitsFiltres.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <p className="text-sm text-text-secondary">Aucun article trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {produitsFiltres.map((prod) => {
            const sousSeuil = prod.quantite <= (prod.seuil_alerte || 5)
            const aDesVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0

            return (
              <div
                key={prod.id}
                className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 flex gap-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 relative group"
              >
                {/* Miniature Image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary font-bold text-lg overflow-hidden shrink-0">
                  {prod.photo_url ? (
                    <img src={prod.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (prod.nom || 'P').charAt(0).toUpperCase()
                  )}
                </div>

                {/* Corps de la carte */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-sm text-text truncate max-w-[160px] sm:max-w-[200px]">{prod.nom}</h3>
                      
                      {prod.en_ligne ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                          <Eye size={10} /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-surface-muted text-text-secondary rounded-md">
                          <EyeOff size={10} /> Privé
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-semibold text-cta">
                      {(prod.prix || 0).toLocaleString('fr-FR')} FCFA
                    </p>

                    {/* Affichage des tailles/pointures disponibles */}
                    {aDesVariantes && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {prod.variantes.map((v, i) => (
                          <span key={i} className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-bg border border-border rounded-md text-text-secondary">
                            {prod.type_variante === 'vetement' ? `T. ${v.nom}` : `P. ${v.nom}`}: <strong className="text-text">{v.quantite}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Statut du Stock */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                      sousSeuil 
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                        : 'bg-bg text-text-secondary border-border'
                    }`}>
                      Stock Total : {prod.quantite}
                    </span>
                    {sousSeuil && (
                      <span className="text-amber-600 flex items-center gap-1 text-[11px] font-semibold">
                        <AlertTriangle size={12} /> Stock bas
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions contextuelles */}
                <div className="flex flex-col gap-1 shrink-0 justify-center border-l border-border/50 pl-2">
                  <button
                    onClick={() => ouvrirModale(prod)}
                    className="w-8 h-8 rounded-lg hover:bg-bg flex items-center justify-center text-text-secondary hover:text-text transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => supprimerProduit(prod.id)}
                    className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center text-text-secondary hover:text-error transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl space-y-4 my-8">
            
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base sm:text-lg font-bold text-text">
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
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">Désignation du produit</label>
                <input
                  type="text"
                  required
                  value={nom || ''}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Basket Running / Robe de soirée"
                  className="w-full h-10 sm:h-11 px-3.5 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
                />
              </div>

              {/* SECTION TAILLES ET POINTURES */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <Tag size={14} className="text-brand" />
                  <span>Déclinaisons (Tailles / Pointures)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => changerTypeVariante('aucune')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      typeVariante === 'aucune' ? 'bg-brand text-white border-brand' : 'bg-bg text-text-secondary border-border hover:bg-card'
                    }`}
                  >
                    Taille unique
                  </button>
                  <button
                    type="button"
                    onClick={() => changerTypeVariante('vetement')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      typeVariante === 'vetement' ? 'bg-brand text-white border-brand' : 'bg-bg text-text-secondary border-border hover:bg-card'
                    }`}
                  >
                     Vêtements (S, M...)
                  </button>
                  <button
                    type="button"
                    onClick={() => changerTypeVariante('chaussure')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      typeVariante === 'chaussure' ? 'bg-brand text-white border-brand' : 'bg-bg text-text-secondary border-border hover:bg-card'
                    }`}
                  >
                     Chaussures (38, 39...)
                  </button>
                </div>

                {/* Saisie des quantités par taille/pointure */}
                {typeVariante !== 'aucune' && (
                  <div className="bg-bg/50 border border-border p-3 rounded-xl space-y-2.5">
                    <p className="text-[11px] text-text-secondary">
                      Coche les options disponibles et indique leur stock :
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {variantes.map((v, idx) => (
                        <div
                          key={v.nom}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 transition-all ${
                            v.actif ? 'border-brand bg-brand/5' : 'border-border/60 bg-bg opacity-50'
                          }`}
                        >
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(v.actif)}
                              onChange={() => toggleVariante(idx)}
                              className="rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                            />
                            <span>{typeVariante === 'vetement' ? `T. ${v.nom}` : `P. ${v.nom}`}</span>
                          </label>

                          {v.actif && (
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={v.quantite != null ? v.quantite : ''}
                              onChange={(e) => changerQuantiteVariante(idx, e.target.value)}
                              className="w-14 h-7 px-1 text-xs font-mono font-bold bg-card border border-border rounded-md text-center text-text outline-none focus:border-brand"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">Prix unitaire (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={prix || ''}
                    onChange={(e) => setPrix(e.target.value)}
                    placeholder="15000"
                    className="w-full h-10 sm:h-11 px-3.5 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                    {typeVariante !== 'aucune' ? 'Stock Total (Calculé)' : 'Stock Initial'}
                  </label>
                  <input
                    type="number"
                    required
                    readOnly={typeVariante !== 'aucune'}
                    value={quantite || ''}
                    onChange={(e) => setQuantite(e.target.value)}
                    placeholder="50"
                    className={`w-full h-10 sm:h-11 px-3.5 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all font-mono font-bold ${
                      typeVariante !== 'aucune' ? 'bg-surface-muted/50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* CONFIGURATION VITRINE CLIENT */}
              <div className="pt-3 border-t border-border space-y-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <Globe size={14} className="text-brand" />
                  <span>Options de la vitrine publique</span>
                </div>

                <label className="flex items-center justify-between bg-bg/50 border border-border p-3 rounded-xl cursor-pointer select-none hover:bg-bg transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text block">Publier sur ma vitrine</span>
                    <span className="text-[11px] text-text-secondary block">Rendre visible cet article aux clients</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enLigne}
                    onChange={(e) => setEnLigne(e.target.checked)}
                    className="w-4 h-4 rounded-md border-border accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Upload Photo */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">Photo du produit</label>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0 relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Aperçu" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-text-secondary/40" />
                      )}
                      
                      {uploadeEnCours && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                          <Loader2 size={16} className="animate-spin" />
                        </div>
                      )}
                    </div>

                    <label className="flex-1 flex flex-col items-center justify-center h-16 border border-dashed border-border rounded-xl cursor-pointer bg-bg/30 hover:bg-bg transition-all p-2 text-center select-none">
                      <div className="flex items-center gap-2">
                        <Upload size={14} className="text-brand" />
                        <span className="text-xs font-bold text-text">Choisir une image</span>
                      </div>
                      <span className="text-[10px] text-text-secondary mt-0.5">PNG, JPG (max 5Mo)</span>
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

                {/* MOQ si Alibaba */}
                {estGroupage && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                      <Package size={13} />
                      <label className="uppercase tracking-wider">Quantité minimale (MOQ)</label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={quantiteMinimale || ''}
                      onChange={(e) => setQuantiteMinimale(e.target.value)}
                      className="w-full h-10 px-3.5 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all font-mono font-bold"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">Description commerciale</label>
                  <textarea
                    value={descriptionPublique || ''}
                    onChange={(e) => setDescriptionPublique(e.target.value)}
                    placeholder="Détails du produit, matières, conseils d'entretien..."
                    rows={2}
                    className="w-full p-3 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Seuil Alerte */}
              <div className="space-y-1 pt-2 border-t border-border">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">Seuil d'alerte stock bas</label>
                <input
                  type="number"
                  value={seuilAlerte || ''}
                  onChange={(e) => setSeuilAlerte(e.target.value)}
                  className="w-full h-10 px-3.5 bg-bg border border-border rounded-xl text-sm text-text outline-none focus:border-brand/50 transition-all"
                />
              </div>

              {/* Actions Modale */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModaleOuverte(false)}
                  className="h-10 px-4 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-text-secondary hover:bg-bg transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadeEnCours}
                  className="h-10 px-5 rounded-xl bg-cta text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
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