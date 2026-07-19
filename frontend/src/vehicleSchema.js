// ── Vehicle Schema — implémentation JS du schéma canonique ───────────────
// Source de vérité : vehicle-schema.json à la racine du repo
//
// Ce fichier = chrome-extension/vehicleSchema.js + export ESM à la fin.
// Pour ajouter un champ : mettre à jour vehicle-schema.json PUIS les deux vehicleSchema.js

const VEHICLE_FIELDS = [
  // ── Type ──────────────────────────────────────────────────────────────────
  { key: 'vehicle_type',        type: 'select',   label: 'Type de véhicule',      section: 'vehicule', default: 'voiture',
    options: [
      { value: 'voiture', label: 'Voiture' },
      { value: 'moto',    label: 'Moto' },
    ],
  },
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
  // ── Moto uniquement ───────────────────────────────────────────────────────
  { key: 'cylindree',           type: 'number',   label: 'Cylindrée (cm³)',       section: 'vehicule', motoOnly: true },
  { key: 'type_moto',           type: 'select',   label: 'Type de moto',          section: 'vehicule', motoOnly: true,
    options: [
      { value: '',           label: '—' },
      { value: 'roadster',   label: 'Roadster / Naked' },
      { value: 'sportive',   label: 'Sportive' },
      { value: 'trail',      label: 'Trail / Adventure' },
      { value: 'custom',     label: 'Custom / Cruiser' },
      { value: 'scooter',    label: 'Scooter' },
      { value: 'enduro',     label: 'Enduro / Supermoto' },
    ],
  },
  { key: 'permis_requis',       type: 'select',   label: 'Permis requis',         section: 'vehicule', motoOnly: true,
    options: [
      { value: '',    label: '—' },
      { value: 'A1',  label: 'A1 (125cc / 11kW)' },
      { value: 'A2',  label: 'A2 (35kW max)' },
      { value: 'A',   label: 'A (accès libre)' },
    ],
  },
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
  // ── Annonce ───────────────────────────────────────────────────────────────
  { key: 'infos_cles',          type: 'textarea', label: 'Infos clés (LBC)',      section: 'annonce', rows: 6 },
  { key: 'description',         type: 'textarea', label: 'Description',           section: 'annonce', rows: 5 },
  { key: 'lien_annonce',        type: 'url',      label: "Lien de l'annonce",    section: 'annonce' },
]

const VEHICLE_DEFAULTS = Object.fromEntries(
  VEHICLE_FIELDS.map(f => [f.key, f.default !== undefined ? f.default : ''])
)

function normalizeVehicle(raw) {
  let boite = raw.boite || ''
  if (boite) {
    const b = boite.toLowerCase()
    boite = b.includes('auto') ? 'automatique' : b.includes('man') ? 'manuelle' : ''
  }

  let vendeur_type = raw.vendeur_type || ''
  if (!vendeur_type && raw.type_vendeur) {
    vendeur_type = raw.type_vendeur === 'Professionnel' ? 'pro' : 'particulier'
  }

  let carnet_entretien = raw.carnet_entretien || ''
  if (!carnet_entretien && raw.historique) {
    const h = raw.historique.toLowerCase()
    if (h.includes("carnet d'entretien disponible") || h.includes('carnet disponible')) carnet_entretien = 'oui'
    else if (h.includes('carnet')) carnet_entretien = 'non'
  }

  return {
    vehicle_type:         raw.vehicle_type         || VEHICLE_DEFAULTS.vehicle_type,
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
    cylindree:            raw.cylindree            ? String(raw.cylindree)        : '',
    type_moto:            raw.type_moto            || '',
    permis_requis:        raw.permis_requis        || '',
    vendeur_type:         vendeur_type             || VEHICLE_DEFAULTS.vendeur_type,
    vendeur_localisation: raw.vendeur_localisation || raw.ville || '',
    date_mise_en_ligne:   raw.date_mise_en_ligne   || '',
    ct_valide:            raw.ct_valide            || VEHICLE_DEFAULTS.ct_valide,
    carnet_entretien:     carnet_entretien         || VEHICLE_DEFAULTS.carnet_entretien,
    infos_cles:           raw.infos_cles           || '',
    description:          raw.description          || '',
    lien_annonce:         raw.lien_annonce         || '',
  }
}

export { VEHICLE_FIELDS, VEHICLE_DEFAULTS, normalizeVehicle }
