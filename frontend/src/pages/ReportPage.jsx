import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, AlertCircle, ChevronDown, Bug, FolderInput, X, Check, ClipboardList } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ReportContainer from '@/components/Report/ReportContainer'
import ShareButton from '@/components/UI/ShareButton'
import { invalidateDashboardCache } from '@/utils/dashboardCache'

const API_URL = import.meta.env.VITE_API_URL || ''

function DebugPanel({ debug }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)

  const copy = (key, value) => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const blocks = [
    { key: 'vehicule', label: 'Entrées formulaire (vehicule)', data: debug.vehicule },
    { key: 'computed', label: 'Valeurs calculées (computed)', data: debug.computed },
  ].filter(b => b.data)

  return (
    <div className="mt-8 no-print">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <Bug size={13} />
        <span>Données d'entrée (debug)</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {blocks.map(({ key, label, data }) => (
            <div key={key} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-medium text-text-secondary">{label}</span>
                <button
                  onClick={() => copy(key, data)}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {copied === key ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
              <pre className="text-xs text-text-secondary p-4 overflow-x-auto leading-relaxed font-mono">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Cache in-memory pour éviter le re-fetch à chaque navigation
const reportCache = {}

function buildState(data) {
  return {
    status: 'complete',
    vehicule: data.vehicule,
    r1: data.r1,
    r2: data.r2,
    r3: data.r3,
    r4: data.r4,
    r5: data.r5,
    completedSteps: ['r1', 'r2', 'r3', 'r4', 'r5'].filter(k => data[k] != null),
    r3Error: data.r3 == null,
    r4Error: data.r4 == null,
    analysis_id: data.id,
    group_ids: data.group_ids || [],
    is_shared: data.is_shared || false,
    vendor_responses: data.vendor_responses,
    vendor_reanalysis: data.vendor_reanalysis,
    _debug: { vehicule: data.vehicule, computed: data.computed },
  }
}

function GroupSelector({ analysisId, initialGroupIds = [] }) {
  const { session } = useAuth()
  const [groups, setGroups]     = useState([])
  const [groupIds, setGroupIds] = useState(initialGroupIds)
  const [open, setOpen]         = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!session) return
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setGroups(d.groups || []))
      .catch(() => {})
  }, [session])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (groups.length === 0) return null

  const toggle = async (gid) => {
    const next = groupIds.includes(gid) ? groupIds.filter(id => id !== gid) : [...groupIds, gid]
    setGroupIds(next)
    invalidateDashboardCache()
    await fetch(`${import.meta.env.VITE_API_URL || ''}/api/analyses/${analysisId}/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_ids: next }),
    }).catch(() => {})
  }

  const activeGroups = groups.filter(g => groupIds.includes(g.id))

  return (
    <div ref={ref} className="relative flex items-center gap-2 flex-wrap no-print">
      <FolderInput size={13} className="text-text-tertiary shrink-0" />
      {activeGroups.length === 0 && (
        <span className="text-xs text-text-tertiary">Sans groupe</span>
      )}
      {activeGroups.map(g => (
        <span key={g.id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
          {g.name}
          <button onClick={() => toggle(g.id)} className="ml-0.5 text-text-tertiary hover:text-red-500 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs px-2 py-0.5 rounded-full border border-border text-text-tertiary hover:border-[var(--border-hover)] hover:text-text transition-colors"
      >
        + Groupe
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px]">
          {groups.map(g => {
            const active = groupIds.includes(g.id)
            return (
              <button
                key={g.id}
                onClick={() => { toggle(g.id) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                <span className="flex-1 text-text-secondary">{g.name}</span>
                {active && <Check size={12} className="text-text shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


export default function ReportPage({ analysisId, onNavigate, liveAnalysis, onRemove }) {
  const { session } = useAuth()
  const [state, setState] = useState(() => reportCache[analysisId] || null)
  const [loading, setLoading] = useState(!reportCache[analysisId])
  const [error, setError] = useState(null)

  // Si l'analyse est en cours en mémoire, on la rend directement sans charger depuis la DB
  const isLive = Boolean(liveAnalysis)

  useEffect(() => {
    if (isLive) return  // pas besoin de charger depuis la DB
    if (!analysisId || !session) return
    if (reportCache[analysisId]) return

    setLoading(true)
    setError(null)

    fetch(`${API_URL}/api/analyses/${analysisId}/`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Analyse introuvable' : 'Erreur serveur')
        return res.json()
      })
      .then(data => {
        const s = buildState(data)
        reportCache[analysisId] = s
        setState(s)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [analysisId, session, isLive])

  const backButton = (
    <div className="no-print mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors"
        >
          <ArrowLeft size={14} />
          Mes analyses
        </button>
        <div className="flex items-center gap-2">
          {analysisId && <ShareButton analysisId={analysisId} initialShared={state?.is_shared || false} />}
          {analysisId && (
            <a
              href={`#/checklist/${analysisId}`}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-text-tertiary hover:text-text transition-colors no-print"
              title="Checklist visite imprimable"
            >
              <ClipboardList size={11} />
              Checklist
            </a>
          )}
        </div>
      </div>
      {analysisId && (
        <GroupSelector
          analysisId={analysisId}
          initialGroupIds={isLive ? [] : (state?.group_ids || [])}
        />
      )}
    </div>
  )

  // Analyse en cours (live) — rendre directement depuis le state en mémoire
  if (isLive) {
    return (
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-4">
        {backButton}
        <ReportContainer
          state={liveAnalysis}
          onReset={onRemove}
          analysisId={analysisId}
        />
      </main>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement de l'analyse…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <p className="font-medium text-text mb-1">{error}</p>
          <button onClick={() => onNavigate('dashboard')} className="text-sm text-accent hover:underline mt-2">
            ← Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-4">
      {backButton}
      <ReportContainer
        state={state}
        onReset={() => onNavigate('home')}
        analysisId={analysisId}
      />
      {state._debug && <DebugPanel debug={state._debug} />}
    </main>
  )
}
