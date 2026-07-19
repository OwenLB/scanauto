import { useState } from 'react'
import { Share2, Link } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ShareButton({ analysisId, initialShared = false }) {
  const { session } = useAuth()
  const [shared, setShared] = useState(initialShared)
  const [copying, setCopying] = useState(false)

  const toggle = async () => {
    if (!session || !analysisId) return
    const next = !shared
    setShared(next)
    try {
      await fetch(`${API_URL}/api/analyses/${analysisId}/share/`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {
      setShared(!next)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/#/public/${analysisId}`)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  if (!analysisId) return null

  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${shared ? 'border-accent/50 text-accent bg-accent/10' : 'border-border text-text-tertiary hover:text-text'}`}
      >
        <Share2 size={11} />
        {shared ? 'Partagé' : 'Partager'}
      </button>
      {shared && (
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-text-tertiary hover:text-text transition-colors"
        >
          <Link size={11} />
          {copying ? 'Copié !' : 'Copier le lien'}
        </button>
      )}
    </div>
  )
}
