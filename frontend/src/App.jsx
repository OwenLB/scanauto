import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { ScanLine, History, Settings2, LogIn, LayoutDashboard } from 'lucide-react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import VehicleForm from './components/Form/VehicleForm.jsx'
import { invalidateDashboardCache } from '@/utils/dashboardCache'

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ReportPage = lazy(() => import('./pages/ReportPage.jsx'))
const ApiKeySetupPage = lazy(() => import('./pages/ApiKeySetupPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const PublicReportPage = lazy(() => import('./pages/PublicReportPage.jsx'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage.jsx'))
const PrintChecklistPage = lazy(() => import('./pages/PrintChecklistPage.jsx'))
import useAnalyses from './hooks/useAnalyses.js'
import useServerStatus from './hooks/useServerStatus.js'
import useToast from './hooks/useToast.js'
import ToastContainer from './components/UI/ToastContainer.jsx'
import { cn } from '@/utils'

const STEP_TOASTS = {
  r1: 'Annonce extraite',
  r2: 'Scoring & fiabilité calculés',
  r5: 'Infos pratiques calculées',
  r3: 'Risques & coûts analysés',
  r4: 'Prix & négociation prêts',
}

function parseHash() {
  const hash = window.location.hash.slice(1) || '/'
  if (hash.startsWith('/rapport/')) return { page: 'rapport', id: hash.slice(9) }
  if (hash.startsWith('/public/')) return { page: 'public', id: hash.slice(8) }
  if (hash.startsWith('/comparison/')) return { page: 'comparison', id: hash.slice(12) }
  if (hash.startsWith('/checklist/')) return { page: 'checklist', id: hash.slice(11) }
  if (hash === '/dashboard') return { page: 'dashboard', id: null }
  if (hash === '/login') return { page: 'login', id: null }
  if (hash === '/signup') return { page: 'signup', id: null }
  if (hash === '/settings') return { page: 'settings', id: null }
  if (hash === '/analyze') return { page: 'analyze', id: null }
  return { page: 'landing', id: null }
}

