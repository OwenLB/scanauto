// Runs on leboncoin.fr listing pages
// Extracts vehicle data and stores it in chrome.storage.session

// ── Helpers ───────────────────────────────────────────────────────────────

function parseJsonLd() {
  try {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      let json
      try { json = JSON.parse(script.textContent) } catch { continue }

      // Accept any LD that looks like a vehicle listing — LBC doesn't always use @type:"Vehicle"
      const looksLikeVehicle = json['@type'] === 'Vehicle'
        || json.mileageFromOdometer
        || json.vehicleModelDate
        || (json.brand && json.model)

      if (!looksLikeVehicle) continue

      return {
        marque:      json.brand?.name                          || '',
        modele:      json.model                                || '',
        annee:       parseInt(json.vehicleModelDate)           || null,
        kilometrage: parseInt(json.mileageFromOdometer?.value) || null,
        couleur:     json.color                                || '',
        boite:       json.vehicleTransmission                  || '',
        nb_portes:   json.numberOfDoors                        || null,
        nb_places:   json.vehicleSeatingCapacity               || null,
        prix:        json.offers?.price                        || null,
        description: json.description                          || '',
      }
    }
  } catch {}
  return {}
}

// Extract the value from a criteria_item_* div.
// LBC structure can vary — try multiple strategies before giving up.
function criteriaValue(el) {
  if (!el) return ''

  // Strategy 1: first <p> with a title attribute — the value cell uses <p title="VALUE">
  // Do NOT use [title] because the outer value div also has title= (the label name)
  const pWithTitle = el.querySelector('p[title]')
  if (pWithTitle) {
    const v = (pWithTitle.getAttribute('title') || '').trim()
    if (v && v.length < 500) return v
  }

  // Strategy 2: last <p> in the element (label=first, value=last)
  const allP = [...el.querySelectorAll('p')]
  if (allP.length >= 2) {
    for (let i = allP.length - 1; i >= 1; i--) {
      const v = allP[i].textContent.trim()
      if (v) return v
    }
  } else if (allP.length === 1) {
    const v = allP[0].textContent.trim()
    if (v) return v
  }

  // Strategy 3: class-based — "body" / "value" without "caption" / "label"
  for (const el2 of el.querySelectorAll('p, span')) {
    const cls = el2.className || ''
    if ((cls.includes('body') || cls.includes('value')) && !cls.includes('caption') && !cls.includes('label')) {
      const v = (el2.getAttribute('title') || el2.textContent).trim()
      if (v) return v
    }
  }

  // Strategy 4: all spans — last non-empty one is likely the value
  const allSpans = [...el.querySelectorAll('span')]
  for (let i = allSpans.length - 1; i >= 0; i--) {
    const v = allSpans[i].textContent.trim()
    if (v && v.length < 100) return v
  }

  return ''
}

// Build a free-text block from ALL criteria items in "Les informations clés".
// Uses the label text (p.text-caption) + criteriaValue() so every custom field
// added by the seller is automatically captured.
function extractInfosCles() {
  // LBC splits criteria across two divs (first 8 in criteria_container, rest in a sibling div)
  // so we query ALL criteria_item_* anywhere in the document instead of one container
  const lines = []
  for (const item of document.querySelectorAll('[data-qa-id^="criteria_item_"]')) {
    const label = item.querySelector('p.text-caption, p[class*="caption"]')?.textContent?.trim()
    const value = criteriaValue(item)
    if (label && value && value !== 'Non renseignée') {
      lines.push(`${label} : ${value}`)
    }
  }
  return lines.join('\n')
}

// ── Image extractor ───────────────────────────────────────────────────────

function extractImages() {
  const images = []

  // Galerie principale LBC : section[aria-label="Aller à la galerie de photos"]
  // Structure : section > button > picture > source[] + img
  const gallery = document.querySelector('section[aria-label="Aller à la galerie de photos"]')
  if (gallery) {
    for (const btn of gallery.querySelectorAll('button')) {
      const picture = btn.querySelector('picture')
      if (!picture) continue

      // Préférer classified-1200x800-jpg (meilleure qualité non-webp)
      const sources = [...picture.querySelectorAll('source')]
      const best = sources.find(s => s.getAttribute('srcset')?.includes('classified-1200x800-jpg'))
        || sources.find(s => s.getAttribute('srcset')?.includes('classified-800x533-jpg'))
      const url = best?.getAttribute('srcset') || picture.querySelector('img')?.getAttribute('src')

      if (url && url.startsWith('http')) images.push(url)
      if (images.length >= 3) return images
    }
  }

  // Fallback JSON-LD
  if (images.length === 0) {
    try {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        let json
        try { json = JSON.parse(script.textContent) } catch { continue }
        if (!json.image) continue
        const raw = Array.isArray(json.image) ? json.image : [json.image]
        for (const item of raw) {
          const url = typeof item === 'string' ? item : (item?.url || item?.contentUrl || '')
          if (url && url.startsWith('http')) images.push(url)
          if (images.length >= 3) return images
        }
        if (images.length > 0) break
      }
    } catch {}
  }

  return images
}

