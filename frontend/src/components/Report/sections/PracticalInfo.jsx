import { Tag, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { Separator } from '@/components/UI/separator'
import { toStr } from '../../../utils/toStr.js'

const critairColors = {
  '0': 'bg-violet-600',
  '1': 'bg-violet-400',
  '2': 'bg-amber-400',
  '3': 'bg-orange-500',
  '4': 'bg-red-500',
  '5': 'bg-gray-500',
}

const zfeStatusClass = {
  'autorisé': 'text-green-600 dark:text-green-400',
  'restrictions': 'text-amber-600 dark:text-amber-400',
  'interdit': 'text-red-600 dark:text-red-400',
}

function StatCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-2.5">{title}</p>
      {children}
    </div>
  )
}

function ProfileBar({ label, score }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-text">{score}/10</span>
      </div>
      <div className="h-px bg-border rounded-full">
        <div className="h-full bg-text rounded-full transition-all" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  )
}

export default function PracticalInfo({ r5 }) {
  const { critair, assurance, carte_grise, consommation, profil_utilisation } = r5

  return (
    <Card>
      <CardHeader className="p-5 pb-4">
        <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Informations pratiques</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        {/* 4 stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {critair && (
            <StatCard title="Crit'Air & ZFE">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${critairColors[critair.classe] || 'bg-gray-500'}`}>
                  {critair.classe}
                </span>
                <div>
                  <p className="text-xs font-medium text-text">{critair.couleur}</p>
                  <p className="text-[11px] text-text-secondary">{critair.zfe_statut_2026}</p>
                </div>
              </div>
              {critair.zfe_details?.slice(0, 2).map((zfe, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">{zfe.ville}</span>
                  <span className={zfeStatusClass[zfe.statut] || 'text-text-secondary'}>{zfe.statut}</span>
                </div>
              ))}
            </StatCard>
          )}

          {assurance && (
            <StatCard title="Assurance estimée">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Tous risques</span>
                  <span className="text-xs font-mono font-semibold text-text">{assurance.tous_risques_min}–{assurance.tous_risques_max} €/m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Au tiers</span>
                  <span className="text-xs font-mono font-semibold text-text">{assurance.au_tiers_min}–{assurance.au_tiers_max} €/m</span>
                </div>
              </div>
            </StatCard>
          )}

          {carte_grise && (
            <StatCard title="Carte grise">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">CV fiscaux</span>
                  <span className="font-mono text-text">{carte_grise.cv_fiscaux} CV</span>
                </div>
                {carte_grise.reduction_age && (
                  <div className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                    <ShieldCheck size={11} />
                    <span>Réduction &gt;10 ans</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                  <span className="text-text-secondary">Total</span>
                  <span className="font-mono text-text">{carte_grise.total_estime?.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </StatCard>
          )}

          {consommation && (
            <StatCard title="Consommation">
              <div className="flex justify-between mb-2">
                {[
                  { label: 'Ville', value: consommation.ville },
                  { label: 'Mixte', value: consommation.mixte },
                  { label: 'Route', value: consommation.route },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-sm font-mono font-bold text-text">{item.value}</p>
                    <p className="text-[10px] text-text-tertiary">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-mono font-medium text-text border-t border-border pt-1.5">
                Plein ~{consommation.cout_plein_estime?.toLocaleString('fr-FR')} €
              </p>
            </StatCard>
          )}
        </div>

        {/* Usage profile */}
        {profil_utilisation && (
          <div className="bg-surface border border-border rounded-xl p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Profil d'utilisation</p>
            <div className="grid grid-cols-2 gap-x-5">
              <ProfileBar label="Ville" score={profil_utilisation.ville} />
              <ProfileBar label="Autoroute" score={profil_utilisation.autoroute} />
              <ProfileBar label="Famille" score={profil_utilisation.famille} />
              <ProfileBar label="Plaisir" score={profil_utilisation.plaisir} />
            </div>
            {profil_utilisation.tags?.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {profil_utilisation.tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-0.5 rounded-md text-text-secondary">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
