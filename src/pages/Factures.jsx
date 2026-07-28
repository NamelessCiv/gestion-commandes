import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Download, Share2, FileText, Loader2, Printer, MapPin, Phone, Building2, CheckCircle2 } from 'lucide-react'
import { useParametres } from '../contexts/ParametresContext'

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Factures() {
  const { parametres } = useParametres()

  const [commandes, setCommandes] = useState([])
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function chargerFactures() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('commandes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      setCommandes(data || [])
      if (data && data.length > 0) setCommandeSelectionnee(data[0])
      setLoading(false)
    }
    chargerFactures()
  }, [])

  // Action d'impression / Téléchargement PDF
  const imprimerFacture = () => {
    window.print()
  }

  // Action Partager (WhatsApp ou API Web Share)
  const partagerFacture = async () => {
    if (!commandeSelectionnee) return
    const numFacture = `FAC-${new Date(commandeSelectionnee.created_at).getFullYear()}-${String(commandeSelectionnee.id).slice(0, 6).toUpperCase()}`
    const textePartage = `*FACTURE ${numFacture}*\nBoutique : ${parametres?.nom_boutique || 'Ma Boutique'}\nClient : ${commandeSelectionnee.nom_client || 'Client'}\nMontant total : ${formaterMontant(commandeSelectionnee.total)} FCFA\n\nMerci pour votre confiance !`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Facture ${numFacture}`,
          text: textePartage,
        })
      } catch {
        // Fallback si annulation
      }
    } else {
      // Redirection WhatsApp par défaut
      const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textePartage)}`
      window.open(urlWhatsapp, '_blank')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 text-text max-w-6xl mx-auto">
      
      {/* En-tête de la page (Caché à l'impression) */}
      <div className="print:hidden">
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-text flex items-center gap-2">
          <FileText size={24} className="text-brand" /> Factures & Reçus Commerciaux
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
          Génère, imprime et partage des factures normalisées conformes aux normes commerciales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
        
        {/* Liste des factures (Cachée à l'impression) */}
        <div className="lg:col-span-4 space-y-2 max-h-[75vh] overflow-y-auto pr-1 print:hidden">
          {loading ? (
            <div className="py-12 text-center text-text-secondary text-xs font-bold uppercase tracking-wider">
              <Loader2 size={20} className="animate-spin mx-auto mb-2 text-brand" />
              Chargement des factures...
            </div>
          ) : commandes.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-card/40 text-xs text-text-secondary">
              Aucun historique de vente disponible.
            </div>
          ) : (
            commandes.map((cmd) => {
              const estSélectionné = commandeSelectionnee?.id === cmd.id
              const numFacture = `FAC-${new Date(cmd.created_at).getFullYear()}-${String(cmd.id).slice(0, 6).toUpperCase()}`
              return (
                <button
                  key={cmd.id}
                  onClick={() => setCommandeSelectionnee(cmd)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1 cursor-pointer ${
                    estSélectionné
                      ? 'bg-card border-brand shadow-card ring-1 ring-brand/20'
                      : 'bg-card/40 border-border hover:bg-card'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono font-bold text-text text-xs">{numFacture}</span>
                    <span className="font-mono font-bold text-cta text-xs chiffres">{formaterMontant(cmd.total)} F</span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-0.5 text-[11px] text-text-secondary">
                    <span className="truncate max-w-[140px]">{cmd.nom_client || 'Client anonyme'}</span>
                    <span className="shrink-0">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Aperçu & Zone d'Impression Facture Normalisée */}
        <div className="lg:col-span-8 print:w-full">
          {commandeSelectionnee ? (
            <div className="space-y-4">
              
              {/* Actions Rapides (Masquées à l'impression) */}
              <div className="flex items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl print:hidden">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider pl-2 hidden sm:inline">
                  Aperçu Document
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={partagerFacture}
                    className="flex-1 sm:flex-none bg-cta text-white font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    <Share2 size={15} /> Partager
                  </button>
                  <button
                    onClick={imprimerFacture}
                    className="flex-1 sm:flex-none bg-brand text-white font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    <Printer size={15} /> Imprimer / PDF
                  </button>
                </div>
              </div>

              {/* DOCUMENT FACTURE COMMERCIAL (Zone Imprimable A4) */}
              <div 
                id="zone-facture"
                className="bg-white text-gray-900 border border-gray-200 print:border-none rounded-2xl p-6 sm:p-10 shadow-modal print:shadow-none print:p-0 space-y-8 font-sans"
              >
                
                {/* 1. EN-TÊTE COMMERCIAL & NUMÉRO FACTURE */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950 text-white flex items-center justify-center font-bold text-sm">
                        {(parametres?.nom_boutique || 'MB').slice(0, 2).toUpperCase()}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                        {parametres?.nom_boutique || 'MA BOUTIQUE'}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Commerce & Distribution</p>
                    <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                      {parametres?.adresse && (
                        <p className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-400 shrink-0" />
                          <span>{parametres.adresse}</span>
                        </p>
                      )}
                      {parametres?.telephone && (
                        <p className="flex items-center gap-1.5">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          <span>(+225) {parametres.telephone}</span>
                        </p>
                      )}
                      {(parametres?.rccm || parametres?.dfu) && (
                        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-0.5">
                          <Building2 size={12} className="text-gray-400 shrink-0" />
                          <span>
                            {parametres?.rccm ? `RCCM: ${parametres.rccm}` : ''} 
                            {parametres?.rccm && parametres?.dfu ? ' | ' : ''}
                            {parametres?.dfu ? `DFU: ${parametres.dfu}` : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Numéro et Date de Facture */}
                  <div className="text-left sm:text-right space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100 sm:bg-transparent sm:p-0 sm:border-none w-full sm:w-auto">
                    <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-900 text-[11px] font-bold uppercase tracking-wider rounded-md mb-1">
                      Facture Commerciale
                    </span>
                    <h3 className="text-base sm:text-lg font-mono font-bold text-gray-900">
                      FAC-{new Date(commandeSelectionnee.created_at).getFullYear()}-{String(commandeSelectionnee.id).slice(0, 6).toUpperCase()}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Date d'émission : <span className="font-semibold text-gray-700">{new Date(commandeSelectionnee.created_at).toLocaleDateString('fr-FR')}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Statut : <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={12} /> Payée</span>
                    </p>
                  </div>
                </div>

                {/* 2. INFORMATIONS CLIENT & LIVRAISON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Facturé à (Client)</p>
                    <p className="font-bold text-gray-900 text-sm">{commandeSelectionnee.nom_client || 'Client Comptant / Anonyme'}</p>
                    {commandeSelectionnee.telephone_client && (
                      <p className="text-gray-600 font-mono text-[11px]">Tél : (+225) {commandeSelectionnee.telephone_client}</p>
                    )}
                    {commandeSelectionnee.adresse_livraison && (
                      <p className="text-gray-600 text-[11px] pt-0.5">Adresse : {commandeSelectionnee.adresse_livraison}</p>
                    )}
                  </div>

                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Modalités de Règlement</p>
                    <p className="font-bold text-gray-900">Paiement au comptant</p>
                    <p className="text-gray-600 text-[11px]">Moyen : Espèces / Mobile Money (Wave / Orange)</p>
                    <p className="text-gray-500 text-[10px] italic pt-1">Acquitté à la commande.</p>
                  </div>
                </div>

                {/* 3. TABLEAU DES PRODUITS / SERVICES */}
                <div className="space-y-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-2 font-bold">Désignation Produit</th>
                        <th className="py-2.5 px-2 font-bold text-center">Qté</th>
                        <th className="py-2.5 px-2 font-bold text-right">Prix Unitaire</th>
                        <th className="py-2.5 px-2 font-bold text-right">Total (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.isArray(commandeSelectionnee.produits) && commandeSelectionnee.produits.length > 0 ? (
                        commandeSelectionnee.produits.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-3 px-2 font-medium text-gray-900">
                              {p.nom || 'Article sans nom'}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-700">
                              {p.quantite || 1}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-gray-600">
                              {formaterMontant(p.prix)} F
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-gray-900">
                              {formaterMontant((p.prix || 0) * (p.quantite || 1))} F
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                            Aucun détail d'article enregistré sur cette commande.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. TOTAL & VENTILATION */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-gray-200 pt-4">
                  <div className="text-xs text-gray-500 max-w-xs space-y-1">
                    <p className="font-bold text-gray-700">Conditions & Mentions :</p>
                    <p className="text-[11px] leading-relaxed">
                      Marchandise vendue et livrée en bon état. Pas de retour ni d'échange au-delà de 48 heures après livraison.
                    </p>
                  </div>

                  <div className="w-full sm:w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600 py-1 border-b border-gray-100">
                      <span>Sous-total HT</span>
                      <span className="font-mono font-semibold">{formaterMontant(commandeSelectionnee.total)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-gray-600 py-1 border-b border-gray-100">
                      <span>TVA ( Non assujetti )</span>
                      <span className="font-mono font-semibold">0 FCFA</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-900 font-bold text-sm py-2 bg-gray-50 px-3 rounded-lg border border-gray-200">
                      <span>NET À PAYER</span>
                      <span className="font-mono text-base text-indigo-950">{formaterMontant(commandeSelectionnee.total)} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* 5. CACHET ET SIGNATURE */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-gray-200 text-center">
                  <div className="space-y-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Le Client (Accord & Réception)</p>
                    <div className="h-10"></div>
                  </div>
                  <div className="space-y-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pour la Boutique (Cachet / Visa)</p>
                    <div className="h-10 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-indigo-900 border border-indigo-200 rounded-md px-3 py-1 bg-indigo-50/50">
                        {parametres?.nom_boutique || 'MA BOUTIQUE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BAS DE PAGE DE FACTURE */}
                <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-4">
                  Facture générée numériquement par Ma Boutique · Merci de votre confiance !
                </div>

              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-text-secondary text-xs bg-card border border-dashed border-border rounded-2xl">
              Sélectionne une commande dans la liste de gauche pour générer sa facture.
            </div>
          )}
        </div>

      </div>

      {/* Style CSS d'Impression pour isoler uniquement le document papier */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #zone-facture, #zone-facture * {
            visibility: visible;
          }
          #zone-facture {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

    </div>
  )
}