import { useState, useEffect } from 'react'
import { ArrowLeft, Car } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getScoreTier } from '@/utils/scoreConfig'

const API_URL = import.meta.env.VITE_API_URL || ''

function fmtNum(v, suffix = '') {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (isNaN(n)) return null
  return n.toLocaleString('fr-FR') + suffix
}

function fmt(v, suffix = '') {
  return fmtNum(v, suffix) ?? '—'
}

// Accesseurs sûrs dans la structure imbriquée de R2
function r2score(a, key) {
  const c = a.r2?.criteres
  if (!c) return null
  const map = {
    fiabilite:  c.fiabilite?.score,
    kilometrage: c.kilometrage?.score,
    historique:  c.historique?.score,
    prix_marche: c.prix_marche?.score,
    signaux_vendeur: c.signaux_vendeur?.score,
  }
  return map[key] ?? null
}

function ScoreBar({ score, max = 100 }) {
  if (score == null) return <span className="text-text-tertiary text-xs">—</span>
  const { tw } = getScoreTier(score)
  const pct = Math.round((score / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tw.bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${tw.text}`}>{score}/{max}</span>
    </div>
  )
}

// Structure réelle de R2 : criteres.{fiabilite,kilometrage,historique,prix_marche,signaux_vendeur}.score
const SCORE_DETAILS = [
  { label: 'Score global',          max: 100, get: a => a.r2?.score_global ?? null },
  { label: 'Fiabilité moteur',      max: 25,  get: a => r2score(a, 'fiabilite') },
  { label: 'Kilométrage / état',    max: 25,  get: a => r2score(a, 'kilometrage') },
  { label: 'Historique',            max: 20,  get: a => r2score(a, 'historique') },
  { label: 'Positionnement marché', max: 15,  get: a => r2score(a, 'prix_marche') },
  { label: 'Signaux vendeur',       max: 15,  get: a => r2score(a, 'signaux_vendeur') },
]

const CT_LABELS = { oui: '✓ Valide', non: '✗ Non valide', non_mentionné: '—' }

const METRIC_ROWS = [
  { label: 'Prix',        get: a => fmt(a.vehicule?.prix, ' €'),         num: a => a.vehicule?.prix,         bestIsLow: true },
  { label: 'Kilométrage', get: a => fmt(a.vehicule?.kilometrage, ' km'), num: a => a.vehicule?.kilometrage,  bestIsLow: true },
  { label: 'Année',     get: a => a.vehicule?.annee ? String(a.vehicule.annee) : '—', num: a => a.vehicule?.annee },
  { label: 'Motorisation', get: a => a.vehicule?.motorisation || '—' },
  { label: 'Carburant', get: a => a.vehicule?.carburant || '—' },
  { label: 'Boîte',     get: a => a.vehicule?.boite || '—' },
  { label: 'Vendeur',   get: a => a.vehicule?.vendeur_type === 'pro' ? 'Pro' : 'Particulier' },
  { label: 'CT',        get: a => CT_LABELS[a.vehicule?.ct_valide] ?? '—' },
  { label: 'Travaux imminents', bestIsLow: true, num: a => a.r3?.couts_previsionnels?.total_travaux_imminents_min, get: a => {
    const min = a.r3?.couts_previsionnels?.total_travaux_imminents_min
    const max = a.r3?.couts_previsionnels?.total_travaux_imminents_max
    if (min == null && max == null) return '—'
    if (min === 0 && max === 0) return 'Aucun'
    if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max, ' €')}`
    return fmt(min ?? max, ' €')
  }, num: a => a.r3?.couts_previsionnels?.total_travaux_imminents_min },
  { label: 'Entretien/an', get: a => {
    const min = a.r3?.couts_previsionnels?.entretien_annuel_min
    const max = a.r3?.couts_previsionnels?.entretien_annuel_max
    if (min == null && max == null) return '—'
    if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max, ' €')}`
    return fmt(min ?? max, ' €')
  }},
  { label: 'Assurance/an', get: a => {
    const min = a.r5?.assurance?.tous_risques_min
    const max = a.r5?.assurance?.tous_risques_max
    if (min == null && max == null) return '—'
    if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max, ' €')}`
    return fmt(min ?? max, ' €')
  }},
  { label: 'Conso mixte', get: a => {
    const c = a.r5?.consommation?.mixte
    return c ? fmt(c, ' L/100') : '—'
  }},
  { label: 'Carburant/an', bestIsLow: true, num: a => a.r5?.budget_annuel?.carburant, get: a => {
    const c = a.r5?.budget_annuel?.carburant
    return c != null ? fmt(c, ' €') : '—'
  }},
]

