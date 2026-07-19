// ── Vehicle Schema — implémentation JS du schéma canonique ───────────────
// Source de vérité : vehicle-schema.json à la racine du repo
//
// Extension Chrome : chargé comme <script> plain JS
//                    → globals VEHICLE_FIELDS, VEHICLE_DEFAULTS, normalizeVehicle
// Frontend React   : même contenu + export ESM → frontend/src/vehicleSchema.js
// Backend Django   : lit vehicle-schema.json directement au démarrage (views.py)
//
// Pour ajouter un champ : mettre à jour vehicle-schema.json PUIS les deux vehicleSchema.js

const VEHICLE_FIELDS = [
  // ── Véhicule ─────────────────────────────────────────────────────────────
  { key: 'marque',              type: 'text',     label: 'Marque',                section: 'vehicule', required: true },
  { key: 'modele',              type: 'text',     label: 'Modèle',                section: 'vehicule', required: true },
  { key: 'finition',            type: 'text',     label: 'Finition / Version',    section: 'vehicule' },
  { key: 'motorisation',        type: 'text',     label: 'Motorisation',          section: 'vehicule', required: true },
  { key: 'annee',               type: 'number',   label: 'Année',                 section: 'vehicule', required: true },
  { key: 'kilometrage',         type: 'number',   label: 'Kilométrage',           section: 'vehicule', required: true },
  { key: 'carburant',           type: 'select',   label: 'Carburant',             section: 'vehicule', default: 'Diesel',
    options: [
      { value: 'Diesel',       label: 'Diesel' },
      { value: 'Essence',      label: 'Essence' },
      { value: 'Hybride',      label: 'Hybride' },
      { value: 'Électrique',   label: 'Électrique' },
      { value: 'GPL',          label: 'GPL' },
    ],
  },
  { key: 'boite',               type: 'select',   label: 'Boîte',                 section: 'vehicule',
    options: [
      { value: '',             label: '—' },
      { value: 'manuelle',    label: 'Manuelle' },
      { value: 'automatique', label: 'Automatique' },
    ],
  },
  { key: 'prix',                type: 'number',   label: 'Prix (€)',              section: 'vehicule', required: true },
  { key: 'nb_proprietaires',    type: 'number',   label: 'Nb propriétaires',     section: 'vehicule' },
  // ── Vendeur ──────────────────────────────────────────────────────────────
  { key: 'vendeur_type',        type: 'select',   label: 'Type de vendeur',       section: 'vendeur',  default: 'particulier',
    options: [
      { value: 'particulier',  label: 'Particulier' },
      { value: 'pro',          label: 'Professionnel' },
    ],
  },
  { key: 'vendeur_localisation', type: 'text',    label: 'Localisation',          section: 'vendeur' },
  { key: 'date_mise_en_ligne',  type: 'date',     label: 'Date de mise en ligne', section: 'vendeur' },
  // ── Entretien ─────────────────────────────────────────────────────────────
  { key: 'ct_valide',           type: 'select',   label: 'Contrôle technique',    section: 'entretien', default: 'non_mentionné',
    options: [
      { value: 'non_mentionné', label: 'Non mentionné' },
      { value: 'oui',           label: 'Valide' },
      { value: 'non',           label: 'Non valide' },
    ],
  },
  { key: 'carnet_entretien',    type: 'select',   label: "Carnet d'entretien",    section: 'entretien', default: 'non_mentionné',
    options: [
      { value: 'non_mentionné', label: 'Non mentionné' },
      { value: 'oui',           label: 'Présent' },
      { value: 'non',           label: 'Absent' },
    ],
  },
  // ── Moto ─────────────────────────────────────────────────────────────────
  { key: 'vehicle_type',        type: 'select',   label: 'Type de véhicule',      section: 'vehicule', default: 'voiture',
    options: [{ value: 'voiture', label: 'Voiture' }, { value: 'moto', label: 'Moto' }],
  },
  { key: 'cylindree',           type: 'number',   label: 'Cylindrée (cm³)',       section: 'vehicule' },
  { key: 'permis_requis',       type: 'text',     label: 'Permis requis',         section: 'vehicule' },
  // ── Annonce ───────────────────────────────────────────────────────────────
  { key: 'infos_cles',          type: 'textarea', label: 'Infos clés (LBC)',      section: 'annonce', rows: 6 },
  { key: 'description',         type: 'textarea', label: 'Description',           section: 'annonce', rows: 5 },
  { key: 'lien_annonce',        type: 'url',      label: "Lien de l'annonce",    section: 'annonce' },
]

// Valeurs par défaut dérivées du schéma
const VEHICLE_DEFAULTS = Object.fromEntries(
  VEHICLE_FIELDS.map(f => [f.key, f.default !== undefined ? f.default : ''])
)

// Normalise les données brutes (scrape LBC ou formulaire extension) vers le format standard.
// Gère les deux conventions de nommage : champs LBC bruts (type_vendeur, ville, historique)
// et champs normalisés de l'extension (vendeur_type, vendeur_localisation, carnet_entretien).
function normalizeVehicle(raw) {
  // Boîte : "Automatique" / "Manuelle" (LBC) → "automatique" / "manuelle"
  let boite = raw.boite || ''
  if (boite) {
    const b = boite.toLowerCase()
    boite = b.includes('auto') ? 'automatique' : b.includes('man') ? 'manuelle' : ''
  }

  // Vendeur type : extension envoie "pro"/"particulier" ; LBC envoie "Professionnel"/"Particulier"
  let vendeur_type = raw.vendeur_type || ''
  if (!vendeur_type && raw.type_vendeur) {
    vendeur_type = raw.type_vendeur === 'Professionnel' ? 'pro' : 'particulier'
  }

  // Carnet : extension envoie "oui"/"non"/"non_mentionné" ; LBC envoie le champ historique en texte libre
  let carnet_entretien = raw.carnet_entretien || ''
  if (!carnet_entretien && raw.historique) {
    const h = raw.historique.toLowerCase()
    if (h.includes("carnet d'entretien disponible") || h.includes('carnet disponible')) carnet_entretien = 'oui'
    else if (h.includes('carnet')) carnet_entretien = 'non'
  }

  return {
    marque:               raw.marque               || '',
    modele:               raw.modele               || '',
    finition:             raw.finition             || '',
    motorisation:         raw.motorisation         || raw.version || '',
    annee:                raw.annee                ? String(raw.annee)            : '',
    kilometrage:          raw.kilometrage          ? String(raw.kilometrage)      : '',
    carburant:            raw.carburant            || VEHICLE_DEFAULTS.carburant,
    boite,
    prix:                 raw.prix                 ? String(raw.prix)             : '',
    nb_proprietaires:     raw.nb_proprietaires     ? String(raw.nb_proprietaires) : '',
    vendeur_type:         vendeur_type             || VEHICLE_DEFAULTS.vendeur_type,
    vendeur_localisation: raw.vendeur_localisation || raw.ville || '',
    date_mise_en_ligne:   raw.date_mise_en_ligne   || '',
    ct_valide:            raw.ct_valide            || VEHICLE_DEFAULTS.ct_valide,
    carnet_entretien:     carnet_entretien         || VEHICLE_DEFAULTS.carnet_entretien,
    vehicle_type:         raw.vehicle_type         || VEHICLE_DEFAULTS.vehicle_type,
    cylindree:            raw.cylindree            ? String(raw.cylindree)        : '',
    permis_requis:        raw.permis_requis        || '',
    infos_cles:           raw.infos_cles           || '',
    description:          raw.description          || '',
    lien_annonce:         raw.lien_annonce         || '',
  }
}
