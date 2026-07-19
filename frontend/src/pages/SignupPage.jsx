import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function SignupPage({ onNavigate }) {
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    setLoading(true)
    const { data, error } = await signup(email, password)
    if (error) {
      setError(error.message)
    } else if (data?.session) {
      // Email confirmation désactivée — session retournée immédiatement
      onNavigate('home')
    } else {
      // Email confirmation activée — l'utilisateur doit cliquer sur le lien
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-full max-w-sm mx-4 p-8 bg-card rounded-2xl border border-border shadow-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-lg font-semibold text-text mb-2">Vérifiez vos emails</h2>
          <p className="text-sm text-text-secondary mb-6">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="text-sm text-accent hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm mx-4 p-8 bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <ScanLine size={20} className="text-text" />
          <span className="font-bold text-lg text-text">ScanAuto</span>
        </div>

        <h1 className="text-xl font-semibold text-text mb-1">Créer un compte</h1>
        <p className="text-sm text-text-secondary mb-6">Sauvegardez et retrouvez vos analyses</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1.5">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-[var(--accent-fg)] py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Déjà un compte ?{' '}
          <button onClick={() => onNavigate('login')} className="text-accent hover:underline font-medium">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
