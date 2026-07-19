import { useState } from 'react'
import { ScanLine, Key } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ApiKeySetupPage() {
  const { session, refreshApiKey } = useAuth()
  const [key, setKey] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/user/api-key/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ api_key: key.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      refreshApiKey(session.access_token)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md mx-4 p-8 bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <ScanLine size={20} className="text-text" />
          <span className="font-bold text-lg text-text">ScanAuto</span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Key size={16} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text">Clé API Anthropic</h1>
        </div>
        <p className="text-sm text-text-secondary mb-6">
          ScanAuto utilise votre propre clé API pour générer les analyses. Elle est chiffrée et stockée de façon sécurisée — jamais partagée.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1.5">Votre clé API</label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-..."
              required
              autoComplete="off"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>

          <p className="text-xs text-text-secondary">
            Obtenez votre clé sur{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              console.anthropic.com
            </a>
          </p>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-accent text-[var(--accent-fg)] py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
        </form>
      </div>
    </div>
  )
}
