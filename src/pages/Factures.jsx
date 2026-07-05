import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Download, Share2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { useParametres } from '../contexts/ParametresContext'

// Convertit une image accessible par URL en dataURL utilisable par jsPDF
async function urlVersDataUrl(url) {
  const reponse = await fetch(url)
  const blob = await reponse.blob()
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resoudre(lecteur.result)
    lecteur.onerror = rejeter
    lecteur.readAsDataURL(blob)
  })
}

// Convertit une couleur hex (#RRGGBB) en [r, g, b] pour jsPDF
function hexVersRgb(hex) {
  const nettoye = (hex || '#635BFF').replace('#', '')
  const valeur = parseInt(nettoye, 16)
  return [(valeur >> 16) & 255, (valeur >> 8) & 255, valeur & 255]
}

// Formate un montant en séparant les milliers par un espace normal.
function formaterMontant(nombre) {
  const arrondi = Math.round(Number(nombre) || 0)
  return arrondi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Libellés des statuts affichés sur la facture
const LIBELLES_STATUT = {
  en_attente: 'En attente de paiement',
  payee: 'Payée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
}

function libelleStatut(statut) {
  if (LIBELLES_STATUT[statut]) return LIBELLES_STATUT[statut]
  if (!statut) return 'En attente de paiement'
  const texte = statut.replace(/_/g, ' ')
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

function Factures() {
  const { parametres } = useParametres()
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [partageEnCours, setPartageEnCours] = useState(null)

  useEffect(() => {
    async function fetchCommandes() {
      setLoading(true)
      const { data } = await supabase
        .from('commandes')
        .select('*, clients(nom, telephone, adresse), commande_items(*, produits(nom))')
        .order('created_at', { ascending: false })

      setCommandes(data || [])
      setLoading(false)
    }

    fetchCommandes()
  }, [])

  // Construit le PDF et retourne le document jsPDF (sans le sauvegarder ni le partager)
  async function construireFacturePDF(commande) {
    const doc = new jsPDF()
    const numeroFacture = commande.id.slice(0, 8).toUpperCase()
    const [r, g, b] = hexVersRgb(parametres.accent_color)
    const largeurPage = 210
    const marge = 14

    // ===== Bandeau d'en-tête coloré =====
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, largeurPage, 42, 'F')

    let xTexte = marge

    if (parametres.logo_url) {
      try {
        const dataUrl = await urlVersDataUrl(parametres.logo_url)
        let format = dataUrl.match(/data:image\/(\w+);/)?.[1]?.toUpperCase() || 'PNG'
        if (format === 'JPG') format = 'JPEG'
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(marge, 9, 24, 24, 3, 3, 'F')
        doc.addImage(dataUrl, format, marge + 3, 12, 18, 18)
        xTexte = marge + 30
      } catch {
        // Si le logo ne charge pas, on continue sans bloquer la génération de la facture
      }
    }

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(17)
    doc.setFont('helvetica', 'bold')
    doc.text(parametres.nom_boutique || 'Ma Boutique', xTexte, 20)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const contact = [parametres.telephone, parametres.adresse].filter(Boolean).join('  ·  ')
    if (contact) doc.text(contact, xTexte, 27)

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', largeurPage - marge, 18, { align: 'right' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`N° ${numeroFacture}`, largeurPage - marge, 25, { align: 'right' })
    doc.text(new Date(commande.created_at).toLocaleDateString('fr-FR'), largeurPage - marge, 31, {
      align: 'right',
    })

    doc.setTextColor(0, 0, 0)

    // ===== Infos client =====
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(130, 130, 130)
    doc.text('FACTURÉ À', marge, 54)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(commande.clients?.nom || 'Client non renseigné', marge, 61)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (commande.clients?.telephone) {
      doc.text(commande.clients.telephone, marge, 66.5)
    }

    // ===== Badge de statut =====
    const libelle = libelleStatut(commande.statut)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const largeurBadge = doc.getTextWidth(libelle) + 10
    doc.setFillColor(248, 248, 250)
    doc.roundedRect(largeurPage - marge - largeurBadge, 50, largeurBadge, 8, 2, 2, 'F')
    doc.setDrawColor(r, g, b)
    doc.roundedRect(largeurPage - marge - largeurBadge, 50, largeurBadge, 8, 2, 2, 'S')
    doc.setTextColor(r, g, b)
    doc.text(libelle, largeurPage - marge - largeurBadge / 2, 55.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    // ===== Tableau des produits =====
    let y = 82
    const xProduit = marge
    const xQte = 122
    const xPrixUnit = 152
    const xTotal = largeurPage - marge
    const largeurColonneProduit = xQte - xProduit - 4

    doc.setFillColor(245, 245, 247)
    doc.rect(marge, y - 6, largeurPage - marge * 2, 9, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(90, 90, 90)
    doc.text('PRODUIT', xProduit + 2, y)
    doc.text('QTÉ', xQte, y, { align: 'right' })
    doc.text('PRIX UNIT.', xPrixUnit, y, { align: 'right' })
    doc.text('TOTAL', xTotal, y, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    commande.commande_items?.forEach((item, index) => {
      const nomProduit = item.produits?.nom || 'Produit'
      const lignesNom = doc.splitTextToSize(nomProduit, largeurColonneProduit)
      const hauteurLigne = 7 * Math.max(lignesNom.length, 1)

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 251)
        doc.rect(marge, y - 5, largeurPage - marge * 2, hauteurLigne, 'F')
      }

      doc.text(lignesNom, xProduit + 2, y)
      doc.text(String(item.quantite), xQte, y, { align: 'right' })
      doc.text(`${formaterMontant(item.prix_unitaire)} FCFA`, xPrixUnit, y, { align: 'right' })
      doc.text(`${formaterMontant(item.quantite * item.prix_unitaire)} FCFA`, xTotal, y, {
        align: 'right',
      })

      y += hauteurLigne
    })

    y += 3
    doc.setDrawColor(225, 225, 228)
    doc.line(marge, y, largeurPage - marge, y)
    y += 12

    // ===== Total à payer =====
    doc.setFillColor(r, g, b)
    doc.roundedRect(largeurPage - marge - 78, y - 8, 78, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL À PAYER', largeurPage - marge - 73, y)
    doc.setFontSize(12)
    doc.text(`${formaterMontant(commande.total)} FCFA`, largeurPage - marge - 4, y, {
      align: 'right',
    })
    doc.setTextColor(0, 0, 0)

    // ===== Pied de page =====
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text('Merci pour votre confiance.', marge, 280)
    if (parametres.nom_boutique) {
      doc.text(parametres.nom_boutique, largeurPage - marge, 280, { align: 'right' })
    }

    return { doc, numeroFacture }
  }

  async function telechargerFacture(commande) {
    const { doc, numeroFacture } = await construireFacturePDF(commande)
    doc.save(`Facture-${numeroFacture}.pdf`)
  }

  async function partagerFacture(commande) {
    setPartageEnCours(commande.id)
    try {
      const { doc, numeroFacture } = await construireFacturePDF(commande)
      const blob = doc.output('blob')
      const nomFichier = `Facture-${numeroFacture}.pdf`
      const fichier = new File([blob], nomFichier, { type: 'application/pdf' })

      // Sur mobile (Android/iOS), ceci ouvre le menu de partage natif
      // (WhatsApp, SMS, Mail, Bluetooth...) avec le PDF en pièce jointe
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        await navigator.share({
          files: [fichier],
          title: nomFichier,
          text: `Voici votre facture de ${parametres.nom_boutique || 'notre boutique'}.`,
        })
      } else {
        // Ordinateur ou navigateur qui ne supporte pas le partage de fichiers :
        // on se rabat simplement sur le téléchargement
        doc.save(nomFichier)
      }
    } catch (err) {
      // L'utilisateur peut annuler le partage (ex: appuie sur "Annuler") :
      // ce n'est pas une vraie erreur, on ignore silencieusement dans ce cas
      if (err?.name !== 'AbortError') {
        alert('Erreur lors du partage : ' + err.message)
      }
    } finally {
      setPartageEnCours(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">Factures</h1>
      <p className="text-text-secondary mt-1">Génère et envoie tes factures</p>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm">Chargement...</p>
        ) : commandes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary text-sm">Aucune commande pour le moment.</p>
          </div>
        ) : (
          commandes.map((commande) => (
            <div
              key={commande.id}
              className="flex items-center justify-between bg-card border border-border rounded-xl p-4 gap-2"
            >
              <div>
                <p className="font-medium text-text">
                  {commande.clients?.nom || 'Client non renseigné'}
                </p>
                <p className="text-sm text-text-secondary">
                  {new Date(commande.created_at).toLocaleDateString('fr-FR')} ·{' '}
                  {commande.total.toLocaleString()} FCFA
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => telechargerFacture(commande)}
                  title="Télécharger le PDF"
                  className="flex items-center gap-2 bg-card border border-border hover:bg-bg text-text px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => partagerFacture(commande)}
                  disabled={partageEnCours === commande.id}
                  title="Partager (WhatsApp, SMS, Mail...)"
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Share2 size={16} />
                  {partageEnCours === commande.id ? '...' : 'Partager'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Factures