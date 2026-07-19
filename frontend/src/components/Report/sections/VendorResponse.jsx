import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

const VERDICT_CONFIG = {
  'Achat confirmé': { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  'Achat possible': { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'Prudence':        { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  'Abandon recommandé': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
}

function ResultView({ data }) {
  const cfg = VERDICT_CONFIG[data.verdict_final] || VERDICT_CONFIG['Prudence']
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}>
        <div className={`text-lg font-bold ${cfg.color} mb-1`}>{data.verdict_final}</div>
        <p className="text-sm text-text-secondary">{data.resume}</p>
      </div>

      {data.points_confirmes?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Points confirmés</p>
          <ul className="space-y-1">
            {data.points_confirmes.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.points_non_confirmes?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Non confirmés</p>
          <ul className="space-y-1">
            {data.points_non_confirmes.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.nouveaux_risques?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Nouveaux risques détectés</p>
          <ul className="space-y-1">
            {data.nouveaux_risques.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.prix_cible_mise_a_jour && (
        <div className="bg-surface rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Prix cible mis à jour</p>
            <p className="text-lg font-bold text-text">{data.prix_cible_mise_a_jour.toLocaleString('fr-FR')} €</p>
          </div>
          {data.justification_prix && (
            <p className="text-xs text-text-secondary max-w-[200px] text-right">{data.justification_prix}</p>
          )}
        </div>
      )}

      {data.message_suite && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Message de suivi</p>
          <div className="bg-surface border border-border rounded-lg p-3 text-sm text-text italic">
            "{data.message_suite}"
          </div>
        </div>
      )}
    </div>
  )
}

export default function VendorResponse({ analysisId, initialData }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(initialData || null)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    ct_valide: '',
    factures_entretien: '',
    nb_proprietaires: '',
    raison_vente: '',
    negociation_acceptee: '',
    prix_negocie: '',
    observations: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '')
    )

    try {
      const res = await fetch(`${API_URL}/api/vendor-response/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ analysis_id: analysisId, vendor_responses: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setResult(data.vendor_reanalysis)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquare size={17} className="text-accent" />
          <div className="text-left">
            <p className="font-semibold text-text text-sm">Retour du vendeur</p>
            <p className="text-xs text-text-secondary">
              {result ? 'Analyse mise à jour avec les réponses vendeur' : 'Renseignez les réponses du vendeur pour affiner l\'analyse'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {result ? (
            <ResultView data={result} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">CT valide ?</label>
                  <select value={form.ct_valide} onChange={set('ct_valide')} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="">Non renseigné</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                    <option value="Oui mais avec réserves">Oui avec réserves</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Factures entretien ?</label>
                  <select value={form.factures_entretien} onChange={set('factures_entretien')} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="">Non renseigné</option>
                    <option value="Oui, complètes">Oui, complètes</option>
                    <option value="Oui, partielles">Oui, partielles</option>
                    <option value="Non">Non</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Nombre de propriétaires</label>
                  <input type="number" min="1" max="20" value={form.nb_proprietaires} onChange={set('nb_proprietaires')} placeholder="Ex: 2" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Négociation acceptée ?</label>
                  <select value={form.negociation_acceptee} onChange={set('negociation_acceptee')} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="">Non renseigné</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                    <option value="Partiellement">Partiellement</option>
                  </select>
                </div>

                {form.negociation_acceptee === 'Oui' || form.negociation_acceptee === 'Partiellement' ? (
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Prix négocié (€)</label>
                    <input type="number" value={form.prix_negocie} onChange={set('prix_negocie')} placeholder="Ex: 8500" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Raison de la vente</label>
                <input type="text" value={form.raison_vente} onChange={set('raison_vente')} placeholder="Ex: Achat d'un neuf, déménagement…" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Observations libres</label>
                <textarea value={form.observations} onChange={set('observations')} rows={3} placeholder="Impression générale, points remarqués lors de la visite…" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-accent text-[var(--accent-fg)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Analyse en cours…' : 'Analyser les réponses'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
