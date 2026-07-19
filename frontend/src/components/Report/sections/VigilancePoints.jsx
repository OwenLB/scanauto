import { AlertCircle, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { toStr } from '../../../utils/toStr.js'

export default function VigilancePoints({ r3 }) {
  const { critiques, a_surveiller } = r3.points_vigilance
  const securite = r3.securite

  const hasRappels = securite && !securite.aucun_rappel_majeur && securite.rappels_constructeur?.length > 0
  const hasSecurite = securite && (securite.risque_vol || securite.conseil_securite_paiement)

  if (!critiques?.length && !a_surveiller?.length && !hasRappels && !hasSecurite) return null

  return (
    <Card>
      <CardHeader className="p-5 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Points de vigilance</CardTitle>
          <div className="flex items-center gap-2">
            {critiques?.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50 font-medium">
                {critiques.length} critique{critiques.length > 1 ? 's' : ''}
              </span>
            )}
            {a_surveiller?.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50 font-medium">
                {a_surveiller.length} à surveiller
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-4">
        {critiques?.length > 0 && (
          <div className="space-y-2">
            {critiques.map((p, i) => (
              <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{p.titre}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{p.description}</p>
                      {p.consequence && (
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1 italic">{p.consequence}</p>
                      )}
                    </div>
                  </div>
                  {p.cout_estime_min > 0 && (
                    <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0 bg-red-500/10 px-2 py-1 rounded">
                      {p.cout_estime_min.toLocaleString('fr-FR')}–{p.cout_estime_max.toLocaleString('fr-FR')} €
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {a_surveiller?.length > 0 && (
          <div className="space-y-2">
            {a_surveiller.map((p, i) => (
              <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text">{p.titre}</p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rappels constructeur */}
        {securite && (
          <div className="space-y-2">
            {securite.aucun_rappel_majeur ? (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2.5">
                <ShieldCheck size={14} className="shrink-0" />
                <span>Aucun rappel constructeur majeur identifié</span>
              </div>
            ) : hasRappels && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldX size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">Rappels constructeur</p>
                </div>
                {securite.rappels_constructeur.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-red-500 shrink-0">·</span>
                    <span>{toStr(r)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Risque vol + paiement */}
            {(securite.risque_vol || securite.conseil_securite_paiement) && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Sécurité</p>
                </div>
                {securite.risque_vol && (
                  <p className="text-xs text-text-secondary">{securite.risque_vol}</p>
                )}
                {securite.conseil_securite_paiement && (
                  <p className="text-xs text-text-secondary">{securite.conseil_securite_paiement}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
