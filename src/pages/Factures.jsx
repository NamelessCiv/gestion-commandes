import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Download, Share2, FileText, CheckCircle2 } from 'lucide-react'
import { useParametres } from '../contexts/ParametresContext'

function formaterMontant(nombre) {
  return Math.round(Number(nombre) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Factures() {
  const { parametres } = useParametres()
  const accentColor = parametres?.accent_color || '#493ee5'

  const [commandes, setCommandes] = useState([])
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  async function chargerFactures() {
    setLoading(true)
    
    // 1. Récupérer l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 2. Charger uniquement ses factures/commandes
    const { data } = await supabase
      .from('commandes')
      .select('*')
      .eq('user_id', user.id) // 👈 Sécurisation ici
      .order('created_at', { ascending: false })
    
    setCommandes(data || [])
    if (data && data.length > 0) setCommandeSelectionnee(data[0])
    setLoading(false)
  }
  chargerFactures()
}, [])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 flex items-center gap-2">
          <FileText size={24} style={{ color: accentColor }} /> Factures & Reçus
        </h1>
        <p className="text-xs font-medium text-gray-500 mt-1">Génère, télécharge et partage les reçus de tes clients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des factures à gauche */}
        <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <p className="text-xs text-gray-400 font-medium">Chargement de la liste...</p>
          ) : commandes.length === 0 ? (
            <p className="text-xs text-gray-400 font-medium">Aucun historique disponible.</p>
          ) : (
            commandes.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => setCommandeSelectionnee(cmd)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1 cursor-pointer ${
                  commandeSelectionnee?.id === cmd.id
                    ? 'bg-white shadow-xs'
                    : 'bg-transparent border-gray-100 hover:bg-gray-50/50'
                }`}
                style={commandeSelectionnee?.id === cmd.id ? { borderColor: accentColor } : {}}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-gray-950 text-xs">#{cmd.id.slice(0, 8).toUpperCase()}</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{formaterMontant(cmd.total)} F</span>
                </div>
                <div className="flex justify-between items-center w-full mt-1 text-[11px] text-gray-400 font-medium">
                  <span>{cmd.nom_client || 'Client anonyme'}</span>
                  <span>{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Panneau d'aperçu de facture à droite (calqué sur facture.html) */}
        <div className="lg:col-span-2">
          {commandeSelectionnee ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* En-tête de la facture d'après ta maquette */}
              <div className="flex justify-between items-start border-b border-gray-50 pb-5">
                <div>
                  <h2 className="text-lg font-black text-gray-950">{parametres?.nom_boutique || 'Ma Boutique'}</h2>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Reçu officiel de vente</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-900 block">Facture #{commandeSelectionnee.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-[11px] text-gray-400 font-medium mt-0.5">{new Date(commandeSelectionnee.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Infos Client */}
              <div className="bg-neutral-50/60 p-4 rounded-xl border border-gray-50 space-y-1 text-xs">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Facturé à</p>
                <p className="font-bold text-gray-950">{commandeSelectionnee.nom_client || 'Client anonyme'}</p>
                {commandeSelectionnee.telephone_client && <p className="text-gray-500 font-mono">{commandeSelectionnee.telephone_client}</p>}
              </div>

              {/* Articles vendus */}
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Articles commandés</p>
                <div className="border border-gray-50 rounded-xl overflow-hidden divide-y divide-gray-50 text-xs">
                  {Array.isArray(commandeSelectionnee.produits) ? (
                    commandeSelectionnee.produits.map((p, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center bg-white">
                        <div>
                          <p className="font-bold text-gray-900">{p.nom || 'Article'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formaterMontant(p.prix)} F × {p.quantite || 1}</p>
                        </div>
                        <span className="font-mono font-bold text-gray-950">{formaterMontant((p.prix || 0) * (p.quantite || 1))} F</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-gray-400 text-center">Aucun article enregistré pour cette commande.</div>
                  )}
                </div>
              </div>

              {/* Total final */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-4 text-sm">
                <span className="font-bold text-gray-900">Montant Total Réglé</span>
                <span className="font-mono font-black text-lg" style={{ color: accentColor }}>{formaterMontant(commandeSelectionnee.total)} F</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all hover:opacity-95 shadow-xs cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  <Share2 size={14} /> Partager Reçu
                </button>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200/60 text-gray-700 font-bold h-11 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer">
                  <Download size={14} /> Télécharger PDF
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs bg-white border border-dashed border-gray-100 rounded-2xl">
              Sélectionne un élément pour afficher son aperçu de facture.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}