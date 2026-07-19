import { Euro, Wrench, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { Separator } from '@/components/UI/separator'

const urgenceConfig = {
  'immédiat': { label: 'Immédiat', borderClass: 'border-l-2 border-red-500', textClass: 'text-red-600 dark:text-red-400' },
  'avant_achat': { label: 'Avant achat', borderClass: 'border-l-2 border-amber-500', textClass: 'text-amber-600 dark:text-amber-400' },
  'dans_3_mois': { label: 'Dans 3 mois', borderClass: 'border-l-2 border-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-400' },
}

export default function ForecastCosts({ r3 }) {
  const c = r3.couts_previsionnels
  if (!c) return null

  return (
    <Card>
      <CardHeader className="p-5 pb-4">
        <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Coûts prévisionnels</CardTitle>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-4">
        {c.total_travaux_imminents_min > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-text">Budget travaux</p>
            <span className="text-lg font-bold font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
              {c.total_travaux_imminents_min?.toLocaleString('fr-FR')}–{c.total_travaux_imminents_max?.toLocaleString('fr-FR')} €
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro size={14} className="text-text-secondary" />
            <span className="text-sm text-text-secondary">Entretien annuel</span>
          </div>
          <span className="text-sm font-mono font-semibold text-text">
            {c.entretien_annuel_min?.toLocaleString('fr-FR')}–{c.entretien_annuel_max?.toLocaleString('fr-FR')} €/an
          </span>
        </div>

        {c.travaux_imminents?.length > 0 && (
          <div>
            <Separator className="mb-4" />
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Travaux imminents</p>
            <div className="space-y-2">
              {c.travaux_imminents.map((t, i) => {
                const cfg = urgenceConfig[t.urgence] || { label: t.urgence, borderClass: 'border-l-2 border-border', textClass: 'text-text-tertiary' }
                return (
                  <div key={i} className={`flex items-center justify-between pl-3 py-2 ${cfg.borderClass}`}>
                    <div className="flex items-start gap-2">
                      <Wrench size={13} className="text-text-secondary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-text">{t.intervention}</p>
                        <p className={`text-xs mt-0.5 ${cfg.textClass}`}>{cfg.label}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-semibold text-text whitespace-nowrap ml-3">
                      {t.cout_min?.toLocaleString('fr-FR')}–{t.cout_max?.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {c.travaux_long_terme?.length > 0 && (
          <div>
            <Separator className="mb-4" />
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Moyen / Long terme</p>
            <div className="space-y-2">
              {c.travaux_long_terme.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-start gap-2">
                    <Clock size={13} className="text-text-tertiary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-secondary">{t.intervention}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{t.horizon}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-text-secondary whitespace-nowrap ml-3">
                    {t.cout_min?.toLocaleString('fr-FR')}–{t.cout_max?.toLocaleString('fr-FR')} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
