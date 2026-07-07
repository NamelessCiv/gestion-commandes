import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingCart, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, ArrowLeft, AlertCircle, MessageCircle, Clock } from 'lucide-react';

export default function Vitrine() {
  // ✅ CORRECTIF 1 : la route est définie comme "/boutique/:lien_public" dans App.jsx
  // useParams() retourne donc une clé "lien_public" (et non "lienPublic")
  const { lien_public: lienPublic } = useParams();

  const [boutique, setBoutique] = useState(null);
  const [boutiqueExiste, setBoutiqueExiste] = useState(true);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [produitSelectionne, setProduitSelectionne] = useState(null);

  const [panier, setPanier] = useState([]);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [nomClient, setNomClient] = useState('');
  const [telephoneClient, setTelephoneClient] = useState('');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [commandeSoumise, setCommandeSoumise] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurCommande, setErreurCommande] = useState(null);
  const [dernierBonCommande, setDernierBonCommande] = useState(null); // snapshot pour le message WhatsApp

  async function chargerBoutique() {
    setLoading(true);
    setErreur(null);
    try {
      // On récupère toutes les colonnes (logo, couleur, whatsapp, catégorie, etc.)
      const { data, error } = await supabase
        .from('parametres_boutique')
        .select('*');

      if (error) throw error;

      const boutiqueTrouvee = data.find((b) => b.lien_public === lienPublic);

      if (boutiqueTrouvee) {
        setBoutique(boutiqueTrouvee);
        setBoutiqueExiste(true);

        const { data: articles, error: erreurArticles } = await supabase
          .from('produits')
          .select('*')
          .eq('user_id', boutiqueTrouvee.user_id);

        if (erreurArticles) throw erreurArticles;
        setProduits(articles || []);
      } else {
        setBoutiqueExiste(false);
      }
    } catch (err) {
      console.error('Erreur :', err);
      // On distingue une vraie coupure réseau d'une erreur serveur/config
      const estHorsLigne = typeof navigator !== 'undefined' && !navigator.onLine;
      setErreur(
        estHorsLigne
          ? "Tu sembles hors ligne. Vérifie ta connexion internet et réessaie."
          : "Impossible de charger la boutique pour le moment. Réessaie dans un instant."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (lienPublic) chargerBoutique();
  }, [lienPublic]);

  // ✅ CORRECTIF 2 : la fonction utilisée par le bouton "Ajouter au panier" n'existait pas
  const ajouterAuPanier = (produit) => {
    setPanier((prev) => {
      const existant = prev.find((item) => item.id === produit.id);
      if (existant) {
        return prev.map((item) =>
          item.id === produit.id ? { ...item, quantite: item.quantite + 1 } : item
        );
      }
      const qteMin =
        boutique?.categorie === 'groupage_alibaba' ? produit.quantite_minimale || 1 : 1;
      return [...prev, { ...produit, quantite: qteMin }];
    });
    setProduitSelectionne(null);
  };

  const modifierQuantite = (id, delta) => {
    setPanier((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nouvelleQte = item.quantite + delta;
            const qteMin =
              boutique?.categorie === 'groupage_alibaba' ? item.quantite_minimale || 1 : 1;
            if (nouvelleQte < qteMin) return null;
            return { ...item, quantite: nouvelleQte };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const supprimerDuPanier = (id) => {
    setPanier((prev) => prev.filter((item) => item.id !== id));
  };

  const calculerTotal = () => {
    return panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
  };

  // Construit le texte du bon de commande pour WhatsApp
  const genererMessageWhatsApp = (bon) => {
    const lignesProduits = bon.produits
      .map((p) => `• ${p.nom} x${p.quantite} — ${(p.prix * p.quantite).toLocaleString('fr-FR')} F`)
      .join('\n');

    const dateFormatee = new Date(bon.date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      `🛍️ *Nouvelle commande - ${boutique?.nom_boutique || ''}*\n` +
      (bon.numero ? `Commande n° ${bon.numero} — ${dateFormatee}\n\n` : `${dateFormatee}\n\n`) +
      `👤 Client : ${bon.nom}\n` +
      `📞 Téléphone : ${bon.telephone}\n` +
      `📍 Adresse de livraison : ${bon.adresse}\n\n` +
      `🧾 Détails de la commande :\n${lignesProduits}\n\n` +
      `💰 Total : ${bon.total.toLocaleString('fr-FR')} FCFA\n\n` +
      `Merci de confirmer la disponibilité et le délai de livraison. 🙏`
    );
  };

  const lienWhatsApp = (bon) => {
    const numero = (boutique?.numero_whatsapp || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(genererMessageWhatsApp(bon));
    return `https://wa.me/${numero}?text=${message}`;
  };

  // SOUMISSION DE LA COMMANDE
  const validerCommande = async (e) => {
    e.preventDefault();
    setErreurCommande(null);
    if (!nomClient || !telephoneClient || !adresseLivraison || panier.length === 0) {
      setErreurCommande('Merci de remplir tous les champs avant de valider.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const totalCommande = calculerTotal();
      const produitsCommande = panier.map((item) => ({
        id: item.id,
        nom: item.nom,
        quantite: item.quantite,
        prix: item.prix,
      }));

      const { data: commandeCreee, error } = await supabase
        .from('commandes')
        .insert([
          {
            user_id: boutique.user_id,
            nom_client: nomClient,
            telephone_client: telephoneClient,
            adresse_livraison: adresseLivraison,
            total: totalCommande,
            statut: 'en_attente',
            produits: produitsCommande,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // On garde une "photo" de la commande pour construire le message WhatsApp
      setDernierBonCommande({
        numero: commandeCreee?.id ? String(commandeCreee.id).slice(0, 8).toUpperCase() : null,
        date: commandeCreee?.created_at || new Date().toISOString(),
        nom: nomClient,
        telephone: telephoneClient,
        adresse: adresseLivraison,
        total: totalCommande,
        produits: produitsCommande,
      });

      setCommandeSoumise(true);
      setPanier([]);
      setNomClient('');
      setTelephoneClient('');
      setAdresseLivraison('');
    } catch (err) {
      console.error('Erreur lors de la validation de la commande :', err);
      const estHorsLigne = typeof navigator !== 'undefined' && !navigator.onLine;
      setErreurCommande(
        estHorsLigne
          ? "Tu sembles hors ligne. Vérifie ta connexion et réessaie."
          : "L'envoi de la commande a échoué. Vérifie tes informations et réessaie."
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // VÉRIFICATIONS D'ÉCRANS PRIORITAIRES
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500">Chargement de la vitrine...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-3xs mb-4">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-xl font-black text-gray-900">Oups, une erreur est survenue</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-xs leading-relaxed">{erreur}</p>
        <button
          onClick={chargerBoutique}
          className="mt-5 bg-gray-900 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md hover:opacity-90 transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!boutiqueExiste) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-3xs mb-4">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-xl font-black text-gray-900">Boutique introuvable</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-xs leading-relaxed">
          Cette boutique n'existe pas ou l'identifiant de son adresse URL est incorrect.
        </p>
      </div>
    );
  }

  const accentColor = boutique?.accent_color || '#493ee5';

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24" style={{ '--color-accent': accentColor }}>
      {/* En-tête Boutique : nom de la boutique mère bien mis en avant */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-4 shadow-3xs flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          {boutique?.logo_url ? (
            <img src={boutique.logo_url} alt="Logo" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg"
              style={{ backgroundColor: accentColor }}
            >
              {boutique?.nom_boutique?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-black text-gray-900 truncate">{boutique?.nom_boutique}</h1>
            <p className="text-[11px] text-gray-400 font-medium">Boutique en ligne</p>
          </div>
        </div>

        {/* Bouton Panier */}
        <button
          onClick={() => { setPanierOuvert(true); setErreurCommande(null); }}
          className="relative p-3 bg-gray-900 text-white rounded-xl shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <ShoppingCart size={18} />
          {panier.length > 0 && (
            <span className="bg-[var(--color-accent)] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {panier.reduce((sum, item) => sum + item.quantite, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Grille de produits — style marketplace, responsive mobile/desktop */}
      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">Nos articles disponibles</h2>

        {produits.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-12">Aucun produit n'est disponible sur cette vitrine pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {produits.map((p) => (
              <div
                key={p.id}
                onClick={() => setProduitSelectionne(p)}
                className="bg-white rounded-2xl border border-gray-100 shadow-3xs hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden group"
              >
                <div className="relative">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.nom}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                      <ShoppingBag size={28} className="text-gray-300" />
                    </div>
                  )}

                  {/* Ajout rapide au panier — visible sur toutes les tailles d'écran */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      ajouterAuPanier(p);
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-all"
                    aria-label="Ajouter au panier"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h3 className="font-bold text-gray-950 text-xs md:text-sm line-clamp-2">{p.nom}</h3>

                  {/* Description visible uniquement à partir du format tablette/desktop */}
                  {p.description_publique && (
                    <p className="hidden md:block text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                      {p.description_publique}
                    </p>
                  )}

                  <span className="mt-auto pt-2 font-mono font-black text-sm text-[var(--color-accent)]">
                    {p.prix.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL APERÇU PRODUIT */}
      {produitSelectionne && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom duration-200">
            {produitSelectionne.photo_url && (
              <img src={produitSelectionne.photo_url} alt={produitSelectionne.nom} className="w-full aspect-square object-cover rounded-2xl" />
            )}
            <h2 className="text-xl font-black text-gray-950">{produitSelectionne.nom}</h2>
            <p className="text-lg font-mono font-black text-[var(--color-accent)]">{produitSelectionne.prix.toLocaleString('fr-FR')} FCFA</p>

            {boutique?.categorie === 'groupage_alibaba' && produitSelectionne.quantite_minimale && (
              <p className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl inline-block">
                Quantité minimale : {produitSelectionne.quantite_minimale} pièces
              </p>
            )}
            {produitSelectionne.description_publique && (
              <p className="text-gray-500 text-xs leading-relaxed">{produitSelectionne.description_publique}</p>
            )}

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setProduitSelectionne(null)}
                className="w-1/3 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase"
              >
                Fermer
              </button>
              <button
                onClick={() => ajouterAuPanier(produitSelectionne)}
                className="w-2/3 bg-[var(--color-accent)] text-white font-bold py-3 rounded-xl text-xs uppercase shadow-md flex items-center justify-center gap-2"
              >
                <ShoppingBag size={14} /> Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIROIR DU PANIER */}
      {panierOuvert && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-950 flex items-center gap-2"><ShoppingCart size={20} /> Mon panier</h2>
                <button
                  onClick={() => {
                    setPanierOuvert(false);
                    if (commandeSoumise) setCommandeSoumise(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>

              {commandeSoumise ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={26} />
                  </div>
                  <h3 className="text-base font-black text-gray-900">Commande en attente</h3>
                  {dernierBonCommande?.numero && (
                    <p className="text-[11px] font-mono font-bold text-gray-400">N° {dernierBonCommande.numero}</p>
                  )}
                  <p className="text-xs text-gray-500 leading-relaxed px-2">
                    Ta commande a bien été enregistrée. Pour qu'elle soit traitée rapidement,
                    envoie le bon de commande à la boutique sur WhatsApp en cliquant ci-dessous.
                  </p>

                  {dernierBonCommande && boutique?.numero_whatsapp && (
                    <a
                      href={lienWhatsApp(dernierBonCommande)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} /> Envoyer le bon de commande sur WhatsApp
                    </a>
                  )}

                  {!boutique?.numero_whatsapp && (
                    <p className="text-[11px] text-red-400 font-medium px-2">
                      Cette boutique n'a pas encore renseigné de numéro WhatsApp.
                    </p>
                  )}

                  <button
                    onClick={() => { setCommandeSoumise(false); setPanierOuvert(false); }}
                    className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase mt-2"
                  >
                    Retourner à la boutique
                  </button>
                </div>
              ) : panier.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-16">Ton panier est vide pour le moment.</p>
              ) : (
                <div className="space-y-4 mt-4 divide-y divide-gray-50">
                  {panier.map((item) => (
                    <div key={item.id} className="flex gap-3 pt-4 first:pt-0 items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.photo_url && <img src={item.photo_url} alt={item.nom} className="w-10 h-10 rounded-xl object-cover" />}
                        <div>
                          <h4 className="font-bold text-gray-950 text-xs line-clamp-1">{item.nom}</h4>
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">{item.prix.toLocaleString('fr-FR')} F</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                          <button onClick={() => modifierQuantite(item.id, -1)} className="p-1.5 text-gray-600"><Minus size={12} /></button>
                          <span className="font-mono font-bold text-xs px-2 text-gray-900">{item.quantite}</span>
                          <button onClick={() => modifierQuantite(item.id, 1)} className="p-1.5 text-gray-600"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => supprimerDuPanier(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}

                  {/* FORMULAIRE DE VALIDATION */}
                  <form onSubmit={validerCommande} className="pt-6 space-y-4 border-t border-gray-100 mt-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Finaliser ma commande</h3>

                    {erreurCommande && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-xl p-3">
                        {erreurCommande}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Nom complet</label>
                        <input required type="text" placeholder="Ex: Jean Yves" value={nomClient} onChange={(e) => { setNomClient(e.target.value); setErreurCommande(null); }} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-300" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Numéro WhatsApp / Téléphone</label>
                        <input required type="tel" placeholder="Ex: 0700000000" value={telephoneClient} onChange={(e) => { setTelephoneClient(e.target.value); setErreurCommande(null); }} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-300" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Adresse de livraison</label>
                        <input required type="text" placeholder="Ex: Cocody, Riviera 2, Abidjan" value={adresseLivraison} onChange={(e) => { setAdresseLivraison(e.target.value); setErreurCommande(null); }} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-300" />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center mt-4">
                      <span className="text-xs font-bold text-gray-500">Total Net :</span>
                      <span className="font-mono font-black text-base text-[var(--color-accent)]">{calculerTotal().toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <button
                      type="submit"
                      disabled={envoiEnCours}
                      className="w-full bg-[var(--color-accent)] text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {envoiEnCours ? 'Validation...' : 'Confirmer ma commande'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}