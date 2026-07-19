import { ScanLine, ArrowRight, Zap, ShieldCheck, TrendingDown, Clock, Star, ChevronRight, Puzzle, MousePointerClick, FileText } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Analyse en 60 secondes',
    desc: 'Collez une annonce leboncoin, lacentrale ou AutoScout24. L\'IA extrait, calcule et vous livre un verdict complet en moins d\'une minute.',
  },
  {
    icon: ShieldCheck,
    title: 'Fiabilité moteur',
    desc: 'Historique de fiabilité sur la motorisation exacte, points de vigilance spécifiques au modèle, et risques cachés à inspecter.',
  },
  {
    icon: TrendingDown,
    title: 'Prix & négociation',
    desc: 'Positionnement marché précis, marge de négociation estimée et arguments concrets pour faire baisser le prix.',
  },
  {
    icon: Clock,
    title: 'Coûts sur 5 ans',
    desc: 'Projection des coûts réels : carburant, assurance, entretien, réparations prévisibles — tout sur un horizon 5 ans.',
  },
]

const STEPS = [
  { n: '01', title: 'Collez l\'annonce', desc: 'URL ou texte brut, depuis n\'importe quelle plateforme.' },
  { n: '02', title: 'L\'IA analyse', desc: '5 appels Claude en parallèle : extraction, scoring, fiabilité, coûts, négociation.' },
  { n: '03', title: 'Décidez en confiance', desc: 'Rapport complet, score global, et recommandation claire : acheter ou passer.' },
]

