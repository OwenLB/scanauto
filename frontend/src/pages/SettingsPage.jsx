import { useState, useEffect } from 'react'
import { Key, Trash2, Check, AlertTriangle, Moon, Sun, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function SettingsPage({ theme, onToggleTheme }) {
  const { session, hasApiKey, refreshApiKey } = useAuth()
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [rateLimitEnabled, setRateLimitEnabled] = useState(true)
  const [rateLimitSaving, setRateLimitSaving] = useState(false)

  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_URL}/api/user/settings/`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => { if (typeof d.rate_limit_enabled === 'boolean') setRateLimitEnabled(d.rate_limit_enabled) })
      .catch(() => {})
  }, [session?.access_token])

  const toggleRateLimit = async () => {
    const next = !rateLimitEnabled
    setRateLimitSaving(true)
    try {
      await fetch(`${API_URL}/api/user/settings/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rate_limit_enabled: next }),
      })
      setRateLimitEnabled(next)
    } catch {
      // silently ignore, state stays unchanged
    } finally {
      setRateLimitSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/user/api-key/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ api_key: newKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setNewKey('')
      setSuccess(true)
      refreshApiKey(session.access_token)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer votre clé API ? Vous ne pourrez plus lancer d\'analyses.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/user/api-key/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      refreshApiKey(session.access_token)
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex-1">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-text mb-1">Paramètres</h1>
        <p className="text-sm text-text-secondary mb-8">Gérez votre clé API et vos préférences</p>

        {/* Thème */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
              {theme === 'dark' ? <Moon size={16} className="text-text-secondary" /> : <Sun size={16} className="text-text-secondary" />}
            </div>
            <div>
              <h2 className="font-medium text-text text-sm">Apparence</h2>
              <p className="text-xs text-text-secondary mt-0.5">{theme === 'dark' ? 'Mode sombre actif' : 'Mode clair actif'}</p>
            </div>
          </div>
          <button
            onClick={onToggleTheme}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface hover:text-text transition-colors"
          >
            {theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
          </button>
        </div>

        {/* Rate limiting */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
              <Shield size={16} className="text-text-secondary" />
            </div>
            <div>
              <h2 className="font-medium text-text text-sm">Limite d'utilisation</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {rateLimitEnabled
                  ? 'Activée — 20 analyses · 60 scrapes · 100 messages par heure'
                  : 'Désactivée — aucune limite appliquée'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleRateLimit}
            disabled={rateLimitSaving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${rateLimitEnabled ? 'bg-accent' : 'bg-border'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${rateLimitEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Clé API */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Key size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="font-medium text-text text-sm">Clé API Anthropic</h2>
              <p className="text-xs mt-0.5">
                {hasApiKey ? (
                  <span className="flex items-center gap-1 text-green-500">
                    <Check size={11} /> Clé configurée
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle size={11} /> Aucune clé configurée
                  </span>
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary block mb-1.5">
                {hasApiKey ? 'Remplacer la clé' : 'Nouvelle clé'}
              </label>
              <input
                type="password"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="sk-ant-..."
                required
                autoComplete="off"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              />
            </div>

            <p className="text-xs text-text-secondary">
              La clé est chiffrée avant d'être stockée.{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Obtenir une clé →
              </a>
            </p>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">Clé enregistrée avec succès</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !newKey.trim()}
                className="flex-1 bg-accent text-[var(--accent-fg)] py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : hasApiKey ? 'Mettre à jour' : 'Enregistrer'}
              </button>
              {hasApiKey && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-red-500 hover:border-red-500/40 transition-colors disabled:opacity-60"
                  title="Supprimer la clé"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
