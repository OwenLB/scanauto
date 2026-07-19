import { useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { toStr } from '../../../utils/toStr.js'

const motorVerdictConfig = {
  'Fiable': { label: 'Fiable', classes: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50' },
  'Correct': { label: 'Correct', classes: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50' },
  'Risqué': { label: 'Risqué', classes: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50' },
  'Très risqué': { label: 'Très risqué', classes: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50' },
}

export default function EngineReliability({ r2 }) {
  const [showFull, setShowFull] = useState(false)
  const m = r2.fiabilite_moteur
  if (!m) return null

  const cfg = motorVerdictConfig[m.verdict] || motorVerdictConfig['Correct']
  const narrative = m.analyse_narrative || ''
  const isLong = narrative.length > 240

  return (
    <Card>
      <CardHeader className="p-5 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Fiabilité moteur</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-text">{m.bloc}</span>
            <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.classes}`}>
              {cfg.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-5">
        {narrative && (
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className={`text-sm text-text leading-relaxed ${!showFull && isLong ? 'line-clamp-3' : ''}`}>
              {narrative}
            </p>
            {isLong && (
              <button
                onClick={() => setShowFull(s => !s)}
                className="text-xs text-text-tertiary hover:text-text mt-1.5 transition-colors"
              >
                {showFull ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {m.points_forts?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-2">Points forts</p>
            <ul className="space-y-1.5">
              {m.points_forts.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Check size={14} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  {toStr(p)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {m.defauts_connus?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-2">Défauts connus</p>
            <div className="space-y-2">
              {m.defauts_connus.map((d, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-text">{d.defaut}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{d.description}</p>
                      {d.kilometrage_critique && (
                        <p className="text-xs text-text-tertiary mt-1 font-mono">{d.kilometrage_critique}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
