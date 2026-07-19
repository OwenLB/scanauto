import { useState, useEffect, useRef } from 'react'
import { Car, User, Wrench, FileText, Loader2, WifiOff, Link } from 'lucide-react'
import { VEHICLE_DEFAULTS, normalizeVehicle } from '../../vehicleSchema.js'

const initialUrlForm = { url: '' }
const initialPasteForm = { description: '' }
const initialManualForm = { ...VEHICLE_DEFAULTS }

const ALLOWED_IMAGE_HOSTS = ['img.leboncoin.fr', 'pictures.lacentrale.fr', 'cdn.autoscout24.com', 'images.lacentrale.fr']
const isSafeImageUrl = (url) => {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))
  } catch { return false }
}

const inputClass = (error) =>
  `w-full bg-surface border ${error ? 'border-red-500' : 'border-border'} rounded-lg px-3 py-2.5 text-text text-sm focus:border-border-hover focus:outline-none transition-colors placeholder:text-text-tertiary`

const selectClass = `w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-text text-sm focus:border-border-hover focus:outline-none transition-colors`

const labelClass = `block text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-1.5`

const RequiredDot = () => <span className="text-red-500 ml-0.5">·</span>

function ServerStatusBanner({ status }) {
  if (status === 'ready') return null
  if (status === 'checking') return (
    <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface border border-border rounded-lg px-3 py-2 mb-4">
      <Loader2 size={13} className="animate-spin shrink-0" />
      Vérification du serveur...
    </div>
  )
  return (
    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 mb-4">
      <WifiOff size={13} className="shrink-0" />
      Serveur en cours de démarrage — cela peut prendre 30 à 60 secondes sur le plan gratuit.
      <Loader2 size={13} className="animate-spin shrink-0 ml-auto" />
    </div>
  )
}

