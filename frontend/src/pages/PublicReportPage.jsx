import { useState, useEffect } from 'react'
import { ScanLine, AlertCircle } from 'lucide-react'
import ReportContainer from '@/components/Report/ReportContainer'

const API_URL = import.meta.env.VITE_API_URL || ''

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
    group_ids: [],
    vendor_responses: null,
    vendor_reanalysis: null,
  }
}

export default function PublicReportPage({ analysisId, onNavigate }) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!analysisId) return
    setLoading(true)
    fetch(`${API_URL}/api/public/analyses/${analysisId}/`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Analyse introuvable ou non partagée' : 'Erreur serveur')
        return res.json()
      })
      .then(data => {
        setState(buildState(data))
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [analysisId])

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card h-[52px] flex items-center px-4 gap-3">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2">
          <ScanLine size={16} className="text-text" />
          <span className="font-bold text-text text-base">ScanAuto</span>
        </button>
        <span className="text-xs text-text-tertiary border-l border-border pl-3">Analyse partagée</span>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-text-secondary">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Chargement…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
            <p className="font-medium text-text mb-1">{error}</p>
            <button onClick={() => onNavigate('home')} className="text-sm text-accent hover:underline mt-2">
              Analyser une annonce →
            </button>
          </div>
        </div>
      )}

      {state && (
        <main className="max-w-6xl w-full mx-auto px-4 lg:px-6 py-6">
          <ReportContainer state={state} onReset={null} analysisId={null} readOnly />
        </main>
      )}
    </div>
  )
}
