import { useState, useEffect } from 'react'
import { ExternalLink, Gauge, AlertTriangle, AlertCircle, Calendar, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/UI/card'
import { Separator } from '@/components/UI/separator'
import ScoreGauge from '../../UI/ScoreGauge.jsx'
import { toStr } from '../../../utils/toStr.js'
import { getScoreTier, getVerdictTier } from '../../../utils/scoreConfig.js'

const CRITERIA_CONFIG = [
  { key: 'kilometrage',    label: 'Km',        max: 25 },
  { key: 'fiabilite',      label: 'Fiabilité',  max: 25 },
  { key: 'historique',     label: 'Historique', max: 20 },
  { key: 'signaux_vendeur',label: 'Vendeur',    max: 15 },
  { key: 'prix_marche',    label: 'Prix',       max: 15 },
]

function InfoRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between items-center gap-2 py-1 border-b border-border last:border-0">
      <span className="text-xs text-text-secondary shrink-0">{label}</span>
      <span className="text-xs font-medium text-text text-right">{String(value)}</span>
    </div>
  )
}

export default function ReportHeader({ r1, r2, vehicule, images }) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    const expand = () => setDetailsOpen(true)
    window.addEventListener('beforeprint', expand)
    return () => window.removeEventListener('beforeprint', expand)
  }, [])
  const v = r1.vehicule_identifie ?? {}
  const s = r1.vendeur ?? {}
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const metaParts = [v.annee, v.carburant, v.boite].filter(Boolean)
  const criticalMissing = r1.infos_manquantes?.filter(i => i.impact === 'critique' || i.impact === 'important') ?? []

  return (
    <Card className="overflow-hidden">
      {/* Galerie LeBonCoin : 1 grande photo à gauche, 2 petites à droite */}
      {images?.length > 0 && (
        <div className="grid grid-cols-2 gap-1 h-80">
          <a href={images[0]} target="_blank" rel="noopener noreferrer" className="block overflow-hidden">
            <img src={images[0]} alt="Photo 1" className="w-full h-full object-cover hover:opacity-95 transition-opacity" loading="lazy" />
          </a>
          <div className="flex flex-col gap-1 overflow-hidden">
            {images[1] && (
              <a href={images[1]} target="_blank" rel="noopener noreferrer" className="block flex-1 overflow-hidden">
                <img src={images[1]} alt="Photo 2" className="w-full h-full object-cover hover:opacity-95 transition-opacity" loading="lazy" />
              </a>
            )}
            {images[2] && (
              <a href={images[2]} target="_blank" rel="noopener noreferrer" className="block flex-1 overflow-hidden">
                <img src={images[2]} alt="Photo 3" className="w-full h-full object-cover hover:opacity-95 transition-opacity" loading="lazy" />
              </a>
            )}
          </div>
        </div>
      )}

      <CardContent className="p-5 sm:p-6">
        {/* Hero: identity + score */}
        <div className="flex items-start gap-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text leading-tight">
              {v.marque} {v.modele}
              {v.finition && <span className="text-text-secondary font-normal"> — {v.finition}</span>}
            </h1>
            {metaParts.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Gauge size={13} className="text-text-tertiary shrink-0" />
                {metaParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-text-tertiary">·</span>}
                    <span className="text-sm text-text-secondary">{part}</span>
                  </span>
                ))}
              </div>
            )}
            {v.kilometrage != null && (
              <p className="text-sm text-text-secondary mt-0.5">
                {v.kilometrage.toLocaleString('fr-FR')} km
                {v.km_par_an ? <span className="text-text-tertiary"> · {v.km_par_an.toLocaleString('fr-FR')} km/an</span> : null}
              </p>
            )}
            {v.bloc_moteur?.designation && (
              <p className="text-xs font-mono text-text-tertiary mt-1">
                {v.bloc_moteur.designation}
                {v.bloc_moteur.code ? ` (${v.bloc_moteur.code})` : ''}
                {v.bloc_moteur.puissance_ch ? ` · ${v.bloc_moteur.puissance_ch} ch` : ''}
              </p>
            )}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <span className="text-3xl font-bold text-text font-mono">
                {v.prix?.toLocaleString('fr-FR')} €
              </span>
              <div className="flex items-center gap-3 text-xs text-text-tertiary">
                {vehicule?.lien_annonce && (
                  <a href={vehicule.lien_annonce} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-text transition-colors">
                    Voir l'annonce <ExternalLink size={11} />
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {today}
                </span>
              </div>
            </div>
          </div>

          {r2 && (
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ScoreGauge score={r2.score_global} size={96} />
              <span className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getVerdictTier(r2.verdict).tw.badge}`}>
                {r2.verdict}
              </span>
            </div>
          )}
        </div>

        {/* Infos manquantes critiques — toujours visibles */}
        {criticalMissing.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {criticalMissing.map((info, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${
                info.impact === 'critique'
                  ? 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {info.impact === 'critique'
                  ? <AlertCircle size={10} className="shrink-0" />
                  : <AlertTriangle size={10} className="shrink-0" />
                }
                <span>{info.champ}</span>
              </div>
            ))}
          </div>
        )}

        {/* Toggle détails */}
        <button
          onClick={() => setDetailsOpen(d => !d)}
          className="mt-4 flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`}
          />
          Détails de l'annonce
        </button>

        {/* Section dépliable : véhicule, vendeur, critères, options */}
        {detailsOpen && (
          <div className="space-y-5 mt-5">
            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Vehicle facts */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">Véhicule</p>
                <InfoRow label="CT valide" value={v.ct_valide === true ? '✓ Oui' : v.ct_valide === false ? '✗ Non' : v.ct_valide} />
                <InfoRow label="Carnet entretien" value={v.carnet_entretien} />
                <InfoRow label="Nb propriétaires" value={v.nb_proprietaires} />
                <InfoRow label="Cohérence KM" value={v.coherence_kilometrage} />
                {v.generation && <InfoRow label="Génération" value={v.generation} />}
              </div>

              {/* Seller */}
              {s && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">Vendeur</p>
                  <InfoRow label="Type" value={s.type} />
                  <InfoRow label="Localisation" value={s.localisation} />
                  <InfoRow label="Âge annonce" value={s.age_annonce_jours ? `${s.age_annonce_jours} jours` : null} />
                  <InfoRow label="Ton" value={s.ton_annonce} />
                  {s.red_flags?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {s.red_flags.map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                          <span>{toStr(f)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Score criteria */}
              {r2?.criteres && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">Critères</p>
                  <div className="space-y-2.5">
                    {CRITERIA_CONFIG.map(({ key, label, max }) => {
                      const crit = r2.criteres[key]
                      if (!crit) return null
                      const pct = (crit.score / max) * 100
                      const barColor = getScoreTier(pct).hex
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-text-secondary">{label}</span>
                            <div className="flex items-center gap-1">
                              {crit.statut === 'incomplet' && (
                                <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">?</span>
                              )}
                              <span className="text-xs font-mono" style={{ color: barColor }}>{crit.score}/{max}</span>
                            </div>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                          {crit.justification && (
                            <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{crit.justification}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            {r1.options_detectees?.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">Options détectées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r1.options_detectees.map((opt, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          opt.coherent_avec_finition
                            ? 'bg-surface border-border text-text-secondary'
                            : 'bg-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {opt.nom}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
