import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await login(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onNavigate('home')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm mx-4 p-8 bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <ScanLine size={20} className="text-text" />
          <span className="font-bold text-lg text-text">ScanAuto</span>
        </div>

        <h1 className="text-xl font-semibold text-text mb-1">Connexion</h1>
        <p className="text-sm text-text-secondary mb-6">Accédez à vos analyses sauvegardées</p>

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
              autoComplete="current-password"
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
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Pas de compte ?{' '}
          <button onClick={() => onNavigate('signup')} className="text-accent hover:underline font-medium">
            Créer un compte
          </button>
        </p>

        <p className="text-sm text-text-secondary text-center mt-2">
          <button onClick={() => onNavigate('home')} className="hover:underline">
            Continuer sans compte →
          </button>
        </p>
      </div>
    </div>
  )
}