// ── Main extractor ────────────────────────────────────────────────────────

function extractLeboncoinData() {
  // Start with JSON-LD (reliable, no DOM class dependency)
  const data = parseJsonLd()

  // ── Title ──────────────────────────────────────────────────────────
  data.titre = document.querySelector('h1[data-qa-id="adview_title"]')?.textContent?.trim()
    || document.querySelector('h1')?.textContent?.trim() || ''

  // ── Price (from DOM too, as JSON-LD can miss it) ────────────────────
  if (!data.prix) {
    const priceSelectors = [
      '[data-qa-id="adview_price"] p',
      '[data-qa-id="adview_price"]',
      '[data-test-id="price"]',
      'span[aria-label*="prix"]',
      'p[aria-label*="prix"]',
    ]
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel)
      if (!el) continue
      const raw = parseInt(el.textContent.replace(/\s/g, '').replace(/[^\d]/g, ''))
      if (!isNaN(raw) && raw > 500) { data.prix = raw; break }
    }
  }

  // ── Criteria items (data-qa-id="criteria_item_XXX") ────────────────
  const criteriaMap = {
    criteria_item_u_car_brand:            'marque',
    criteria_item_u_car_model:            'modele',
    criteria_item_regdate:                '_annee',
    criteria_item_mileage:                '_km',
    criteria_item_fuel:                   'carburant',
    criteria_item_gearbox:                'boite',
    criteria_item_doors:                  '_nb_portes',
    criteria_item_seats:                  '_nb_places',
    criteria_item_u_car_finition:         'finition',
    criteria_item_u_car_version:          'version',
    criteria_item_issuance_date:          'date_mise_en_circulation',
    criteria_item_vehicle_damage:         'etat',
    criteria_item_vehicle_type:           'type_vehicule',
    criteria_item_vehicle_upholstery:     'sellerie',
    criteria_item_vehicle_specifications: 'historique',
    criteria_item_vehicule_color:         'couleur',
    criteria_item_horsepower:             '_cv',
    criteria_item_horse_power_din:        '_din',
    // Moto-specific
    criteria_item_u_moto_cylindree:       '_cylindree',
    criteria_item_cylinder_capacity:      '_cylindree',
    criteria_item_u_moto_permis:          'permis_requis',
    criteria_item_driving_licence:        'permis_requis',
  }

  for (const [qaId, field] of Object.entries(criteriaMap)) {
    const el = document.querySelector(`[data-qa-id="${qaId}"]`)
    const val = criteriaValue(el)
    if (!val || val === 'Non renseignée') continue
    data[field] = val
  }

  // Parse numeric criteria
  if (data._annee) {
    const yr = parseInt(data._annee)
    if (!isNaN(yr) && !data.annee) data.annee = yr
  }
  if (data._km) {
    const km = parseInt(data._km.replace(/\s/g, '').replace(/[^\d]/g, ''))
    if (!isNaN(km) && !data.kilometrage) data.kilometrage = km
  }
  if (data._nb_portes) {
    const d = parseInt(data._nb_portes)
    if (!isNaN(d) && !data.nb_portes) data.nb_portes = d
  }
  if (data._nb_places) {
    const s = parseInt(data._nb_places)
    if (!isNaN(s) && !data.nb_places) data.nb_places = s
  }
  if (data._cv) {
    const cv = parseInt(data._cv.replace(/[^\d]/g, ''))
    if (!isNaN(cv)) data.puissance_fiscale = cv
  }
  if (data._din) {
    const din = parseInt(data._din.replace(/[^\d]/g, ''))
    if (!isNaN(din)) data.puissance_din = din
  }
  if (data._cylindree) {
    const cc = parseInt(data._cylindree.replace(/[^\d]/g, ''))
    if (!isNaN(cc)) data.cylindree = cc
  }
  for (const k of Object.keys(data)) {
    if (k.startsWith('_')) delete data[k]
  }

  // ── Vehicle type ───────────────────────────────────────────────────────
  data.vehicle_type = window.location.pathname.includes('/motos') ? 'moto' : 'voiture'

  // ── Infos clés (full section as free text) ────────────────────────────
  // Captures ALL criteria including custom fields added by the seller
  data.infos_cles = extractInfosCles()

  // ── Spotlight fallback: year, km, fuel ────────────────────────────────
  // The spotlight area ("2017 · 183 000 km · Diesel") is always visible
  const spotlight = document.querySelector('[data-qa-id="adview_spotlight_description_container"]')
  const spotText = spotlight?.textContent || ''

  if (!data.annee) {
    const m = spotText.match(/\b(19|20)\d{2}\b/)
    if (m) data.annee = parseInt(m[0])
  }
  if (!data.kilometrage) {
    const m = spotText.match(/([\d][\d\s]*)\s*km/i)
    if (m) {
      const km = parseInt(m[1].replace(/\s/g, ''))
      if (!isNaN(km) && km > 0) data.kilometrage = km
    }
  }
  if (!data.carburant) {
    const m = spotText.match(/\b(Diesel|Essence|Hybride|Électrique|Electrique|GPL|Hydrogène)\b/i)
    if (m) data.carburant = m[0]
  }

  // ── Description ────────────────────────────────────────────────────
  const descContainer = document.querySelector('[data-qa-id="adview_description_container"]')
  const descEl = document.querySelector('#readme-content')
    || descContainer?.querySelector('p.whitespace-pre-line')
    || descContainer?.querySelector('p:first-of-type')
  if (descEl) {
    const domText = descEl.textContent?.trim() || ''
    if (domText.endsWith('…') || domText.endsWith('...')) {
      data.description = data.description || domText
    } else if (domText) {
      data.description = domText
    }
  }
  if (!data.description && descContainer) {
    const clone = descContainer.cloneNode(true)
    clone.querySelectorAll('button').forEach(b => b.remove())
    data.description = clone.textContent?.trim() || ''
  }

  // ── Marque fallback from title ─────────────────────────────────────
  if (!data.marque && data.titre) {
    const twoPart = ['alfa romeo', 'land rover', 'aston martin', 'mercedes benz', 'ds automobiles']
    const lower = data.titre.toLowerCase()
    const found = twoPart.find(b => lower.startsWith(b))
    if (found) {
      data.marque = found.replace(/\b\w/g, c => c.toUpperCase())
    } else {
      data.marque = data.titre.trim().split(/\s+/)[0] || ''
    }
  }

  // ── Location ───────────────────────────────────────────────────────
  const locEl = document.querySelector('#map p[aria-label]')
  if (locEl) {
    data.ville = locEl.getAttribute('aria-label')
  }
  if (!data.ville) {
    const mapLink = document.querySelector('a[href*="#map"]')
    data.ville = mapLink?.textContent?.trim() || ''
  }

  // ── Seller ─────────────────────────────────────────────────────────
  const vendeurH2 = Array.from(document.querySelectorAll('h2'))
    .find(el => el.textContent?.trim() === 'Vendu par')
  if (vendeurH2) {
    const container = vendeurH2.closest('div') || vendeurH2.parentElement
    for (const h2 of container.querySelectorAll('h2')) {
      const text = h2.textContent?.trim()
      if (text && text !== 'Vendu par') { data.vendeur_nom = text; break }
    }
    const proTag = Array.from(container.querySelectorAll('[data-spark-component="tag"]'))
      .find(el => el.textContent?.trim() === 'Pro')
    data.type_vendeur = proTag ? 'Professionnel' : 'Particulier'
  }
  if (!data.type_vendeur) {
    const sideTag = document.querySelector('#aside [data-spark-component="tag"]')
    data.type_vendeur = sideTag?.textContent?.trim() === 'Pro' ? 'Professionnel' : 'Particulier'
  }
  if (!data.vendeur_nom) {
    for (const h2 of document.querySelectorAll('#aside h2')) {
      const text = h2.textContent?.trim()
      if (text) { data.vendeur_nom = text; break }
    }
  }

  // ── Date posted ────────────────────────────────────────────────────
  if (spotlight) {
    for (const span of spotlight.querySelectorAll('span[aria-hidden="true"]')) {
      const raw = span.textContent?.trim()
      if (raw && /^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split('/')
        data.date_mise_en_ligne = `${y}-${m}-${d}`
        break
      }
    }
  }

  // ── Images ─────────────────────────────────────────────────────────────
  data.images = extractImages()

  return data
}

// ── Expand collapsed sections then extract ────────────────────────────────

async function expandAndExtract() {
  const delay = ms => new Promise(r => setTimeout(r, ms))

  // 1. Expand description "Voir plus" if present
  const descContainer = document.querySelector('[data-qa-id="adview_description_container"]')
  if (descContainer) {
    const voirPlus = Array.from(descContainer.querySelectorAll('button'))
      .find(b => b.textContent.trim().toLowerCase() === 'voir plus')
    if (voirPlus) {
      voirPlus.click()
      await delay(500)
    }
  }

  // 2. Expand criteria "Voir plus" if present (second batch of criteria items)
  const criteriaMoreBtn = document.querySelector('[data-qa-id="criteria_more"]')
  if (criteriaMoreBtn && criteriaMoreBtn.textContent.trim().toLowerCase().includes('voir plus')) {
    criteriaMoreBtn.click()
    await delay(300)
  }

  return extractLeboncoinData()
}

// ── Message listener ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_LISTING_DATA') {
    expandAndExtract()
      .then(data => sendResponse({ data, url: window.location.href }))
      .catch(() => sendResponse({ data: extractLeboncoinData(), url: window.location.href }))
  }
  return true // keep channel open for async
})

