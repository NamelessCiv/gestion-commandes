import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp } from 'lucide-react'

const STATUT_LABELS = {
  en_attente: 'En attente',
  payee: 'Payée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
}

function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientOuvert, setClientOuvert] = useState(null)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    async function fetchClients() {
      setLoading(true)
      const { data } = await supabase
        .from('clients')
        .select('*, commandes(id, total, statut, created_at)')
        .order('nom')

      setClients(data || [])
      setLoading(false)
    }

    fetchClients()
  }, [])

  const clientsFiltres = clients.filter((c) =>
    c.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">Clients</h1>
      <p className="text-text-secondary mt-1">Historique de tes clients</p>

      <input
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un client..."
        className="mt-6 w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm">Chargement...</p>
        ) : clientsFiltres.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary text-sm">Aucun client trouvé.</p>
          </div>
        ) : (
          clientsFiltres.map((client) => {
            const commandesTriees = [...(client.commandes || [])].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )
            const totalDepense = commandesTriees
              .filter((c) => c.statut === 'payee')
              .reduce((sum, c) => sum + Number(c.total), 0)
            const estOuvert = clientOuvert === client.id

            return (
              <div key={client.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setClientOuvert(estOuvert ? null : client.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-medium text-text">{client.nom}</p>
                    <p className="text-sm text-text-secondary">
                      {client.telephone || 'Pas de téléphone'} · {commandesTriees.length} commande
                      {commandesTriees.length > 1 ? 's' : ''} · {totalDepense.toLocaleString()} FCFA dépensés
                    </p>
                  </div>
                  {estOuvert ? (
                    <ChevronUp size={18} className="text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-text-secondary shrink-0" />
                  )}
                </button>

                {estOuvert && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {commandesTriees.length === 0 ? (
                      <p className="text-sm text-text-secondary">Aucune commande pour ce client.</p>
                    ) : (
                      commandesTriees.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">
                            {new Date(c.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="text-text">{c.total.toLocaleString()} FCFA</span>
                          <span className="text-text-secondary">{STATUT_LABELS[c.statut]}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Clients