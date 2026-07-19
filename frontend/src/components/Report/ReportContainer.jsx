import { useState } from 'react'
import { AlertTriangle, Download, Loader2, MessageCircle } from 'lucide-react'
import LoadingSection from '../UI/LoadingSection.jsx'
import ReportHeader from './sections/ReportHeader.jsx'
import VerdictIA from './sections/VerdictIA.jsx'
import EngineReliability from './sections/EngineReliability.jsx'
import VigilancePoints from './sections/VigilancePoints.jsx'
import ForecastCosts from './sections/ForecastCosts.jsx'
import PriceNegotiation from './sections/PriceNegotiation.jsx'
import InspectionChecklist from './sections/InspectionChecklist.jsx'
import PracticalInfo from './sections/PracticalInfo.jsx'
import VendorResponse from './sections/VendorResponse.jsx'
import ChatPanel from './ChatPanel.jsx'

const STEPS = [
  { key: 'r1', label: 'Extraction' },
  { key: 'r2', label: 'Scoring' },
  { key: 'r3', label: 'Risques' },
  { key: 'r4', label: 'Négociation' },
  { key: 'r5', label: 'Pratique' },
]

function SectionError({ label }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-sm text-text-secondary">
      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
      <span>Section <strong>{label}</strong> non disponible — relancez l'analyse.</span>
    </div>
  )
}

function AnalysisProgress({ completedSteps }) {
  return (
    <div className="mb-6 no-print">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">Analyse en cours…</span>
        <span className="text-xs font-mono text-text-tertiary">{completedSteps.length}/5</span>
      </div>
      <div className="h-px bg-border rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-text rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(completedSteps.length / 5) * 100}%` }}
        />
      </div>
      <div className="flex justify-between">
        {STEPS.map((step, idx) => {
          const done = completedSteps.includes(step.key)
          const isActive = !done && completedSteps.length === idx
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${
                done ? 'bg-text' : isActive ? 'bg-text-secondary animate-pulse' : 'bg-border'
              }`} />
              <span className={`text-[10px] ${done ? 'text-text-secondary' : 'text-text-tertiary'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ReportContainer({ state, onReset, analysisId }) {
  const { r1, r2, r3, r4, r5, completedSteps, status, error, r3Error, r4Error, vendor_reanalysis } = state
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)

  const vehiculeLabel = r1?.vehicule_identifie
    ? `${r1.vehicule_identifie.marque || ''} ${r1.vehicule_identifie.modele || ''} ${r1.vehicule_identifie.annee || ''}`.trim()
    : state.vehicule?.marque ? `${state.vehicule.marque} ${state.vehicule.modele || ''}`.trim() : null

  const handleExportPDF = async () => {
    setPdfLoading(true)
    setPdfError(null)
    try {
      const [{ pdf }, { default: ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ReportPDF.jsx'),
      ])
      const blob = await pdf(
        <ReportPDF r1={r1} r2={r2} r3={r3} r4={r4} r5={r5} vehicule={state.vehicule} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const v = r1?.vehicule_identifie
      a.href = url
      a.download = `ScanAuto_${v?.marque || ''}_${v?.modele || ''}_${v?.annee || ''}.pdf`
        .replace(/\s+/g, '_').replace(/_+/g, '_').replace(/_\.pdf$/, '.pdf')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[PDF]', e)
      setPdfError('Erreur lors de la génération du PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  if (status === 'error') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-text mb-2">Erreur d'analyse</h2>
        <p className="text-text-secondary text-sm mb-6">{error}</p>
        <button onClick={onReset} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">Réessayer</button>
      </div>
    )
  }

  const isLoading = status === 'loading'

  return (
    <div className="space-y-5">
      {isLoading && <AnalysisProgress completedSteps={completedSteps} />}

      {/* Hero: vehicle + score + criteria + recap */}
      {r1 ? (
        <div className="animate-fade-in">
          <ReportHeader r1={r1} r2={r2} vehicule={state.vehicule} images={state.vehicule?.images} />
        </div>
      ) : (
        <LoadingSection height="h-64" />
      )}

      {/* Verdict banner */}
      {r2 && (
        <div className="animate-fade-in">
          <VerdictIA r2={r2} />
        </div>
      )}

      {/* Engine + Vigilance — 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {r2 ? (
            <div className="animate-fade-in"><EngineReliability r2={r2} /></div>
          ) : (
            <LoadingSection height="h-64" label="Analyse de la motorisation…" />
          )}
        </div>

        <div className="space-y-4">
          {r3 ? (
            <div className="animate-fade-in"><VigilancePoints r3={r3} /></div>
          ) : r3Error ? (
            <SectionError label="Points de vigilance" />
          ) : (
            <LoadingSection height="h-40" label="Identification des risques…" />
          )}
        </div>
      </div>

      {/* Coûts + Prix — 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {r3 ? (
          <div className="animate-fade-in"><ForecastCosts r3={r3} /></div>
        ) : r3Error ? (
          <SectionError label="Coûts prévisionnels" />
        ) : (
          <LoadingSection height="h-48" label="Analyse des coûts…" />
        )}

        {r4 ? (
          <div className="animate-fade-in"><PriceNegotiation r4={r4} part="summary" /></div>
        ) : r4Error ? (
          <SectionError label="Prix & Négociation" />
        ) : (
          <LoadingSection height="h-48" label="Analyse du prix…" />
        )}
      </div>

      {/* Prix detail: message, questions, décote */}
      {r4 && (
        <div className="animate-fade-in">
          <PriceNegotiation r4={r4} part="detail" />
        </div>
      )}

      {/* Infos pratiques — full width */}
      {r5 ? (
        <div className="animate-fade-in"><PracticalInfo r5={r5} /></div>
      ) : (
        <LoadingSection height="h-32" label="Calcul des informations pratiques…" />
      )}

      {/* Checklist */}
      {r3 && (
        <div className="animate-fade-in"><InspectionChecklist r3={r3} /></div>
      )}

      {/* Retour vendeur — visible once analysis complete and saved */}
      {status === 'complete' && analysisId && (
        <div className="animate-fade-in no-print">
          <VendorResponse analysisId={analysisId} initialData={vendor_reanalysis || null} />
        </div>
      )}

      {/* Actions */}
      {status === 'complete' && (
        <div className="flex flex-col items-center gap-2 py-8 no-print">
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text hover:bg-[var(--surface)] transition-colors disabled:opacity-50">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? 'Génération…' : 'Télécharger le rapport PDF'}
          </button>
          {pdfError && (
            <p className="text-xs text-red-500">{pdfError}</p>
          )}
        </div>
      )}

      {/* Floating chat button */}
      {status === 'complete' && analysisId && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-fg,white)] shadow-lg hover:opacity-90 transition-opacity z-50 no-print text-sm font-medium"
        >
          <MessageCircle size={15} />
          Chat IA
        </button>
      )}

      <ChatPanel
        analysisId={analysisId}
        vehiculeLabel={vehiculeLabel}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  )
}