export default function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ScanLine size={16} className="text-text" />
            <span className="font-bold text-[15px]">ScanAuto</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={() => onNavigate('analyze')}
              className="flex items-center gap-1.5 bg-accent text-accent-fg text-sm font-medium px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Analyser <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 border border-border rounded-full px-3.5 py-1 text-xs text-text-secondary mb-8 bg-surface">
          <Star size={10} className="fill-text-secondary text-text-secondary" />
          Alimenté par Claude — Analyse en temps réel
        </div>

        <h1
          className="font-display font-bold leading-[1.08] tracking-tight mb-5"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}
        >
          Achetez votre prochaine voiture
          <br />
          <span className="text-text-secondary">sans mauvaise surprise.</span>
        </h1>

        <p className="text-text-secondary text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Collez une annonce. ScanAuto l'analyse avec l'IA et vous donne&nbsp;: score global,
          fiabilité moteur, coûts réels et stratégie de négociation.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onNavigate('analyze')}
            className="flex items-center gap-2 bg-accent text-accent-fg font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Analyser une annonce <ArrowRight size={14} />
          </button>
          <button
            onClick={() => onNavigate('signup')}
            className="flex items-center gap-2 border border-border text-text-secondary hover:text-text hover:border-[var(--border-hover)] px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Créer un compte gratuit
          </button>
        </div>

        <p className="mt-5 text-xs text-text-tertiary">Aucune carte bancaire requise &nbsp;·&nbsp; Résultat en &lt; 60 s</p>
      </section>

      {/* Mock rapport preview */}
      <section className="px-5 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
            {/* Barre de titre fictive */}
            <div className="border-b border-border px-5 py-3 flex items-center gap-2 bg-surface">
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="ml-3 text-xs text-text-tertiary">Rapport — Peugeot 308 1.5 BlueHDi 2020</span>
            </div>
            <div className="p-5 space-y-3">
              {/* Score row */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-text-tertiary uppercase tracking-widest font-medium">Score global</div>
                  <div className="font-display font-bold text-3xl">7.4 <span className="text-text-tertiary text-base font-normal">/ 10</span></div>
                </div>
                <div className="flex gap-2">
                  {['Extraction', 'Scoring', 'Fiabilité', 'Coûts', 'Négociation'].map((s, i) => (
                    <div key={s} className="flex items-center gap-1.5 border border-border rounded-full px-2.5 py-1 text-[11px] text-text-secondary bg-surface">
                      <div className={`w-1.5 h-1.5 rounded-full ${i < 3 ? 'bg-text' : 'bg-border animate-pulse'}`} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: 'Prix marché', val: '14 500 €', sub: 'Annonce à 15 200 €' },
                  { label: 'Coût 5 ans', val: '28 700 €', sub: 'Carb. + entretien + assur.' },
                  { label: 'Marge négociation', val: '−700 €', sub: 'Argument : révision due' },
                ].map(c => (
                  <div key={c.label} className="bg-surface border border-border rounded-xl p-3.5">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-widest mb-1">{c.label}</div>
                    <div className="font-display font-semibold text-lg">{c.val}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-5 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-3">
              Tout ce dont vous avez besoin<br />pour acheter sereinement
            </h2>
            <p className="text-text-secondary max-w-md mx-auto text-sm leading-relaxed">
              Un rapport structuré en 5 sections, généré par plusieurs modèles Claude spécialisés.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group border border-border rounded-xl p-6 bg-card hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center mb-4 group-hover:border-[var(--border-hover)] transition-colors">
                  <Icon size={15} className="text-text-secondary" />
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extension Chrome */}
      <section className="border-t border-border px-5 py-24 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Texte */}
            <div>
              <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 text-xs text-text-secondary mb-6 bg-card">
                <Puzzle size={11} />
                Extension Chrome
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-4">
                Analysez en un clic,<br />directement sur leboncoin
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-8 max-w-md">
                Installez l'extension ScanAuto pour Chrome. Un panneau latéral s'ouvre sur la page
                de l'annonce — scraping automatique, zéro copier-coller.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: MousePointerClick, text: 'Un clic sur l\'icône ScanAuto sur leboncoin.fr' },
                  { icon: FileText, text: 'Les données de l\'annonce sont extraites automatiquement' },
                  { icon: Zap, text: 'Le rapport complet s\'affiche dans le panneau latéral' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={12} className="text-text-secondary" />
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-accent text-accent-fg font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 8.727a3.273 3.273 0 1 1 0 6.545 3.273 3.273 0 0 1 0-6.545z"/>
                </svg>
                Installer sur Chrome
              </a>
            </div>

            {/* Mock extension panel */}
            <div className="relative">
              <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm max-w-xs mx-auto lg:mx-0 lg:ml-auto">
                {/* Chrome topbar mock */}
                <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                  </div>
                  <div className="flex-1 bg-card border border-border rounded px-2.5 py-1 text-[10px] text-text-tertiary mx-2">
                    leboncoin.fr/voitures/123456…
                  </div>
                  <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shrink-0">
                    <ScanLine size={10} className="text-accent-fg" />
                  </div>
                </div>
                {/* Sidepanel content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ScanLine size={13} className="text-text" />
                    <span className="font-bold text-sm">ScanAuto</span>
                    <span className="ml-auto text-[10px] text-text-tertiary border border-border rounded-full px-2 py-0.5">leboncoin</span>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-3">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-widest mb-1">Véhicule détecté</div>
                    <div className="font-semibold text-sm">Renault Clio V 1.0 TCe</div>
                    <div className="text-xs text-text-secondary">2021 · 42 000 km · 13 900 €</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface border border-border rounded-lg p-2.5">
                      <div className="text-[9px] text-text-tertiary uppercase tracking-widest mb-0.5">Score</div>
                      <div className="font-display font-bold text-base">8.1<span className="text-text-tertiary text-xs font-normal">/10</span></div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-2.5">
                      <div className="text-[9px] text-text-tertiary uppercase tracking-widest mb-0.5">Négociation</div>
                      <div className="font-display font-bold text-base text-text">−400 €</div>
                    </div>
                  </div>
                  <button className="w-full bg-accent text-accent-fg text-xs font-medium py-2 rounded-lg">
                    Voir le rapport complet →
                  </button>
                </div>
              </div>
              {/* Badge flottant */}
              <div className="absolute -top-3 -right-3 lg:-right-4 bg-card border border-border rounded-full px-3 py-1.5 text-xs font-medium shadow-sm hidden sm:flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-text" />
                Scraping auto
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-5 py-24 bg-surface">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-3">
              Comment ça marche
            </h2>
          </div>

          <div className="space-y-0">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className={`flex gap-8 ${i < STEPS.length - 1 ? 'pb-10' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
                    <span className="font-display font-semibold text-xs text-text-secondary">{n}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="w-px flex-1 mt-2 bg-border" />}
                </div>
                <div className="pb-2 pt-1.5">
                  <h3 className="font-semibold text-[15px] mb-1">{title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border px-5 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-4">
            Prêt à analyser votre prochaine annonce ?
          </h2>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Gratuit, sans inscription. Créez un compte pour sauvegarder vos rapports et comparer plusieurs véhicules.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('analyze')}
              className="flex items-center gap-2 bg-accent text-accent-fg font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Analyser maintenant <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors text-sm"
            >
              Créer un compte <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ScanLine size={14} className="text-text-tertiary" />
            <span className="text-text-tertiary text-xs font-medium">ScanAuto</span>
          </div>
          <p className="text-text-tertiary text-xs">
            Propulsé par Claude · Anthropic
          </p>
        </div>
      </footer>

    </div>
  )
}