export default function VehicleForm({ onSubmit, serverStatus = 'ready', resetSignal = 0, accessToken = null }) {
  const [mode, setMode] = useState('url')
  const [urlForm, setUrlForm] = useState(initialUrlForm)
  const [pasteForm, setPasteForm] = useState(initialPasteForm)
  const [manualForm, setManualForm] = useState(initialManualForm)
  const [errors, setErrors] = useState({})
  const [prefillImages, setPrefillImages] = useState(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState(null)
  const mounted = useRef(false)

  // Prefill depuis l'extension Chrome (une seule fois au mount)
  useEffect(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return
    const params = new URLSearchParams(hash.slice(queryStart + 1))
    const prefill = params.get('prefill')
    if (!prefill) return
    try {
      const data = JSON.parse(prefill)
      setMode('manual')
      setManualForm(f => ({ ...f, ...normalizeVehicle(data) }))
      if (Array.isArray(data.images) && data.images.length > 0) {
        setPrefillImages(data.images.filter(isSafeImageUrl))
      }
      window.history.replaceState(null, '', window.location.pathname + '#/')
    } catch { /* ignore */ }
  }, [])

  // Reset après submit (sans démonter le composant)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setMode('url')
    setUrlForm(initialUrlForm)
    setPasteForm(initialPasteForm)
    setManualForm(initialManualForm)
    setErrors({})
    setPrefillImages(null)
    setScraping(false)
    setScrapeError(null)
  }, [resetSignal])

  const setU = (key) => (e) => setUrlForm(f => ({ ...f, [key]: e.target.value }))
  const setP = (key) => (e) => setPasteForm(f => ({ ...f, [key]: e.target.value }))
  const setM = (key) => (e) => setManualForm(f => ({ ...f, [key]: e.target.value }))

  const validateUrl = () => {
    const errs = {}
    if (!urlForm.url.trim()) { errs.url = 'URL de l\'annonce requise'; return errs }
    try { new URL(urlForm.url) } catch { errs.url = 'URL invalide' }
    return errs
  }

  const validatePaste = () => {
    const errs = {}
    if (!pasteForm.description.trim()) errs.description = 'Texte de l\'annonce requis'
    return errs
  }

  const validateManual = () => {
    const req = { marque: 'Marque', modele: 'Modèle', annee: 'Année', kilometrage: 'Kilométrage', motorisation: 'Motorisation', prix: 'Prix' }
    const errs = {}
    for (const [k, label] of Object.entries(req)) {
      if (!manualForm[k]) errs[k] = `${label} requis`
    }
    if (manualForm.annee && (manualForm.annee < 1990 || manualForm.annee > 2026)) errs.annee = 'Année invalide'
    return errs
  }

  const API_URL = import.meta.env.VITE_API_URL || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (serverStatus !== 'ready') return
    if (mode === 'url') {
      const errs = validateUrl()
      if (Object.keys(errs).length) { setErrors(errs); return }
      setErrors({})
      setScrapeError(null)
      setScraping(true)
      try {
        const headers = { 'Content-Type': 'application/json' }
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
        const res = await fetch(`${API_URL}/api/scrape/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: urlForm.url.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setScrapeError(data.error || 'Erreur lors du scraping'); setScraping(false); return }
        const { vehicule } = data
        const images = vehicule.images || []
        setManualForm(f => ({ ...f, ...normalizeVehicle(vehicule) }))
        if (images.length > 0) setPrefillImages(images.filter(isSafeImageUrl))
        setMode('manual')
      } catch (err) {
        setScrapeError('Erreur réseau — réessayez.')
      } finally {
        setScraping(false)
      }
      return
    } else if (mode === 'paste') {
      const errs = validatePaste()
      if (Object.keys(errs).length) { setErrors(errs); return }
      setErrors({})
      setScrapeError(null)
      setScraping(true)
      try {
        const headers = { 'Content-Type': 'application/json' }
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
        const res = await fetch(`${API_URL}/api/scrape/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ description: pasteForm.description }),
        })
        const data = await res.json()
        if (!res.ok) { setScrapeError(data.error || 'Erreur lors de l\'extraction'); setScraping(false); return }
        const { vehicule } = data
        setManualForm(f => ({ ...f, ...normalizeVehicle(vehicule) }))
        setMode('manual')
      } catch (err) {
        setScrapeError('Erreur réseau — réessayez.')
      } finally {
        setScraping(false)
      }
      return
    } else {
      const errs = validateManual()
      if (Object.keys(errs).length) { setErrors(errs); return }
      setErrors({})
      onSubmit({
        ...manualForm,
        annee: parseInt(manualForm.annee),
        kilometrage: parseInt(manualForm.kilometrage),
        prix: parseInt(manualForm.prix),
        nb_proprietaires: manualForm.nb_proprietaires ? parseInt(manualForm.nb_proprietaires) : null,
        cylindree: manualForm.cylindree ? parseInt(manualForm.cylindree) : null,
        ...(prefillImages ? { images: prefillImages } : {}),
      })
    }
  }

  const isBlocked = serverStatus !== 'ready'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-text mb-3">
          Analysez votre annonce
        </h1>
        <p className="text-text-secondary text-base max-w-md mx-auto">
          Scoring, fiabilité moteur, points de vigilance et conseils de négociation — en 60 secondes.
        </p>
      </div>

      <ServerStatusBanner status={serverStatus} />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => { setMode('url'); setErrors({}) }}
          className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'url'
              ? 'bg-accent text-accent-fg'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          <Link size={13} />
          URL
        </button>
        <button
          type="button"
          onClick={() => { setMode('paste'); setErrors({}) }}
          className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
            mode === 'paste'
              ? 'bg-accent text-accent-fg'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          Coller
        </button>
        <button
          type="button"
          onClick={() => { setMode('manual'); setErrors({}) }}
          className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
            mode === 'manual'
              ? 'bg-accent text-accent-fg'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          Manuel
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'url' ? (
          /* === URL MODE === */
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <label className={labelClass}>URL de l'annonce<RequiredDot /></label>
              <input
                type="url"
                value={urlForm.url}
                onChange={setU('url')}
                placeholder="https://www.leboncoin.fr/voitures/..."
                className={inputClass(errors.url)}
                autoFocus
              />
              {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url}</p>}
              <p className="text-text-tertiary text-xs mt-2">LeBonCoin, La Centrale, AutoScout24... Les informations sont extraites automatiquement pour vérification.</p>
            </div>

            {scrapeError && (
              <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{scrapeError}</p>
            )}

            <button
              type="submit"
              disabled={isBlocked || scraping}
              className="w-full bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {scraping
                ? <><Loader2 size={14} className="animate-spin" /> Récupération de l'annonce...</>
                : isBlocked ? <><Loader2 size={14} className="animate-spin" /> Serveur en démarrage...</>
                : 'Récupérer l\'annonce →'}
            </button>
          </div>
        ) : mode === 'paste' ? (
          /* === PASTE MODE === */
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Sur LeBonCoin :</span> cliquez sur <span className="font-medium">"Voir les X critères supplémentaires"</span> dans les informations clés pour révéler la version exacte, la finition et l'historique d'entretien avant de copier.
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <label className={labelClass}>Texte de l'annonce<RequiredDot /></label>
              <textarea
                value={pasteForm.description}
                onChange={setP('description')}
                rows={7}
                placeholder="Collez ici la description complète de l'annonce LeBonCoin, La Centrale, AutoScout24..."
                className={`${inputClass(errors.description)} resize-none`}
                style={{ minHeight: '180px' }}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              <p className="text-text-tertiary text-xs mt-2">Les informations seront extraites automatiquement pour vérification avant l'analyse.</p>
            </div>

            {scrapeError && (
              <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{scrapeError}</p>
            )}

            <button
              type="submit"
              disabled={isBlocked || scraping}
              className="w-full bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {scraping
                ? <><Loader2 size={14} className="animate-spin" /> Extraction des données...</>
                : isBlocked ? <><Loader2 size={14} className="animate-spin" /> Serveur en démarrage...</>
                : 'Extraire les données →'}
            </button>
          </div>
        ) : (
          /* === MANUAL MODE === */
          <div className="space-y-4">
            {/* Photos — en haut du formulaire manuel */}
            {prefillImages?.length > 0 && (
              prefillImages.length >= 3 ? (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 h-52 rounded-xl overflow-hidden">
                  <img src={prefillImages[0]} alt="" referrerPolicy="no-referrer" className="row-span-2 w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  <img src={prefillImages[1]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  <img src={prefillImages[2]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                </div>
              ) : prefillImages.length === 2 ? (
                <div className="grid grid-cols-2 gap-1 h-40 rounded-xl overflow-hidden">
                  <img src={prefillImages[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  <img src={prefillImages[1]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                </div>
              ) : (
                <div className="h-40 rounded-xl overflow-hidden">
                  <img src={prefillImages[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                </div>
              )
            )}

            {/* Type de véhicule */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-1.5">
                <Car size={14} />
                Type de véhicule
              </h3>
              <div className="flex gap-2">
                {[{ value: 'voiture', label: 'Voiture' }, { value: 'moto', label: 'Moto' }].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setManualForm(f => ({ ...f, vehicle_type: value }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${manualForm.vehicle_type === value ? 'bg-accent text-accent-fg border-transparent' : 'bg-surface border-border text-text-secondary hover:text-text'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Véhicule */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-1.5">
                <Car size={14} />
                Véhicule
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Marque<RequiredDot /></label>
                  <input type="text" value={manualForm.marque} onChange={setM('marque')} placeholder={manualForm.vehicle_type === 'moto' ? 'Honda' : 'Audi'} className={inputClass(errors.marque)} />
                  {errors.marque && <p className="text-red-500 text-xs mt-1">{errors.marque}</p>}
                </div>
                <div>
                  <label className={labelClass}>Modèle<RequiredDot /></label>
                  <input type="text" value={manualForm.modele} onChange={setM('modele')} placeholder={manualForm.vehicle_type === 'moto' ? 'CB500F' : 'A4'} className={inputClass(errors.modele)} />
                  {errors.modele && <p className="text-red-500 text-xs mt-1">{errors.modele}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Finition / Version</label>
                  <input type="text" value={manualForm.finition} onChange={setM('finition')} placeholder={manualForm.vehicle_type === 'moto' ? 'ABS, Sport...' : 'S-line, Sport, Titanium...'} className={inputClass(false)} />
                </div>
                <div>
                  <label className={labelClass}>Année<RequiredDot /></label>
                  <input type="number" value={manualForm.annee} onChange={setM('annee')} placeholder="2015" min="1990" max="2026" className={inputClass(errors.annee)} />
                  {errors.annee && <p className="text-red-500 text-xs mt-1">{errors.annee}</p>}
                </div>
                <div>
                  <label className={labelClass}>Kilométrage<RequiredDot /></label>
                  <input type="number" value={manualForm.kilometrage} onChange={setM('kilometrage')} placeholder={manualForm.vehicle_type === 'moto' ? '15000' : '120000'} className={inputClass(errors.kilometrage)} />
                  {errors.kilometrage && <p className="text-red-500 text-xs mt-1">{errors.kilometrage}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Motorisation<RequiredDot /></label>
                  <input type="text" value={manualForm.motorisation} onChange={setM('motorisation')} placeholder={manualForm.vehicle_type === 'moto' ? '471cc bicylindre 47ch' : '2.0 TDI 150ch'} className={inputClass(errors.motorisation)} />
                  {errors.motorisation && <p className="text-red-500 text-xs mt-1">{errors.motorisation}</p>}
                </div>
                {manualForm.vehicle_type === 'moto' ? (
                  <>
                    <div>
                      <label className={labelClass}>Cylindrée (cm³)</label>
                      <input type="number" value={manualForm.cylindree} onChange={setM('cylindree')} placeholder="471" className={inputClass(false)} />
                    </div>
                    <div>
                      <label className={labelClass}>Type de moto</label>
                      <select value={manualForm.type_moto} onChange={setM('type_moto')} className={selectClass}>
                        <option value="">—</option>
                        <option value="roadster">Roadster / Naked</option>
                        <option value="sportive">Sportive</option>
                        <option value="trail">Trail / Adventure</option>
                        <option value="custom">Custom / Cruiser</option>
                        <option value="scooter">Scooter</option>
                        <option value="enduro">Enduro / Supermoto</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Permis requis</label>
                      <select value={manualForm.permis_requis} onChange={setM('permis_requis')} className={selectClass}>
                        <option value="">—</option>
                        <option value="A1">A1 (125cc / 11kW)</option>
                        <option value="A2">A2 (35kW max)</option>
                        <option value="A">A (accès libre)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Carburant</label>
                      <select value={manualForm.carburant} onChange={setM('carburant')} className={selectClass}>
                        <option value="Essence">Essence</option>
                        <option value="Électrique">Électrique</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelClass}>Carburant</label>
                      <select value={manualForm.carburant} onChange={setM('carburant')} className={selectClass}>
                        <option value="Diesel">Diesel</option>
                        <option value="Essence">Essence</option>
                        <option value="Hybride">Hybride</option>
                        <option value="Électrique">Électrique</option>
                        <option value="GPL">GPL</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Boîte de vitesses</label>
                      <select value={manualForm.boite} onChange={setM('boite')} className={selectClass}>
                        <option value="">Non précisé</option>
                        <option value="manuelle">Manuelle</option>
                        <option value="automatique">Automatique</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className={labelClass}>Prix demandé (€)<RequiredDot /></label>
                  <input type="number" value={manualForm.prix} onChange={setM('prix')} placeholder={manualForm.vehicle_type === 'moto' ? '4500' : '13300'} className={inputClass(errors.prix)} />
                  {errors.prix && <p className="text-red-500 text-xs mt-1">{errors.prix}</p>}
                </div>
                <div>
                  <label className={labelClass}>Nb de propriétaires</label>
                  <input type="number" value={manualForm.nb_proprietaires} onChange={setM('nb_proprietaires')} placeholder="2" min="1" className={inputClass(false)} />
                </div>
              </div>
            </div>

            {/* Vendeur */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-1.5">
                <User size={14} />
                Vendeur
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type de vendeur</label>
                  <select value={manualForm.vendeur_type} onChange={setM('vendeur_type')} className={selectClass}>
                    <option value="particulier">Particulier</option>
                    <option value="pro">Professionnel</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Localisation</label>
                  <input type="text" value={manualForm.vendeur_localisation} onChange={setM('vendeur_localisation')} placeholder="Paris, 75" className={inputClass(false)} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Date de mise en ligne</label>
                  <input type="date" value={manualForm.date_mise_en_ligne} onChange={setM('date_mise_en_ligne')} className={inputClass(false)} />
                </div>
              </div>
            </div>

            {/* Entretien */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-1.5">
                <Wrench size={14} />
                Entretien
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {manualForm.vehicle_type !== 'moto' && (
                  <div>
                    <label className={labelClass}>Contrôle technique</label>
                    <select value={manualForm.ct_valide} onChange={setM('ct_valide')} className={selectClass}>
                      <option value="oui">Valide</option>
                      <option value="non">Non valide</option>
                      <option value="non_mentionné">Non mentionné</option>
                    </select>
                  </div>
                )}
                <div className={manualForm.vehicle_type === 'moto' ? 'col-span-2' : ''}>
                  <label className={labelClass}>Carnet d'entretien</label>
                  <select value={manualForm.carnet_entretien} onChange={setM('carnet_entretien')} className={selectClass}>
                    <option value="oui">Présent</option>
                    <option value="non">Absent</option>
                    <option value="non_mentionné">Non mentionné</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Annonce */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-1.5">
                <FileText size={14} />
                Annonce
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Infos clés (extrait LBC)</label>
                  <textarea
                    value={manualForm.infos_cles}
                    onChange={setM('infos_cles')}
                    rows={5}
                    placeholder={"Marque : Renault\nModèle : Clio\nKilométrage : 80000 km\n…"}
                    className={`${inputClass(false)} resize-none font-mono text-xs`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Description de l'annonce</label>
                  <textarea
                    value={manualForm.description}
                    onChange={setM('description')}
                    rows={5}
                    placeholder="Options, équipements, état du véhicule, raison de vente..."
                    className={`${inputClass(false)} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lien vers l'annonce</label>
                  <input type="url" value={manualForm.lien_annonce} onChange={setM('lien_annonce')} placeholder="https://www.leboncoin.fr/..." className={inputClass(false)} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBlocked}
              className="w-full bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isBlocked ? <><Loader2 size={14} className="animate-spin" /> Serveur en démarrage...</> : 'Analyser →'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
