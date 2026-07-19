import { Info, Minus, MessageSquare } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs'
import { Separator } from '@/components/UI/separator'
import CopyButton from '../../UI/CopyButton.jsx'

const positionConfig = {
  'bonne_affaire': { label: 'Bonne affaire', colorClass: 'text-green-600 dark:text-green-400', badgeClass: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50' },
  'dans_la_moyenne': { label: 'Dans la moyenne', colorClass: 'text-blue-600 dark:text-blue-400', badgeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50' },
  'légèrement_surévalué': { label: 'Légèrement surévalué', colorClass: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50' },
  'surévalué': { label: 'Surévalué', colorClass: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50' },
}

function PriceSummary({ analyse_prix, negociation }) {
  const cfg = positionConfig[analyse_prix.positionnement]
  return (
    <Card>
      <CardHeader className="p-5 pb-4">
        <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Prix & Négociation</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        <div>
          <p className="text-xs text-text-secondary mb-1">Fourchette marché</p>
          <p className="text-2xl font-bold font-mono text-text">
            {analyse_prix.fourchette_marche_min?.toLocaleString('fr-FR')} – {analyse_prix.fourchette_marche_max?.toLocaleString('fr-FR')} €
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {cfg && (
              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
            )}
            {analyse_prix.positionnement_pourcentage !== 0 && (
              <span className="text-xs text-text-tertiary">
                {analyse_prix.positionnement_pourcentage > 0 ? '+' : ''}{analyse_prix.positionnement_pourcentage}% vs marché
              </span>
            )}
          </div>
          {analyse_prix.commentaire_age_annonce && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mt-3">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span className="italic">{analyse_prix.commentaire_age_annonce}</span>
            </div>
          )}
        </div>

        {negociation && (
          <>
            <Separator />
            <div>
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm font-semibold text-text">Objectif</p>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                    {negociation.prix_cible?.toLocaleString('fr-FR')} €
                  </p>
                  {negociation.economie_potentielle > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Économie : {negociation.economie_potentielle.toLocaleString('fr-FR')} €
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {negociation.arguments?.map((arg, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Minus size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary">{arg.argument}</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
                      −{arg.impact_euros?.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PriceDetail({ message_vendeur, questions_vendeur, projection_decote }) {
  const hasTabs = message_vendeur || questions_vendeur?.length > 0 || projection_decote
  if (!hasTabs) return null

  const defaultTab = message_vendeur ? 'message' : questions_vendeur?.length > 0 ? 'questions' : 'decote'

  return (
    <Card>
      <CardContent className="p-5">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4">
            {message_vendeur && <TabsTrigger value="message" className="text-xs">Message vendeur</TabsTrigger>}
            {questions_vendeur?.length > 0 && <TabsTrigger value="questions" className="text-xs">Questions ({questions_vendeur.length})</TabsTrigger>}
            {projection_decote && <TabsTrigger value="decote" className="text-xs">Décote</TabsTrigger>}
          </TabsList>

          {message_vendeur && (
            <TabsContent value="message">
              <div className="flex justify-end mb-2">
                <CopyButton text={message_vendeur} label="Copier" />
              </div>
              <pre className="text-xs text-text-secondary font-mono leading-relaxed bg-surface border border-border rounded-lg p-3 whitespace-pre-wrap overflow-x-auto">
                {message_vendeur}
              </pre>
            </TabsContent>
          )}

          {questions_vendeur?.length > 0 && (
            <TabsContent value="questions">
              <div className="space-y-2">
                {questions_vendeur.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MessageSquare size={13} className="text-text-tertiary" />
                      <span className={`text-xs font-mono font-semibold w-4 ${q.priorite === 1 ? 'text-text' : 'text-text-tertiary'}`}>
                        {q.priorite}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm ${q.priorite === 1 ? 'font-semibold text-text' : 'text-text-secondary'}`}>{q.question}</p>
                      {q.point_vigilance_associe && (
                        <p className="text-xs text-text-tertiary mt-0.5">{q.point_vigilance_associe}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {projection_decote && (
            <TabsContent value="decote">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-text-tertiary mb-1">Dans 2 ans</p>
                  <p className="text-base font-bold font-mono text-text">
                    {projection_decote.valeur_2_ans_min?.toLocaleString('fr-FR')}–{projection_decote.valeur_2_ans_max?.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs font-mono text-red-600 dark:text-red-400 mt-0.5">−{projection_decote.pourcentage_2_ans}%</p>
                  <p className="text-xs text-text-tertiary mt-1">{projection_decote.kilometrage_estime_2_ans?.toLocaleString('fr-FR')} km</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-text-tertiary mb-1">Dans 5 ans</p>
                  <p className="text-base font-bold font-mono text-text">
                    {projection_decote.valeur_5_ans_min?.toLocaleString('fr-FR')}–{projection_decote.valeur_5_ans_max?.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs font-mono text-red-600 dark:text-red-400 mt-0.5">−{projection_decote.pourcentage_5_ans}%</p>
                  <p className="text-xs text-text-tertiary mt-1">{projection_decote.kilometrage_estime_5_ans?.toLocaleString('fr-FR')} km</p>
                </div>
              </div>
              {projection_decote.commentaire_revendabilite && (
                <p className="text-xs text-text-secondary">{projection_decote.commentaire_revendabilite}</p>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default function PriceNegotiation({ r4, part }) {
  const { analyse_prix, negociation, message_vendeur, questions_vendeur, projection_decote } = r4

  if (part === 'summary') {
    return <PriceSummary analyse_prix={analyse_prix} negociation={negociation} />
  }

  return <PriceDetail message_vendeur={message_vendeur} questions_vendeur={questions_vendeur} projection_decote={projection_decote} />
}