export default function ComparisonPage({ analysisIds, onNavigate }) {
  const { session } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || !analysisIds?.length) return
    Promise.all(
      analysisIds.map(id =>
        fetch(`${API_URL}/api/analyses/${id}/`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then(r => r.json())
      )
    )
      .then(results => { setAnalyses(results); setLoading(false) })
      .catch(() => setLoading(false))
  }, [analysisIds, session])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cols = analyses.length

  return (
    <div className="flex-1">
      <main className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors mb-6 no-print"
        >
          <ArrowLeft size={14} />
          Mes analyses
        </button>

        <h1 className="text-xl font-semibold text-text mb-6">Comparaison</h1>

        {/* Header row */}
        <div className={`grid gap-3 mb-6`} style={{ gridTemplateColumns: `180px repeat(${cols}, 1fr)` }}>
          <div />
          {analyses.map(a => {
            const v = a.vehicule || {}
            const label = [v.marque, v.modele, v.annee].filter(Boolean).join(' ') || 'Véhicule'
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center mx-auto mb-2 overflow-hidden">
                  {v.images?.[0]
                    ? <img src={v.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Car size={18} className="text-text-secondary" />
                  }
                </div>
                <p className="font-medium text-text text-sm leading-tight">{label}</p>
                {v.finition && <p className="text-xs text-text-tertiary mt-0.5">{v.finition}</p>}
                <button
                  onClick={() => onNavigate(`rapport/${a.id}`)}
                  className="text-xs text-accent hover:underline mt-2 block"
                >
                  Voir l'analyse →
                </button>
              </div>
            )
          })}
        </div>

        {/* Score section */}
        <section className="mb-6">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Scores</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {SCORE_DETAILS.map(({ label, max, get }, i) => (
              <div
                key={label}
                className={`grid gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''} ${i === 0 ? 'bg-surface/50' : ''}`}
                style={{ gridTemplateColumns: `180px repeat(${cols}, 1fr)` }}
              >
                <span className={`text-sm ${i === 0 ? 'font-semibold text-text' : 'text-text-secondary'}`}>{label}</span>
                {analyses.map(a => (
                  <div key={a.id}>
                    <ScoreBar score={get(a)} max={max} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Metrics section */}
        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Caractéristiques</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {METRIC_ROWS.map(({ label, get, num, bestIsLow }, i) => {
              const vals = analyses.map(get)
              // Highlight best value when a num accessor is provided
              let bestIdx = -1
              if (num) {
                const nums = analyses.map(a => { const v = num(a); return v != null ? Number(v) : null })
                const valid = nums.filter(v => v != null)
                if (valid.length > 1) {
                  const target = bestIsLow !== false ? Math.min(...valid) : Math.max(...valid)
                  bestIdx = nums.findIndex(v => v === target)
                }
              }
              return (
                <div
                  key={label}
                  className={`grid gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                  style={{ gridTemplateColumns: `180px repeat(${cols}, 1fr)` }}
                >
                  <span className="text-sm text-text-secondary">{label}</span>
                  {vals.map((v, j) => (
                    <span key={j} className={`text-sm font-medium ${v === '—' ? 'text-text-tertiary' : j === bestIdx ? 'text-green-500' : 'text-text'}`}>
                      {v}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
