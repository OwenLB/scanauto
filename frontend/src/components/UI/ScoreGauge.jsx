import { getScoreTier } from '../../utils/scoreConfig.js'

export default function ScoreGauge({ score, size = 120 }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const dashOffset = circumference * (1 - pct)

  const { hex: color } = getScoreTier(score)
  const textColor = color

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="50" y="46" textAnchor="middle" fill={textColor} fontSize="20" fontWeight="bold" fontFamily="ui-monospace, monospace">{score}</text>
      <text x="50" y="60" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">/100</text>
    </svg>
  )
}
