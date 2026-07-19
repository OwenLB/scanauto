import { useState, useEffect } from 'react'
import { ScanLine, Printer } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATIC_CHECKLIST = {
  documents: [
    'Carte grise (cohérence avec le vendeur)',
    "Certificat de non-gage (histovec.interieur.gouv.fr)",
    'Contrôle technique valide (< 6 mois)',
    "Carnet d'entretien avec factures",
    'Certificat de cession signé des deux parties',
    'Rapport Histovec ou CarVertical',
  ],
  carrosserie: [
    'Cohérence des teintes (absence de reprises)',
    'Alignement et jeux de carrosserie',
    'Absence de rouille ou boursouflures',
    'État des vitres, joints et joints de portes',
    'Profondeur pneus ≥ 1,6 mm, usure homogène',
    'Tous les éclairages fonctionnels',
  ],
  mecanique: [
    'Niveau et couleur huile moteur',
    'Liquide de refroidissement : niveau et couleur',
    'Aucune fuite sous le véhicule',
    'Aucune fumée bleue / noire au démarrage',
    'Bruits moteur au ralenti (claquements, sifflements)',
    "État visuel des courroies accessoires",
  ],
  essai_routier: [
    'Démarrage à froid — bruits, fumée, ralenti stable',
    'Accélération 0-50 km/h — pas d\'à-coups',
    'Accélération franche 50-100 km/h',
    'Freinage progressif et d\'urgence — trajectoire',
    'Virages lents et rapides — traction, stabilité',
    'Passages de boîte, bruits de roulement',
    'Régime constant 70 km/h / 5 min — vibrations',
  ],
}

const SECTION_LABELS = {
  documents: 'Documents',
  carrosserie: 'Carrosserie',
  mecanique: 'Mécanique',
  essai_routier: 'Essai routier',
}

function CheckRow({ text }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-dashed border-gray-200 last:border-0">
      <div className="w-4 h-4 border border-gray-400 rounded mt-0.5 shrink-0 print:border-gray-600" />
      <span className="text-sm text-gray-700 leading-snug print:text-gray-900">{text}</span>
    </div>
  )
}

export default function PrintChecklistPage({ analysisId, state: stateProp, onBack }) {
  const { session } = useAuth()
  const [state, setStateLocal] = useState(stateProp || null)

  useEffect(() => {
    if (stateProp || !analysisId || !session) return
    fetch(`${API_URL}/api/analyses/${analysisId}/`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setStateLocal(d))
      .catch(() => {})
  }, [analysisId, session, stateProp])

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const vehicule = state?.vehicule || {}
  const r3 = state?.r3
  const r4 = state?.r4

  const vehicleLabel = [vehicule.marque, vehicule.modele, vehicule.annee, vehicule.finition]
    .filter(Boolean).join(' ') || 'Véhicule'

  const prix = vehicule.prix ? vehicule.prix.toLocaleString('fr-FR') + ' €' : null
  const km = vehicule.kilometrage ? vehicule.kilometrage.toLocaleString('fr-FR') + ' km' : null

  const specificItems = r3?.checklist_inspection?.specifique_modele || []
  const vendeurQuestions = r4?.questions_vendeur || []
  const pointsVigilance = r3?.points_vigilance || []

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">← Retour</button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <ScanLine size={15} className="text-gray-700" />
            <span className="font-bold text-gray-900">ScanAuto</span>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          <Printer size={14} />
          Imprimer
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8 print:px-6 print:py-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-900">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vehicleLabel}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {vehicule.motorisation && <span>{vehicule.motorisation}</span>}
              {km && <span>{km}</span>}
              {prix && <span className="font-semibold">{prix}</span>}
            </div>
            {vehicule.vendeur_localisation && (
              <p className="text-xs text-gray-500 mt-0.5">{vehicule.vendeur_localisation}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400">
            <div className="flex items-center gap-1.5 justify-end mb-1">
              <ScanLine size={12} />
              <span className="font-semibold text-gray-600">ScanAuto</span>
            </div>
            <p>Checklist visite</p>
            <p>{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {/* Score global */}
        {state?.r2?.score_global != null && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Score global ScanAuto</span>
              <span className="text-2xl font-bold text-gray-900">{state.r2.score_global}/100</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-500">
              {[
                ['Fiabilité moteur', 'score_fiabilite', 25],
                ['Entretien', 'score_entretien', 20],
                ['Positionnement marché', 'score_marche', 20],
              ].map(([label, key, max]) => (
                <div key={key}>
                  <span>{label}</span>
                  <span className="float-right font-medium text-gray-700">{state.r2[key] ?? '—'}/{max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points de vigilance */}
        {pointsVigilance.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">⚠ Points de vigilance</h2>
            <div className="space-y-1">
              {pointsVigilance.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 mt-0.5">·</span>
                  <span>{typeof p === 'string' ? p : p.point || p.description || JSON.stringify(p)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist sections */}
        {Object.entries(SECTION_LABELS).map(([key, label]) => (
          <div key={key} className="mb-5">
            <h2 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide border-b border-gray-300 pb-1">{label}</h2>
            <div>
              {STATIC_CHECKLIST[key].map((item, i) => <CheckRow key={i} text={item} />)}
            </div>
          </div>
        ))}

        {/* Spécifique au modèle */}
        {specificItems.length > 0 && (
          <div className="mb-5">
            <h2 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide border-b border-gray-300 pb-1">Spécifique à ce modèle</h2>
            <div>
              {specificItems.map((item, i) => <CheckRow key={i} text={typeof item === 'string' ? item : item.point || item} />)}
            </div>
          </div>
        )}

        {/* Questions vendeur */}
        {vendeurQuestions.length > 0 && (
          <div className="mb-5">
            <h2 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide border-b border-gray-300 pb-1">Questions à poser au vendeur</h2>
            <div className="space-y-3">
              {vendeurQuestions.map((q, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-gray-800">{typeof q === 'string' ? q : q.question || q}</p>
                  <div className="mt-1 h-6 border-b border-dotted border-gray-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes libres */}
        <div className="mt-6">
          <h2 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide border-b border-gray-300 pb-1">Notes</h2>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 border-b border-dotted border-gray-300" />
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-8 text-center print:mt-4">
          Généré par ScanAuto — scannauto.fr
        </p>
      </div>
    </div>
  )
}
