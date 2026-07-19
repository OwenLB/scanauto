// VEHICLE_FIELDS, VEHICLE_DEFAULTS, normalizeVehicle — chargés depuis vehicleSchema.js

const DEFAULT_APP_URL = 'https://scanauto.netlify.app'

function $(id) { return document.getElementById(id) }

function showState(name) {
  for (const s of ['not-lbc', 'loading', 'filled']) {
    $(`state-${s}`)?.classList.toggle('active', s === name)
  }
}

function setVal(id, value) {
  const el = $(id)
  if (!el || value == null || value === '') return
  el.value = value
}

let _fullData = {}
let _currentTab = null

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const { version } = chrome.runtime.getManifest()
  $('version-tag').textContent = `v${version}`

  const { appUrl } = await chrome.storage.sync.get('appUrl')
  $('app-url-input').value = appUrl || DEFAULT_APP_URL
  $('app-url-input').addEventListener('change', () => {
    chrome.storage.sync.set({ appUrl: $('app-url-input').value.trim() })
  })

  $('rescrape-btn').addEventListener('click', () => scrape(_currentTab))
  $('analyze-btn').addEventListener('click', launchAnalysis)

  await checkAndScrape()
}

// ── Detect tab and auto-scrape ────────────────────────────────────────────────

async function checkAndScrape() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  _currentTab = tab
  const isLbc = tab?.url?.includes('leboncoin.fr') && tab?.url?.includes('/ad/')

  if (!isLbc) {
    showState('not-lbc')
    return
  }

  await scrape(tab)
}

// ── Scrape ───────────────────────────────────────────────────────────────────

async function scrape(tab) {
  if (!tab) return
  showState('loading')

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_LISTING_DATA' })
    const data = response?.data

    if (!data || Object.keys(data).length === 0) {
      throw new Error('Aucune donnée extraite — rechargez la page et réessayez.')
    }

    _fullData = data
    fillForm(data, response.url || tab.url)
    $('filled-url').textContent = response.url || tab.url
    showState('filled')

  } catch (err) {
    const el = $('state-not-lbc')
    el.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 12px;color:#ef4444">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <p style="color:#f87171;margin-bottom:12px">${err.message || "Erreur d'extraction."}</p>
      <button class="retry-btn" id="retry-btn">↻ Réessayer</button>
    `
    showState('not-lbc')
    $('retry-btn')?.addEventListener('click', checkAndScrape)
  }
}

// ── Fill form ─────────────────────────────────────────────────────────────────

function fillForm(data, url) {
  const normalized = normalizeVehicle({ ...data, lien_annonce: url || data.lien_annonce })
  for (const [key, value] of Object.entries(normalized)) {
    setVal(key, value)
  }

  // Affichage debug des images
  const grid = $('images-grid')
  if (grid) {
    const images = Array.isArray(data.images) ? data.images : []
    if (images.length > 0) {
      grid.innerHTML = images.map(src =>
        `<img src="${src}" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;background:#222" onerror="this.style.display='none'" />`
      ).join('')
    } else {
      grid.innerHTML = '<p style="color:#666;font-size:11px;padding:4px 0">Aucune image détectée</p>'
    }
  }
}

// ── Launch analysis ───────────────────────────────────────────────────────────

function launchAnalysis() {
  // Lire tous les champs du schéma depuis le formulaire
  const formValues = {}
  for (const field of VEHICLE_FIELDS) {
    const el = $(field.key)
    if (!el) continue
    const raw = el.value
    formValues[field.key] = (field.type === 'number')
      ? (parseInt(raw) || null)
      : (raw.trim() || null)
  }

  if (!formValues.marque && !formValues.modele && !formValues.prix) {
    const msg = $('error-msg')
    msg.textContent = 'Renseignez au moins marque, modèle ou prix'
    msg.style.display = 'block'
    setTimeout(() => { msg.style.display = 'none' }, 3000)
    return
  }

  // _fullData en base (champs extra du scrape), form values par-dessus
  const vehicule = { ..._fullData, ...formValues }

  const appUrl = ($('app-url-input').value.trim() || DEFAULT_APP_URL).replace(/\/$/, '')
  const target = `${appUrl}/#/?prefill=${encodeURIComponent(JSON.stringify(vehicule))}`
  chrome.tabs.create({ url: target })
}

init().catch(console.error)
