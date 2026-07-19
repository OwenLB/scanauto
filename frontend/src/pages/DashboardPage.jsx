import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Trash2, ChevronRight, Car, ExternalLink, Loader2, Folder,
  Plus, Pencil, Check, X, FolderInput, Search, ChevronDown, ArrowUpDown, MessageCircle, GitCompare,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getScoreTier } from '@/utils/scoreConfig'
import DashboardChatPanel from '@/components/Report/DashboardChatPanel'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── cache module-level ───────────────────────────────────────────────────
import { dashboardCache } from '@/utils/dashboardCache'

const GROUP_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

const PRIX_RANGE_DEFAULT  = [0, 80000]
const SCORE_RANGE_DEFAULT = [0, 100]
const KM_RANGE_DEFAULT    = [0, 300000]

const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Plus récents' },
  { value: 'date_asc',   label: 'Plus anciens' },
  { value: 'prix_asc',   label: 'Prix ↑' },
  { value: 'prix_desc',  label: 'Prix ↓' },
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc',  label: 'Score ↑' },
  { value: 'km_asc',     label: 'Km ↑' },
  { value: 'km_desc',    label: 'Km ↓' },
]

const CARBU_OPTIONS = [
  { value: 'essence',    label: 'Essence' },
  { value: 'diesel',     label: 'Diesel' },
  { value: 'hybride',    label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
]

const TYPE_OPTIONS = [
  { value: null,       label: 'Tous' },
  { value: 'voiture',  label: 'Voiture' },
  { value: 'moto',     label: 'Moto' },
]

const DEFAULT_FILTERS = {
  search: '', prix: null, score: null, km: null, carburant: null, type: null, sort: 'date_desc',
}

// ─── filtres / tri ────────────────────────────────────────────────────────

function applyFilters(analyses, filters) {
  let r = analyses

  if (filters.search) {
    const q = filters.search.toLowerCase()
    r = r.filter(a => {
      const v = a.vehicule || {}
      return [v.marque, v.modele, v.annee, v.finition, v.motorisation]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }

  if (filters.prix) {
    const [lo, hi] = filters.prix
    r = r.filter(a => { const p = a.vehicule?.prix; return p != null && p >= lo && p <= hi })
  }

  if (filters.score) {
    const [lo, hi] = filters.score
    r = r.filter(a => { const s = a.r2?.score_global; return s != null && s >= lo && s <= hi })
  }

  if (filters.km) {
    const [lo, hi] = filters.km
    r = r.filter(a => { const k = a.vehicule?.kilometrage; return k != null && k >= lo && k <= hi })
  }

  if (filters.carburant) {
    r = r.filter(a => {
      const c = (a.vehicule?.carburant || '').toLowerCase()
      if (filters.carburant === 'essence')    return c.includes('essence') && !c.includes('hybride')
      if (filters.carburant === 'diesel')     return c.includes('diesel')
      if (filters.carburant === 'hybride')    return c.includes('hybride')
      if (filters.carburant === 'electrique') return c.includes('electr') || c.includes('bev')
      return true
    })
  }

  if (filters.type) {
    r = r.filter(a => (a.vehicule?.vehicle_type || 'voiture') === filters.type)
  }

  r = [...r].sort((a, b) => {
    switch (filters.sort) {
      case 'date_asc':   return new Date(a.created_at) - new Date(b.created_at)
      case 'prix_asc':   return (a.vehicule?.prix || 0) - (b.vehicule?.prix || 0)
      case 'prix_desc':  return (b.vehicule?.prix || 0) - (a.vehicule?.prix || 0)
      case 'score_desc': return (b.r2?.score_global || 0) - (a.r2?.score_global || 0)
      case 'score_asc':  return (a.r2?.score_global || 0) - (b.r2?.score_global || 0)
      case 'km_asc':     return (a.vehicule?.kilometrage || 0) - (b.vehicule?.kilometrage || 0)
      case 'km_desc':    return (b.vehicule?.kilometrage || 0) - (a.vehicule?.kilometrage || 0)
      default:           return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  return r
}

// ─── useDropdown ──────────────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return { open, setOpen, ref }
}

// ─── DualSlider ───────────────────────────────────────────────────────────

function DualSlider({ min, max, value, onChange, step = 1 }) {
  const [lo, hi] = value
  const pct = v => ((v - min) / (max - min)) * 100

  const thumbCls = `
    absolute w-full h-0 appearance-none bg-transparent cursor-pointer
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text
    [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-card
    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
    [&::-webkit-slider-thumb]:hover:scale-110
    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-text
    [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-card
    [&::-moz-range-thumb]:shadow-md
  `

  return (
    <div className="relative flex items-center h-6">
      <div className="absolute w-full h-1 bg-border rounded-full">
        <div className="absolute h-full bg-accent rounded-full" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={lo}
        onChange={e => onChange([Math.min(+e.target.value, hi - step), hi])}
        className={thumbCls} style={{ zIndex: lo > max - (max - min) * 0.1 ? 5 : 3 }}
      />
      <input type="range" min={min} max={max} step={step} value={hi}
        onChange={e => onChange([lo, Math.max(+e.target.value, lo + step)])}
        className={thumbCls} style={{ zIndex: 4 }}
      />
    </div>
  )
}

// ─── chip style helper ─────────────────────────────────────────────────────

const chipCls = (active) =>
  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors whitespace-nowrap cursor-pointer ${
    active
      ? 'bg-accent/10 border-accent/40 text-accent font-medium'
      : 'border-border text-text-secondary hover:border-[var(--border-hover)] hover:text-text'
  }`

// ─── RangeFilter ──────────────────────────────────────────────────────────

function RangeFilter({ label, value, defaultRange, onChange, step = 1, format }) {
  const { open, setOpen, ref } = useDropdown()
  const [local, setLocal] = useState(value ?? defaultRange)

  // sync local when filter is cleared externally
  useEffect(() => { if (!value) setLocal(defaultRange) }, [value])

  const isActive = !!value
  const isDirty = local[0] !== defaultRange[0] || local[1] !== defaultRange[1]

  const apply = () => {
    onChange(isDirty ? local : null)
    setOpen(false)
  }

  const reset = e => {
    e.stopPropagation()
    setLocal(defaultRange)
    onChange(null)
    setOpen(false)
  }

  const displayLabel = isActive ? `${format(value[0])} – ${format(value[1])}` : label

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={chipCls(isActive)}>
        {displayLabel}
        {isActive
          ? <X size={11} onClick={reset} />
          : <ChevronDown size={11} />
        }
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 bg-card border border-border rounded-xl shadow-xl p-4 w-64">
          <div className="flex justify-between text-xs font-semibold text-text mb-1">
            <span>{format(local[0])}</span>
            <span>{format(local[1])}</span>
          </div>
          <p className="text-[10px] text-text-tertiary mb-3 text-center">Glissez pour ajuster</p>
          <DualSlider min={defaultRange[0]} max={defaultRange[1]} value={local} onChange={setLocal} step={step} />
          <div className="flex gap-2 mt-5">
            <button onClick={reset} className="flex-1 py-2 text-xs text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors">
              Effacer
            </button>
            <button onClick={apply} className="flex-1 py-2 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity">
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FilterSelect ─────────────────────────────────────────────────────────

function FilterSelect({ label, value, options, onChange }) {
  const { open, setOpen, ref } = useDropdown()
  const active = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={chipCls(!!active)}>
        {active ? active.label : label}
        {active
          ? <X size={11} onClick={e => { e.stopPropagation(); onChange(null) }} />
          : <ChevronDown size={11} />
        }
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[150px]">
          {options.map(o => (
            <button key={o.value}
              onClick={() => { onChange(o.value === value ? null : o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center justify-between gap-4 transition-colors ${o.value === value ? 'text-text' : 'text-text-secondary'}`}
            >
              {o.label}
              {o.value === value && <Check size={12} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SortSelect ───────────────────────────────────────────────────────────

function SortSelect({ value, onChange }) {
  const { open, setOpen, ref } = useDropdown()
  const active = SORT_OPTIONS.find(o => o.value === value)
  const isDefault = value === 'date_desc'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={chipCls(!isDefault)}>
        <ArrowUpDown size={11} className="shrink-0" />
        {active?.label}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
          {SORT_OPTIONS.map(o => (
            <button key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center justify-between gap-4 transition-colors ${o.value === value ? 'text-text font-medium' : 'text-text-secondary'}`}
            >
              {o.label}
              {o.value === value && <Check size={12} className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TypeToggle ───────────────────────────────────────────────────────────

function TypeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5">
      {TYPE_OPTIONS.map(o => (
        <button key={String(o.value)} onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-card text-text shadow-sm border border-border'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onClear, prixRange, scoreRange, kmRange, total, filtered }) {
  const hasActive = filters.search || filters.prix || filters.score || filters.km || filters.carburant || filters.type
  const isFiltering = hasActive || filters.sort !== 'date_desc'

  return (
    <div className="mb-5 space-y-2">
      {/* Ligne 1 : recherche + tri */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            value={filters.search}
            onChange={e => onChange('search', e.target.value)}
            placeholder="Rechercher par marque, modèle…"
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-[var(--border-hover)] transition-colors placeholder:text-text-tertiary"
          />
          {filters.search && (
            <button onClick={() => onChange('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text">
              <X size={13} />
            </button>
          )}
        </div>
        <SortSelect value={filters.sort} onChange={v => onChange('sort', v)} />
      </div>

      {/* Ligne 2 : filtres chips — scroll horizontal, no wrap */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
        <TypeToggle value={filters.type} onChange={v => onChange('type', v)} />
        <div className="w-px h-4 bg-border shrink-0" />
        <RangeFilter label="Prix" value={filters.prix} defaultRange={prixRange} onChange={v => onChange('prix', v)} step={500} format={v => v.toLocaleString('fr-FR') + ' €'} />
        <RangeFilter label="Score" value={filters.score} defaultRange={scoreRange} onChange={v => onChange('score', v)} step={1} format={v => v + '/100'} />
        <RangeFilter label="Km" value={filters.km} defaultRange={kmRange} onChange={v => onChange('km', v)} step={5000} format={v => v.toLocaleString('fr-FR') + ' km'} />
        <FilterSelect label="Carburant" value={filters.carburant} options={CARBU_OPTIONS} onChange={v => onChange('carburant', v)} />
      </div>

      {/* Ligne 3 : compteur + effacer (seulement si filtres actifs) */}
      {isFiltering && (
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-xs text-text-tertiary">
            {filtered < total
              ? <><span className="font-medium text-text">{filtered}</span> / {total} analyse{total > 1 ? 's' : ''}</>
              : <>{total} analyse{total > 1 ? 's' : ''}</>
            }
          </p>
          {hasActive && (
            <button onClick={onClear} className="text-xs text-text-tertiary hover:text-text transition-colors">
              Tout effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  if (score == null) return null
  const { tw } = getScoreTier(score)
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tw.badge}`}>
      {score}/100
    </span>
  )
}

// ─── GroupModal ───────────────────────────────────────────────────────────

function GroupModal({ mode = 'create', group = null, groupAnalyses = [], onConfirm, onDelete, onRemoveAnalysis, onClose }) {
  const [name, setName]               = useState(group?.name ?? '')
  const [color, setColor]             = useState(group?.color ?? GROUP_COLORS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const submit = () => {
    if (name.trim()) { onConfirm(name.trim(), color); onClose() }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text">
            {mode === 'create' ? 'Nouveau groupe' : 'Modifier le groupe'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-surface transition-colors">
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] font-medium uppercase tracking-widest text-text-tertiary mb-2">Nom</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="Ex : SUV, Citadines, À voir…"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-[var(--border-hover)] transition-colors placeholder:text-text-tertiary mb-5"
        />

        {mode === 'edit' && groupAnalyses.length > 0 && (
          <>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-text-tertiary mb-2">
              Annonces ({groupAnalyses.length})
            </label>
            <div className="space-y-1 max-h-36 overflow-y-auto mb-5 pr-0.5">
              {groupAnalyses.map(a => {
                const v = a.vehicule || {}
                const label = [v.marque, v.modele, v.annee].filter(Boolean).join(' ') || 'Véhicule'
                return (
                  <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface group/item">
                    <Car size={12} className="text-text-tertiary shrink-0" />
                    <span className="text-xs text-text flex-1 truncate">{label}</span>
                    <button
                      onClick={() => onRemoveAnalysis(a.id)}
                      className="p-0.5 rounded text-text-tertiary hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      title="Retirer du groupe"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <label className="block text-[11px] font-medium uppercase tracking-widest text-text-tertiary mb-3">Couleur</label>
        <div className="flex flex-wrap gap-2.5 mb-6">
          {GROUP_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-transform focus:outline-none"
              style={{
                background: c,
                transform: color === c ? 'scale(1.25)' : 'scale(1)',
                boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : 'none',
              }}
            />
          ))}
        </div>

        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-text-secondary text-center mb-3">
              Supprimer ce groupe ? Les analyses resteront accessibles sans groupe.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary border border-border hover:bg-surface transition-colors">
                Annuler
              </button>
              <button
                onClick={() => { onDelete(); onClose() }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {mode === 'edit' && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl text-red-500 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                title="Supprimer le groupe"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary border border-border hover:bg-surface transition-colors">
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent text-accent-fg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ─── GroupMenu (multi-select) ─────────────────────────────────────────────

function GroupMenu({ groups, currentGroupIds, onToggle, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[190px]"
      onClick={e => e.stopPropagation()}
    >
      {groups.length === 0 && (
        <p className="text-xs text-text-tertiary px-3 py-2">Aucun groupe créé</p>
      )}
      {groups.map(g => {
        const active = currentGroupIds.includes(g.id)
        return (
          <button
            key={g.id}
            className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2.5 transition-colors"
            onClick={() => onToggle(g.id)}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
            <span className="truncate flex-1 text-text-secondary">{g.name}</span>
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              active ? 'bg-text border-text' : 'border-border'
            }`}>
              {active && <Check size={9} className="text-card" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── VehicleCard ──────────────────────────────────────────────────────────

function VehicleCard({ analysis, onOpen, onDelete, groups, onUpdateGroups, compareSelected, onToggleCompare, compareDisabled }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const v = analysis.vehicule || {}
  const score = analysis.r2?.score_global
  const label = [v.marque, v.modele, v.annee].filter(Boolean).join(' ') || 'Véhicule'
  const km    = v.kilometrage ? `${v.kilometrage.toLocaleString('fr-FR')} km` : null
  const prix  = v.prix ? `${v.prix.toLocaleString('fr-FR')} €` : null
  const date  = new Date(analysis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const groupIds = analysis.group_ids || []
  const analysisGroups = groups.filter(g => groupIds.includes(g.id))

  const handleToggle = gid => {
    const next = groupIds.includes(gid)
      ? groupIds.filter(id => id !== gid)
      : [...groupIds, gid]
    onUpdateGroups(analysis.id, next)
  }

  return (
    <div
      className={`bg-card border rounded-xl p-4 flex items-center gap-4 hover:border-[var(--border-hover)] transition-colors group cursor-pointer ${compareSelected ? 'border-accent/60 bg-accent/5' : 'border-border'}`}
      onClick={() => onOpen(analysis.id)}
    >
      <div
        onClick={e => { e.stopPropagation(); if (!compareDisabled || compareSelected) onToggleCompare(analysis.id) }}
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden transition-colors ${compareSelected ? 'bg-accent/20 ring-2 ring-accent/40' : 'bg-surface'} ${!compareDisabled || compareSelected ? 'cursor-pointer' : ''}`}
        title={compareSelected ? 'Retirer de la comparaison' : compareDisabled ? 'Maximum 4 véhicules' : 'Comparer'}
      >
        {compareSelected ? (
          <Check size={16} className="text-accent" />
        ) : v.images?.[0] ? (
          <img src={v.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Car size={18} className="text-text-secondary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-text text-sm truncate">{label}</span>
          <ScoreBadge score={score} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {km   && <span className="text-xs text-text-secondary whitespace-nowrap">{km}</span>}
          {prix && <span className="text-xs font-medium text-text-secondary whitespace-nowrap">{prix}</span>}
          <span className="text-xs text-text-tertiary whitespace-nowrap">{date}</span>
          {analysisGroups.length > 0 && (
            <span className="flex items-center gap-1">
              {analysisGroups.map(g => (
                <span key={g.id} className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} title={g.name} />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {v.lien_annonce && (
          <a
            href={v.lien_annonce}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors opacity-0 group-hover:opacity-100"
            title="Voir l'annonce"
          >
            <ExternalLink size={14} />
          </a>
        )}

        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors opacity-0 group-hover:opacity-100"
            title="Gérer les groupes"
          >
            <FolderInput size={14} />
          </button>
          {menuOpen && (
            <GroupMenu
              groups={groups}
              currentGroupIds={groupIds}
              onToggle={handleToggle}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete(analysis.id) }}
          className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
        <ChevronRight size={16} className="text-text-secondary shrink-0" />
      </div>
    </div>
  )
}

// ─── ActiveAnalysisCard ───────────────────────────────────────────────────

function ActiveAnalysisCard({ analysis, onNavigate }) {
  const v = analysis.vehicule || {}
  const label = [v.marque, v.modele, v.annee].filter(Boolean).join(' ') || 'Analyse en cours'
  const progress = analysis.completedSteps.length

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
        <Loader2 size={16} className="text-text-secondary animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-text text-sm truncate block">{label}</span>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-text rounded-full transition-all duration-500" style={{ width: `${(progress / 5) * 100}%` }} />
          </div>
          <span className="text-xs text-text-tertiary font-mono shrink-0">{progress}/5</span>
        </div>
      </div>
      {analysis.analysis_id && (
        <button onClick={() => onNavigate(`rapport/${analysis.analysis_id}`)} className="text-xs text-text-secondary hover:text-text shrink-0">
          Voir →
        </button>
      )}
    </div>
  )
}

// ─── GroupedList ──────────────────────────────────────────────────────────

function GroupedList({ analyses, groups, cardProps }) {
  const sections = []
  for (const g of groups) {
    const items = analyses.filter(a => (a.group_ids || []).includes(g.id))
    if (items.length > 0) sections.push({ group: g, items })
  }
  const ungrouped = analyses.filter(a => !(a.group_ids?.length))
  if (ungrouped.length > 0) sections.push({ group: null, items: ungrouped })

  if (sections.length === 0) return null

  return (
    <div className="space-y-7">
      {sections.map(({ group, items }) => (
        <div key={group?.id || '__none__'}>
          <div className="flex items-center gap-2 mb-3">
            {group
              ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
              : <Folder size={12} className="text-text-tertiary" />
            }
            <p className="text-[11px] font-medium uppercase tracking-widest text-text-tertiary">
              {group ? group.name : 'Sans groupe'}
            </p>
            <span className="text-[11px] text-text-tertiary">· {items.length}</span>
          </div>
          <div className="space-y-2">
            {items.map(a => {
              const ids = cardProps.compareIds || []
              const firstType = ids.length > 0 ? (cardProps.compareFirstType) : null
              const aType = a.vehicule?.vehicle_type || 'voiture'
              const typeMismatch = firstType && aType !== firstType
              return (
                <VehicleCard key={a.id} analysis={a} {...cardProps}
                  compareSelected={ids.includes(a.id)}
                  compareDisabled={!ids.includes(a.id) && (ids.length >= 4 || typeMismatch)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── GroupSidebar (desktop) ───────────────────────────────────────────────

function GroupSidebar({ groups, selectedGroup, onSelect, onOpenCreate, onEditGroup, groupCounts }) {
  return (
    <aside className="hidden md:block w-48 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2 px-1">Groupes</p>

      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
          selectedGroup === null ? 'bg-surface text-text font-medium' : 'text-text-secondary hover:bg-surface hover:text-text'
        }`}
      >
        <Folder size={14} />
        Toutes
        <span className="ml-auto text-xs text-text-tertiary">{groupCounts.__all__}</span>
      </button>

      {groups.map(g => (
        <div key={g.id} className="relative flex items-center">
          <button
            onClick={() => onSelect(g.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 pr-8 ${
              selectedGroup === g.id ? 'bg-surface text-text font-medium' : 'text-text-secondary hover:bg-surface hover:text-text'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
            <span className="truncate flex-1 text-left">{g.name}</span>
            <span className="text-xs text-text-tertiary">{groupCounts[g.id] ?? 0}</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEditGroup(g) }}
            className="absolute right-1.5 p-1 rounded text-text-tertiary hover:text-text hover:bg-border opacity-0 hover:opacity-100 transition-opacity [.relative:hover_&]:opacity-100"
            title="Modifier"
          >
            <Pencil size={11} />
          </button>
        </div>
      ))}

      <button
        onClick={onOpenCreate}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text hover:bg-surface transition-colors mt-1"
      >
        <Plus size={13} />
        Nouveau groupe
      </button>
    </aside>
  )
}

// ─── GroupTabBar (mobile) ─────────────────────────────────────────────────

function GroupTabBar({ groups, selectedGroup, onSelect, onOpenCreate, groupCounts }) {
  return (
    <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none -mx-4 px-4">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
          selectedGroup === null
            ? 'bg-text text-card border-transparent'
            : 'border-border text-text-secondary bg-card hover:text-text'
        }`}
      >
        Toutes
        <span className={`text-[10px] ${selectedGroup === null ? 'opacity-70' : 'text-text-tertiary'}`}>{groupCounts.__all__}</span>
      </button>

      {groups.map(g => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
            selectedGroup === g.id
              ? 'bg-text text-card border-transparent'
              : 'border-border text-text-secondary bg-card hover:text-text'
          }`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
          {g.name}
          <span className={`text-[10px] ${selectedGroup === g.id ? 'opacity-70' : 'text-text-tertiary'}`}>{groupCounts[g.id] ?? 0}</span>
        </button>
      ))}

      <button
        onClick={onOpenCreate}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-dashed border-border text-text-tertiary hover:text-text hover:border-[var(--border-hover)] transition-colors shrink-0"
      >
        <Plus size={11} />
        Groupe
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function DashboardPage({ onNavigate, activeAnalyses = [] }) {
  const { session } = useAuth()
  const token = session?.access_token

  const [analyses, setAnalyses]     = useState(() =>
    dashboardCache.token === token && dashboardCache.analyses ? dashboardCache.analyses : []
  )
  const [loading, setLoading]       = useState(!(dashboardCache.token === token && dashboardCache.analyses))
  const [error, setError]           = useState(null)
  const [groups, setGroups]         = useState(() => dashboardCache.groups || [])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupModal, setGroupModal] = useState(null) // null | { mode, group? }
  const [filters, setFilters]       = useState(DEFAULT_FILTERS)
  const [chatOpen, setChatOpen]     = useState(false)
  const [compareIds, setCompareIds] = useState([])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const load = async () => {
      const needsAnalyses = !(dashboardCache.token === token && dashboardCache.analyses)
      if (needsAnalyses) setLoading(true)
      setError(null)

      try {
        const fetches = []
        if (needsAnalyses) {
          fetches.push(
            fetch(`${API_URL}/api/analyses/`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
          )
        }
        fetches.push(
          fetch(`${API_URL}/api/groups/`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        )

        const results = await Promise.all(fetches)
        const gRes = results[needsAnalyses ? 1 : 0]
        const gData = await gRes.json()
        dashboardCache.groups = gData.groups || []
        setGroups(dashboardCache.groups)

        if (needsAnalyses) {
          const aData = await results[0].json()
          if (!results[0].ok) throw new Error(aData.error || 'Erreur serveur')
          dashboardCache.analyses = aData.analyses || []
          dashboardCache.token = token
          setAnalyses(dashboardCache.analyses)
        }
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette analyse ?')) return
    try {
      await fetch(`${API_URL}/api/analyses/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const next = (dashboardCache.analyses ?? []).filter(a => a.id !== id)
      dashboardCache.analyses = next
      setAnalyses(prev => prev.filter(a => a.id !== id))
    } catch { alert('Erreur lors de la suppression') }
  }

  const handleRemoveFromGroup = (analysisId, groupId) => {
    const analysis = analyses.find(a => a.id === analysisId)
    if (!analysis) return
    handleUpdateGroups(analysisId, (analysis.group_ids || []).filter(id => id !== groupId))
  }

  const handleUpdateGroups = async (analysisId, groupIds) => {
    try {
      await fetch(`${API_URL}/api/analyses/${analysisId}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_ids: groupIds }),
      })
      const next = analyses.map(a => a.id === analysisId ? { ...a, group_ids: groupIds } : a)
      dashboardCache.analyses = next
      setAnalyses(next)
    } catch { alert('Erreur lors de la mise à jour des groupes') }
  }

  const handleAddGroup = async (name, color) => {
    try {
      const res = await fetch(`${API_URL}/api/groups/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      const g = await res.json()
      setGroups(prev => [...prev, g])
    } catch { alert('Erreur lors de la création du groupe') }
  }

  const handleEditGroup = async (id, name, color) => {
    try {
      await fetch(`${API_URL}/api/groups/${id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name, color } : g))
    } catch { alert('Erreur lors de la modification du groupe') }
  }

  const handleDeleteGroup = async (id) => {
    try {
      await fetch(`${API_URL}/api/groups/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setGroups(prev => prev.filter(g => g.id !== id))
      const next = analyses.map(a => ({
        ...a,
        group_ids: (a.group_ids || []).filter(gid => gid !== id),
      }))
      dashboardCache.analyses = next
      setAnalyses(next)
      if (selectedGroup === id) setSelectedGroup(null)
    } catch { alert('Erreur lors de la suppression du groupe') }
  }

  const changeFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }))
  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  const scopedAnalyses = selectedGroup === null
    ? analyses
    : analyses.filter(a => (a.group_ids || []).includes(selectedGroup))

  const displayAnalyses = useMemo(() => applyFilters(scopedAnalyses, filters), [scopedAnalyses, filters])

  const groupCounts = useMemo(() => ({
    __all__: analyses.length,
    ...Object.fromEntries(groups.map(g => [g.id, analyses.filter(a => (a.group_ids || []).includes(g.id)).length])),
  }), [analyses, groups])

  const dynamicRanges = useMemo(() => {
    const prices = analyses.map(a => a.vehicule?.prix).filter(p => p != null && p > 0)
    const scores = analyses.map(a => a.r2?.score_global).filter(s => s != null)
    const kms    = analyses.map(a => a.vehicule?.kilometrage).filter(k => k != null && k > 0)
    const prixMin  = prices.length ? Math.floor(Math.min(...prices) / 500) * 500  : PRIX_RANGE_DEFAULT[0]
    const prixMax  = prices.length ? Math.ceil(Math.max(...prices)  / 500) * 500  : PRIX_RANGE_DEFAULT[1]
    const scoreMin = scores.length ? Math.floor(Math.min(...scores))               : SCORE_RANGE_DEFAULT[0]
    const scoreMax = scores.length ? Math.ceil(Math.max(...scores))                : SCORE_RANGE_DEFAULT[1]
    const kmMin    = kms.length    ? Math.floor(Math.min(...kms)    / 5000) * 5000 : KM_RANGE_DEFAULT[0]
    const kmMax    = kms.length    ? Math.ceil(Math.max(...kms)     / 5000) * 5000 : KM_RANGE_DEFAULT[1]
    return {
      prix:  prixMin  < prixMax  ? [prixMin,  prixMax]  : PRIX_RANGE_DEFAULT,
      score: scoreMin < scoreMax ? [scoreMin, scoreMax] : SCORE_RANGE_DEFAULT,
      km:    kmMin    < kmMax    ? [kmMin,    kmMax]     : KM_RANGE_DEFAULT,
    }
  }, [analyses])

  const hasActiveFilters = !!(filters.search || filters.prix || filters.score || filters.km || filters.carburant || filters.type)
  const isSortActive     = filters.sort !== 'date_desc'
  const showGrouped      = selectedGroup === null && !hasActiveFilters && !isSortActive

  const inProgress = activeAnalyses.filter(a => a.status === 'loading')

  const selectedGroupObj = groups.find(g => g.id === selectedGroup) ?? null

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 4) return prev
      // Bloquer le mélange voiture / moto
      if (prev.length > 0) {
        const firstType = analyses.find(a => a.id === prev[0])?.vehicule?.vehicle_type || 'voiture'
        const newType = analyses.find(a => a.id === id)?.vehicule?.vehicle_type || 'voiture'
        if (firstType !== newType) return prev
      }
      return [...prev, id]
    })
  }

  const cardProps = {
    onOpen: id => onNavigate(`rapport/${id}`),
    onDelete: handleDelete,
    groups,
    onUpdateGroups: handleUpdateGroups,
    compareIds,
    compareFirstType: compareIds.length > 0 ? (analyses.find(a => a.id === compareIds[0])?.vehicule?.vehicle_type || 'voiture') : null,
    onToggleCompare: toggleCompare,
  }

  return (
    <div className="flex-1">
      {/* Floating chat button — décalé à gauche sur mobile pour éviter la barre comparaison */}
      {groupCounts.__all__ > 0 && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 md:right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-fg,white)] shadow-lg hover:opacity-90 transition-opacity z-40 text-sm font-medium"
        >
          <MessageCircle size={15} />
          <span className="hidden sm:inline">Chat IA</span>
        </button>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-text">Mes analyses</h1>
        </div>
        <p className="text-sm text-text-secondary mb-4 md:mb-6">
          {analyses.length > 0
            ? `${analyses.length} analyse${analyses.length > 1 ? 's' : ''} sauvegardée${analyses.length > 1 ? 's' : ''}`
            : ''}
        </p>

        {/* Groupes mobile — tabs scrollables */}
        <GroupTabBar
          groups={groups}
          selectedGroup={selectedGroup}
          onSelect={setSelectedGroup}
          onOpenCreate={() => setGroupModal({ mode: 'create' })}
          groupCounts={groupCounts}
        />

        <div className="flex gap-8">
          <GroupSidebar
            groups={groups}
            selectedGroup={selectedGroup}
            onSelect={setSelectedGroup}
            onOpenCreate={() => setGroupModal({ mode: 'create' })}
            onEditGroup={g => setGroupModal({ mode: 'edit', group: g })}
            groupCounts={groupCounts}
          />

          {groupModal && (
            <GroupModal
              mode={groupModal.mode}
              group={groupModal.group}
              groupAnalyses={
                groupModal.mode === 'edit'
                  ? analyses.filter(a => (a.group_ids || []).includes(groupModal.group?.id))
                  : []
              }
              onConfirm={(name, color) => {
                if (groupModal.mode === 'create') handleAddGroup(name, color)
                else handleEditGroup(groupModal.group.id, name, color)
              }}
              onDelete={groupModal.mode === 'edit' ? () => handleDeleteGroup(groupModal.group.id) : undefined}
              onRemoveAnalysis={groupModal.mode === 'edit'
                ? (analysisId) => handleRemoveFromGroup(analysisId, groupModal.group.id)
                : undefined
              }
              onClose={() => setGroupModal(null)}
            />
          )}

          <DashboardChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            initialScope={selectedGroup ? 'group' : 'all'}
            initialGroupId={selectedGroup}
            groups={groups}
            analysisCount={selectedGroup ? groupCounts[selectedGroup] : groupCounts.__all__}
          />

          <div className="flex-1 min-w-0">
            {/* Group detail header — desktop seulement (mobile = tab active) */}
            {selectedGroupObj && (
              <div className="hidden md:flex items-center gap-3 mb-5 pb-4 border-b border-border">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedGroupObj.color }} />
                <h2 className="font-semibold text-text">{selectedGroupObj.name}</h2>
                <span className="text-sm text-text-tertiary">{groupCounts[selectedGroup] ?? 0} véhicule{(groupCounts[selectedGroup] ?? 0) > 1 ? 's' : ''}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setGroupModal({ mode: 'edit', group: selectedGroupObj })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary border border-border hover:bg-surface hover:text-text transition-colors"
                  >
                    <Pencil size={11} />
                    Modifier
                  </button>
                </div>
              </div>
            )}

            {inProgress.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-3">En cours</p>
                <div className="space-y-2">
                  {inProgress.map(a => <ActiveAnalysisCard key={a.id} analysis={a} onNavigate={onNavigate} />)}
                </div>
              </div>
            )}

            {!loading && !error && analyses.length > 0 && (
              <FilterBar
                filters={filters}
                onChange={changeFilter}
                onClear={clearFilters}
                prixRange={dynamicRanges.prix}
                scoreRange={dynamicRanges.score}
                kmRange={dynamicRanges.km}
                total={scopedAnalyses.length}
                filtered={displayAnalyses.length}
              />
            )}

            {loading && (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 h-[72px] animate-pulse" />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                Erreur : {error}
              </div>
            )}

            {!loading && !error && displayAnalyses.length === 0 && (
              <div className="text-center py-16 text-text-secondary">
                <Car size={40} className="mx-auto mb-3 opacity-30" />
                {hasActiveFilters || isSortActive ? (
                  <>
                    <p className="font-medium text-text mb-1">Aucun résultat</p>
                    <p className="text-sm mb-3">Aucune analyse ne correspond aux filtres actifs</p>
                    <button onClick={clearFilters} className="text-sm text-text-secondary hover:text-text underline">Effacer les filtres</button>
                  </>
                ) : selectedGroup ? (
                  <>
                    <p className="font-medium text-text mb-1">Ce groupe est vide</p>
                    <p className="text-sm">Déplacez des analyses ici via le bouton <FolderInput size={13} className="inline" /></p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-text mb-1">Aucune analyse sauvegardée</p>
                    <p className="text-sm mb-4">Analysez votre premier véhicule pour le voir ici</p>
                    <button onClick={() => onNavigate('home')} className="text-sm text-text-secondary hover:text-text underline">Lancer une analyse →</button>
                  </>
                )}
              </div>
            )}

            {!loading && !error && displayAnalyses.length > 0 && (
              showGrouped
                ? <GroupedList analyses={displayAnalyses} groups={groups} cardProps={cardProps} />
                : (
                  <div className="space-y-2">
                    {displayAnalyses.map(a => {
                      const firstType = compareIds.length > 0 ? (analyses.find(x => x.id === compareIds[0])?.vehicule?.vehicle_type || 'voiture') : null
                      const aType = a.vehicule?.vehicle_type || 'voiture'
                      const typeMismatch = firstType && aType !== firstType
                      return (
                        <VehicleCard
                          key={a.id} analysis={a} {...cardProps}
                          compareSelected={compareIds.includes(a.id)}
                          compareDisabled={!compareIds.includes(a.id) && (compareIds.length >= 4 || typeMismatch)}
                        />
                      )
                    })}
                  </div>
                )
            )}
          </div>
        </div>
      </main>

      {compareIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-full px-5 py-3 shadow-xl no-print">
          <GitCompare size={15} className="text-text-secondary shrink-0" />
          <span className="text-sm text-text-secondary">{compareIds.length} véhicule{compareIds.length > 1 ? 's' : ''} sélectionné{compareIds.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => { onNavigate(`comparison/${compareIds.join(',')}`) }}
            className="px-3 py-1.5 bg-accent text-accent-fg rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Comparer
          </button>
          <button onClick={() => setCompareIds([])} className="text-text-tertiary hover:text-text transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