function QuickAnalyzeModal({ onClose, onSubmit, serverStatus }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { session } = useAuth()
  const API_URL = import.meta.env.VITE_API_URL || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try { new URL(url) } catch { setError('URL invalide'); return }
    setLoading(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`${API_URL}/api/scrape/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur lors du scraping'); setLoading(false); return }
      onClose()
      onSubmit(data.vehicule)
    } catch {
      setError('Erreur réseau — réessayez.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text">Analyser depuis une URL</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.leboncoin.fr/voitures/..."
              autoFocus
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:border-[var(--border-hover)] focus:outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !url.trim() || serverStatus !== 'ready'}
            className="w-full bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={13} className="animate-spin" /> Récupération...</> : 'Analyser →'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Sidebar({ activeNav, onNavigate, user, onLogout }) {
  return (
    <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen no-print">
      <div className="px-4 h-[52px] flex items-center border-b border-border">
        <button onClick={() => onNavigate('analyze')} className="flex items-center gap-2.5">
          <ScanLine size={17} className="text-text" />
          <span className="font-bold text-text text-[15px]">ScanAuto</span>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <button
          onClick={() => onNavigate('analyze')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            activeNav === 'analyze' ? 'bg-surface font-medium text-text' : 'text-text-secondary hover:bg-surface hover:text-text'
          )}
        >
          <ScanLine size={15} className="shrink-0" />
          Analyse
        </button>

        <button
          onClick={() => user ? onNavigate('dashboard') : onNavigate('login')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            activeNav === 'dashboard' ? 'bg-surface font-medium text-text' : 'text-text-secondary hover:bg-surface hover:text-text'
          )}
        >
          <History size={15} className="shrink-0" />
          Historique
        </button>
      </nav>

      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {user && (
          <button
            onClick={() => onNavigate('settings')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              activeNav === 'settings' ? 'bg-surface font-medium text-text' : 'text-text-secondary hover:bg-surface hover:text-text'
            )}
          >
            <Settings2 size={15} className="shrink-0" />
            Paramètres
          </button>
        )}
        <button
          onClick={user ? onLogout : () => onNavigate('login')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface hover:text-text transition-colors"
        >
          <LogIn size={15} className="shrink-0" />
          {user ? 'Déconnexion' : 'Connexion'}
        </button>
      </div>
    </aside>
  )
}

function ServerBanner() {
  return (
    <div className="no-print flex items-center gap-2.5 px-4 py-2 bg-surface border-b border-border text-sm text-text-secondary shrink-0">
      <div className="w-3 h-3 border-[1.5px] border-text-secondary border-t-transparent rounded-full animate-spin shrink-0" />
      <span>Le serveur démarre, les premières requêtes peuvent prendre quelques instants.</span>
    </div>
  )
}

function AppInner() {
  const { user, session, logout, hasApiKey } = useAuth()
  const { analyses, startAnalysis, removeAnalysis } = useAnalyses()
  const serverStatus = useServerStatus()
  const { toasts, addToast } = useToast()
  const completedStepsRef = useRef({})
  const [formKey, setFormKey] = useState(0)

  const [route, setRoute] = useState(parseHash)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Toasts par analyse — évite les doublons entre analyses simultanées
  useEffect(() => {
    for (const a of analyses) {
      const prev = completedStepsRef.current[a.id] || []
      const newSteps = a.completedSteps.filter(s => !prev.includes(s))
      for (const step of newSteps) {
        if (STEP_TOASTS[step]) addToast(STEP_TOASTS[step])
      }
      completedStepsRef.current[a.id] = [...a.completedSteps]

      if (a.status === 'complete' && a.analysis_id && !completedStepsRef.current[`saved_${a.id}`]) {
        completedStepsRef.current[`saved_${a.id}`] = true
        addToast('Analyse sauvegardée dans votre historique')
        invalidateDashboardCache()
      }
    }
  }, [analyses, addToast])

  const navigate = (target) => {
    window.location.hash = (target === 'landing' || target === '') ? '/' : `/${target}`
  }

  const handleSubmit = async (vehiculeData) => {
    const analysisId = await startAnalysis(vehiculeData, session?.access_token || null)
    setFormKey(k => k + 1)
    if (analysisId) {
      navigate(`rapport/${analysisId}`)
    }
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Pages plein-écran (sans sidebar)
  if (route.page === 'landing') return <Suspense fallback={null}><LandingPage onNavigate={navigate} /></Suspense>
  if (route.page === 'login') return <Suspense fallback={null}><LoginPage onNavigate={navigate} /></Suspense>
  if (route.page === 'signup') return <Suspense fallback={null}><SignupPage onNavigate={navigate} /></Suspense>
  if (route.page === 'public') return <Suspense fallback={null}><PublicReportPage analysisId={route.id} onNavigate={navigate} /></Suspense>

  // Auth guard
  if ((route.page === 'dashboard' || route.page === 'rapport' || route.page === 'settings') && !user) {
    navigate('login')
    return null
  }

  // Gate BYOK
  if (user && hasApiKey === false) return <Suspense fallback={null}><ApiKeySetupPage /></Suspense>

  const activeNav = (route.page === 'dashboard' || route.page === 'rapport') ? 'dashboard'
    : route.page === 'settings' ? 'settings'
    : 'analyze'

  let pageContent
  if (route.page === 'dashboard') {
    pageContent = <Suspense fallback={null}><DashboardPage onNavigate={navigate} activeAnalyses={analyses} /></Suspense>
  } else if (route.page === 'rapport') {
    const liveAnalysis = analyses.find(a => a.analysis_id === route.id)
    pageContent = (
      <Suspense fallback={null}>
        <ReportPage
          analysisId={route.id}
          onNavigate={navigate}
          liveAnalysis={liveAnalysis}
          onRemove={liveAnalysis ? () => removeAnalysis(liveAnalysis.id) : null}
        />
      </Suspense>
    )
  } else if (route.page === 'comparison') {
    const ids = route.id ? route.id.split(',').filter(Boolean) : []
    pageContent = <Suspense fallback={null}><ComparisonPage analysisIds={ids} onNavigate={navigate} /></Suspense>
  } else if (route.page === 'checklist') {
    return (
      <Suspense fallback={null}>
        <PrintChecklistPage analysisId={route.id} onBack={() => navigate(`rapport/${route.id}`)} />
      </Suspense>
    )
  } else if (route.page === 'settings') {
    pageContent = <Suspense fallback={null}><SettingsPage theme={theme} onToggleTheme={toggleTheme} /></Suspense>
  } else {
    // route.page === 'analyze' (or any unmatched route with sidebar)
    pageContent = (
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-6">
        <VehicleForm resetSignal={formKey} onSubmit={handleSubmit} serverStatus={serverStatus} accessToken={session?.access_token || null} />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <ToastContainer toasts={toasts} />

      <Sidebar
        activeNav={activeNav}
        onNavigate={navigate}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {serverStatus === 'starting' && <ServerBanner />}
        <header className="md:hidden border-b border-border bg-card sticky top-0 z-50 no-print h-[52px] flex items-center justify-between px-4">
          <button onClick={() => navigate('home')} className="flex items-center gap-2">
            <ScanLine size={16} className="text-text" />
            <span className="font-bold text-text text-base">ScanAuto</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => user ? navigate('dashboard') : navigate('login')}
              className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text transition-colors"
            >
              {user ? <LayoutDashboard size={15} /> : <LogIn size={15} />}
            </button>
            {user && (
              <button
                onClick={() => navigate('settings')}
                className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text transition-colors"
              >
                <Settings2 size={15} />
              </button>
            )}
          </div>
        </header>

        {pageContent}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
