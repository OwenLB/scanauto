import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ text, label = 'Copier' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="text-xs bg-transparent border border-border hover:border-border-hover text-text-secondary hover:text-text px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-600 dark:text-green-400" />
          Copié
        </>
      ) : (
        <>
          <Copy size={12} />
          {label}
        </>
      )}
    </button>
  )
}
