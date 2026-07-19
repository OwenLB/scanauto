export const SCORE_TIERS = [
  {
    min: 80,
    verdict: 'Excellent',
    hex: '#16A34A',
    tw: {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500',
      badge: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50',
    },
  },
  {
    min: 60,
    verdict: 'Bon',
    hex: '#2563EB',
    tw: {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
    },
  },
  {
    min: 40,
    verdict: 'Moyen',
    hex: '#D97706',
    tw: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
    },
  },
  {
    min: 0,
    verdict: 'Risqué',
    hex: '#DC2626',
    tw: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500',
      badge: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
    },
  },
]

export function getScoreTier(score) {
  return SCORE_TIERS.find(t => score >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1]
}

export function getVerdictTier(verdict) {
  return SCORE_TIERS.find(t => t.verdict === verdict) ?? SCORE_TIERS[2]
}
