import { useState } from 'react'
import { FileText, Car, Wrench, Navigation, AlertTriangle, Square, CheckSquare } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/UI/accordion'
import { toStr } from '../../../utils/toStr.js'

const STATIC_CHECKLIST = {
  documents: [
    "Carte grise (cohérence avec le vendeur)",
    "Certificat de non-gage (histovec.interieur.gouv.fr)",
    "Contrôle technique en cours de validité (< 6 mois)",
    "Carnet d'entretien avec factures correspondantes",
    "Certificat de cession signé des deux parties",
    "Rapport d'historique (Histovec ou CarVertical)",
  ],
  carrosserie: [
    "Cohérence des teintes (absence de reprises ou retouches)",
    "Alignement et régularité des jeux de carrosserie",
    "Absence de traces de rouille ou boursouflures",
    "État des vitres, joints et joints de portes",
    "Profondeur des pneus légale (≥ 1,6 mm) et usure homogène",
    "Fonctionnement de tous les éclairages (feux, clignotants, stop)",
  ],
  mecanique: [
    "Niveau et couleur des fluides : huile moteur, liquide de refroidissement",
    "Absence de fuite sous le véhicule après stationnement",
    "Absence de fumée bleue ou noire à l'échappement au démarrage",
    "Bruits moteur au ralenti : claquements, sifflements, cognements",
    "Fonctionnement de la climatisation (froid et chaud)",
    "État visuel des courroies accessoires (craquelures)",
  ],
  essai_routier: [
    "Démarrage à froid — bruits, fumée, stabilité du ralenti",
    "Accélération progressive (0-50 km/h) — à-coups, hésitations",
    "Accélération franche (50-100 km/h) — puissance, linéarité",
    "Freinage progressif et d'urgence — trajectoire, distance",
    "Virages lents et rapides — traction, stabilité, sous-virage",
    "Boîte de vitesses — passages, bruits de roulement",
    "Passage à régime constant (70 km/h / 5 min) — vibrations, bruits",
  ],
}

const SECTIONS = [
  { key: 'documents', label: 'Documents', Icon: FileText },
  { key: 'carrosserie', label: 'Carrosserie', Icon: Car },
  { key: 'mecanique', label: 'Mécanique', Icon: Wrench },
  { key: 'essai_routier', label: 'Essai routier', Icon: Navigation },
  { key: 'specifique_modele', label: 'Spécifique au modèle', Icon: AlertTriangle },
]

export default function InspectionChecklist({ r3 }) {
  const cl = r3.checklist_inspection
  const [checked, setChecked] = useState({})
  const toggle = (key) => setChecked(c => ({ ...c, [key]: !c[key] }))

  return (
    <Card>
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Checklist d'inspection</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <Accordion type="multiple" className="space-y-1">
          {SECTIONS.map(({ key, label, Icon }) => {
            const items = key === 'specifique_modele'
              ? cl?.[key]
              : STATIC_CHECKLIST[key]
            if (!items?.length) return null

            const doneCount = items.filter((_, i) => checked[`${key}-${i}`]).length

            return (
              <AccordionItem key={key} value={key} className="border rounded-lg px-0 border-border">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2 w-full mr-2">
                    <Icon size={14} className="text-text-secondary shrink-0" />
                    <span className="text-sm text-text">{label}</span>
                    <span className="ml-auto text-xs text-text-tertiary font-mono">
                      {doneCount}/{items.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1">
                    {items.map((item, i) => {
                      const id = `${key}-${i}`
                      const isChecked = !!checked[id]
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggle(id)}
                          className="flex items-start gap-2.5 text-left group"
                        >
                          {isChecked
                            ? <CheckSquare size={15} className="text-text shrink-0 mt-0.5 transition-colors" />
                            : <Square size={15} className="text-border group-hover:text-text-tertiary shrink-0 mt-0.5 transition-colors" />
                          }
                          <span className={`text-sm transition-colors ${isChecked ? 'text-text-tertiary line-through' : 'text-text'}`}>
                            {toStr(item)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
