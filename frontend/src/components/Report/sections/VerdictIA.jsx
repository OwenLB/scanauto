const verdictConfig = {
  'Excellent': {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800/40',
    label_color: 'text-green-600 dark:text-green-400',
    text_color: 'text-green-900 dark:text-green-100',
    label: 'Recommandé',
  },
  'Bon': {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    label_color: 'text-blue-600 dark:text-blue-400',
    text_color: 'text-blue-900 dark:text-blue-100',
    label: 'Correct',
  },
  'Moyen': {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    label_color: 'text-amber-600 dark:text-amber-400',
    text_color: 'text-amber-900 dark:text-amber-100',
    label: 'À étudier avec précaution',
  },
  'Risqué': {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800/40',
    label_color: 'text-red-600 dark:text-red-400',
    text_color: 'text-red-900 dark:text-red-100',
    label: 'Déconseillé',
  },
}

export default function VerdictIA({ r2 }) {
  const cfg = verdictConfig[r2.verdict] || verdictConfig['Moyen']
  return (
    <div className={`rounded-xl border px-5 py-4 ${cfg.bg} ${cfg.border}`}>
      <p className={`text-sm leading-relaxed ${cfg.text_color}`}>
        {r2.synthese_ia}
      </p>
    </div>
  )
}
