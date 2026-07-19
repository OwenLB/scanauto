import json
from datetime import date


def get_moto_prompt_1(vehicule: dict, date_aujourdhui: str, computed: dict) -> tuple:
    system = """Tu es un expert moto français spécialisé dans l'analyse d'annonces de motos d'occasion.
Tu as une connaissance approfondie de tous les modèles et motorisations moto vendus en France depuis 1990.
Tu connais les blocs moteur par cœur (ex: MT-07 = CP2 689cc, Duke 390 = monocylindre 373cc, CB500F = parallèle twin 471cc).
Tu es rigoureux, factuel et direct. Tu ne fais jamais de suppositions sans le signaler explicitement.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    km_par_an = computed.get('km_par_an')
    age_annonce_jours = computed.get('age_annonce_jours')
    annonce_ancienne = computed.get('annonce_ancienne')
    age_vehicule = computed.get('age_vehicule')

    def _fmt(v, suffix=''):
        return f'{v}{suffix}' if v is not None else 'non calculable'

    computed_note = (
        "Note : les calculs suivants ont été effectués côté serveur — "
        "intègre ces valeurs telles quelles dans le JSON de sortie, sans les recalculer :\n"
        f"- km/an : {_fmt(km_par_an)}\n"
        f"- Âge du véhicule : {_fmt(age_vehicule, ' ans')}\n"
        f"- Âge de l'annonce : {_fmt(age_annonce_jours, ' jours')}\n"
        f"- Annonce ancienne (>30j) : {_fmt(annonce_ancienne)}"
    )

    user = f"""Analyse les données de cette annonce moto et structure-les précisément.

Données de l'annonce :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

{computed_note}

Ta mission :

1. IDENTIFICATION DU VÉHICULE
   - Confirme ou corrige la marque, le modèle, la finition/version
   - Identifie le bloc moteur exact à partir de la motorisation fournie
     (ex: "MT-07 689cc" = bloc CP2 parallèle twin 655cc/689cc, "Duke 390" = monocylindre 373cc KTM,
      "CB650R" = inline 4 649cc, "Africa Twin 1100" = parallèle twin 1084cc)
   - Précise le type de moto : roadster / sportive / trail / custom / scooter / naked / enduro / touring
   - Précise la génération du modèle si identifiable (ex: "Yamaha MT-07 — 2ème génération RN43, 2018-2020")
   - Indique l'année de début et fin de production de cette génération
   - Indique le permis requis pour conduire cette moto :
     A1 = cylindrée ≤125cc OU puissance ≤11kW, A2 = puissance ≤35kW ET rapport poids/puissance ≤0,2kW/kg, A = tout

2. DÉTECTION OPTIONS & ÉQUIPEMENTS
   - Extrais toutes les options et équipements mentionnés dans la description
     (valises, top-case, écran de protection, poignées chauffantes, quickshifter, ABS, traction control, modes de conduite, etc.)
   - Vérifie leur cohérence avec la version/finition déclarée
   - Signale toute incohérence

3. DÉTECTION INFOS MANQUANTES
   - Liste uniquement les informations vraiment utiles à l'évaluation et non renseignées
   - Pour chaque info manquante, indique son niveau d'impact :
     "critique" (bloque l'évaluation), "important" (dégrade le score), "mineur" (informatif)
   - Le champ "champ" doit être un libellé court en français lisible par l'utilisateur final
     JAMAIS un nom de variable snake_case
   - RÈGLES IMPÉRATIVES sur les infos manquantes :
     * NE JAMAIS signaler l'absence de CT : en France le CT est légalement obligatoire pour vendre,
       son absence dans l'annonce ne signifie pas qu'il n'existe pas
     * "Carnet d'entretien" : impact "mineur" si pas mentionné — beaucoup de vendeurs ne le précisent pas

4. DÉTECTION CHUTES & DOMMAGES
   - Les chutes moto sont difficiles à détecter à distance mais capitales (dommages cadre, fourche, radiateur)
   - Cherche ACTIVEMENT les mentions : "chute", "tombée", "rayure", "réparation", "rétroviseur cassé",
     "carénage remplacé", "levier tordu", "pédale pliée", "protège-carter abîmé", "plastique fissuré"
   - Absence de mention ne garantit PAS l'absence de chute
   - Signale toute suspicion même légère comme red flag

5. SIGNAUX VENDEUR
   - L'âge de l'annonce est calculé côté serveur (age_annonce_jours) — utilise UNIQUEMENT cette valeur,
     ne tente jamais d'interpréter ou commenter l'année dans la date de mise en ligne
   - Red flags RÉELS uniquement (urgence explicite, prix anormalement bas pour cacher un défaut,
     incohérences factuelles graves entre description et données techniques, mentions de chute)
   - NE PAS signaler comme red flag :
     * L'absence de mention du CT (légalement obligatoire)
     * Un garage pro vendant une moto d'une autre marque (reprise courante)
     * L'année en cours dans la date de l'annonce
   - Note le ton général de l'annonce : détaillé / standard / minimal

Réponds avec ce JSON (respecte exactement cette structure) :

{{
  "vehicule_identifie": {{
    "marque": "",
    "modele": "",
    "generation": "",
    "finition": "",
    "annee": 0,
    "annee_debut_generation": 0,
    "annee_fin_generation": 0,
    "kilometrage": 0,
    "km_par_an": 0,
    "km_par_an_moyenne_segment": 0,
    "coherence_kilometrage": "normal | élevé | très élevé | anormal",
    "carburant": "",
    "boite": "",
    "cylindree": 0,
    "type_moto": "roadster | sportive | trail | custom | scooter | naked | enduro | touring",
    "permis_requis": "A1 | A2 | A",
    "bloc_moteur": {{
      "code": "",
      "designation": "",
      "puissance_ch": 0,
      "configuration": "",
      "periode_production": "",
      "notes": ""
    }},
    "prix": 0,
    "ct_valide": true,
    "carnet_entretien": "oui | non | non_mentionné"
  }},
  "vendeur": {{
    "type": "particulier | pro",
    "localisation": "",
    "age_annonce_jours": 0,
    "annonce_ancienne": true,
    "red_flags": [],
    "chute_suspectee": false,
    "indices_chute": [],
    "ton_annonce": "détaillé | standard | minimal"
  }},
  "options_detectees": [
    {{ "nom": "", "coherent_avec_finition": true }}
  ],
  "infos_manquantes": [
    {{ "champ": "Carnet d'entretien", "impact": "critique | important | mineur" }}
  ]
}}"""
    return system, user


def get_moto_prompt_2(vehicule: dict, r1: dict) -> tuple:
    system = """Tu es un expert moto français spécialisé dans la fiabilité des motos d'occasion.
Tu as une connaissance encyclopédique des problèmes mécaniques récurrents par modèle ET par motorisation spécifique moto.
Tu connais les kilométrages critiques pour chaque intervention majeure (chaîne/pignon/couronne, pneus, fourche, embrayage, etc.) sur chaque bloc moteur.
Tu sais que les motos ont des usages très différents des voitures : kilométrages annuels bien plus faibles, utilisation saisonnière, entretiens spécifiques.
Tu es direct, précis et honnête. Tu ne minimises pas les risques, surtout concernant les chutes non déclarées.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base des données structurées ci-dessous, produis le scoring complet et l'analyse de fiabilité de cette moto.

Données du véhicule structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

---

SCORING — Score global sur 100 pts répartis ainsi :
- Kilométrage : 25 pts
- Fiabilité bloc moteur + spécificités moto : 25 pts
- Historique & transparence (incl. chutes) : 20 pts
- Signaux vendeur : 15 pts
- Prix marché : 15 pts

Pour chaque critère :
- Attribue un score chiffré
- Justifie en 1-2 phrases
- Si une info manquante impacte le critère, applique une pénalité d'incertitude et signale-le

RÈGLES DE SCORING :

Kilométrage (25 pts) :
- Les motos parcourent en moyenne 5 000 à 10 000 km/an en France (usage loisir/week-end)
  Un usage quotidien/pendulaire peut monter à 12 000-15 000 km/an
- Normal ≤10 000 km/an : 25 pts
- Élevé 10 000-15 000 km/an : 18 pts
- Très élevé 15 000-20 000 km/an : 10 pts
- Anormal >20 000 km/an : 5 pts (usage professionnel ou taxi-moto probable)
- Bonus si kilométrage autoroute/touring probable (mentionné dans description — usure plus douce)
- Malus si kilométrage urbain intense probable

Fiabilité bloc moteur + spécificités moto (25 pts) :
- Ce critère évalue le RISQUE ACTUEL du véhicule, pas uniquement la réputation générale du modèle.
- CAS SPÉCIAL MOTO RÉCENTE : si la moto a moins de 2 ans ET moins de 10 000 km,
  le score de fiabilité est au minimum 22/25. Risque mécanique quasi nul, couvert par garantie constructeur.
  Seul un défaut de conception documenté affectant les premiers km peut justifier de descendre sous 22.
- Pour les autres motos : évalue séparément la réputation du modèle (0-10 pts) et du bloc moteur spécifique (0-15 pts)
- Pour le bloc moteur : tiens compte de la configuration (mono / parallèle twin / V-twin / inline 4 / flat twin),
  des défauts connus de CE bloc, et du kilométrage actuel vs les kilométrages critiques
- Modulation obligatoire selon la distance aux kilométrages critiques :
  * Km actuel < 40% du premier km critique connu : bonus +4 pts
  * Km actuel entre 40% et 80% du premier km critique : bonus +2 pts
  * Km actuel ≥ 80% d'un km critique ou l'ayant dépassé : pas de bonus, score selon usure réelle estimée
- Points de vigilance spécifiques moto à considérer :
  * Fourche (joints de fourche, huile fourche)
  * Freins (état disques, maîtres-cylindres, liquide de frein)
  * Chaîne/transmission (allongement, pignons usés)
  * Filtre à air (encrassement fréquent)
  * Culasse (joints, soupapes sur les hauts-régimes)

Historique & transparence (20 pts) :
- CAS SPÉCIAL MOTO RÉCENTE : si la moto a moins de 2 ans ET moins de 10 000 km,
  l'absence de carnet et de raison de vente est NORMALE — ne pas pénaliser.
  Score de base : 15/20 minimum si vendue par un pro avec garantie ≥ 12 mois.
- CHUTES — pénalité spécifique moto :
  * Chute explicitement mentionnée dans l'annonce : -6 pts (transparence positive mais risque réel)
  * Chute suspectée (indices dans R1 chute_suspectee = true) : -4 pts
  * Aucune mention ni indice de chute : pas de pénalité mais pas de bonus (impossible à certifier)
  Note : une chute peut endommager le cadre, la fourche, le radiateur ou les fixations de carénage
  de façon non visible, avec des conséquences graves sur la tenue de route
- CT : En France, le CT est légalement obligatoire pour vendre un véhicule.
  Partir du principe qu'il est valide par défaut (+4 pts).
  Bonus si CT valide explicitement mentionné (+6 pts au lieu de +4).
  Pénalité UNIQUEMENT si explicitement absent ou invalide mentionné (-5 pts).
  Pour une moto < 4 ans : CT non applicable, traiter comme valide (+4 pts).
  Ne jamais pénaliser simplement parce qu'il n'est pas mentionné dans l'annonce.
- Carnet d'entretien / factures explicitement mentionnés : +5 pts
  Non mentionné : +4 pts (bénéfice du doute — la majorité des vendeurs sérieux ne le précisent pas)
  Explicitement absent : -2 pts
- Raison de vente mentionnée : +2 pts. Non mentionnée : +1 pt (normal).
- Description détaillée et honnête : +0 à +3 pts
- Pénalité si incohérences factuelles détectées dans R1 : -5 pts

Signaux vendeur (15 pts) :
- Particulier : base solide (+7 pts)
  Pro avec garantie explicitement mentionnée ≥ 12 mois : +11 pts.
  Pro avec garantie courte (< 12 mois) : +8 pts.
  Pro sans garantie mentionnée : +7 pts.
- Cohérence des informations fournies : jusqu'à +3 pts
- Red flags RÉELS uniquement : -2 pts chacun (max -6 pts)
  Un red flag réel = urgence explicite de vente, prix anormalement bas sans explication,
  incohérences factuelles graves, chute suspectée non déclarée
- Annonce ancienne (>60 jours) : -2 pts

Prix marché (15 pts) :
- Estime la fourchette de prix marché réaliste pour cette moto (modèle, année, km, état général)
- Tenir compte de la SAISONNALITÉ : les motos se vendent plus cher au printemps/été, moins cher en automne/hiver
- Bonne affaire (>10% sous marché) : 15 pts
- Dans la moyenne (écart ≤5%) : 12 pts
- Légèrement surévalué (5-15% au-dessus) : 8 pts
- Surévalué (15-25% au-dessus) : 4 pts
- Très surévalué (>25% au-dessus) : 0 pts

VERDICT GLOBAL :
- 0-40 : Risqué
- 41-60 : Moyen
- 61-80 : Bon
- 81-100 : Excellent

ANALYSE FIABILITÉ MOTORISATION :
Produis une analyse experte et détaillée du bloc moteur identifié dans R1 :
- Points forts de ce bloc (configuration, longévité connue, entretien simple/complexe)
- Défauts connus et récurrents avec description précise
- Kilométrages critiques pour les interventions majeures sur CE bloc moto
  (chaîne/pignon/couronne, pneus avant/arrière, joints fourche, embrayage, vidange, soupapes)
- Évaluation du risque au kilométrage actuel
- Verdict fiabilité moteur : Fiable / Correct / Risqué / Très risqué

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- synthese_ia : 4 lignes maximum. Ton neutre et factuel.
  Structure imposée : [constat principal sur la moto] + [point positif principal] + [point négatif principal] + [recommandation courte]
- analyse_narrative dans fiabilite_moteur : 5 lignes maximum
- justification de chaque critère de scoring : 2 phrases maximum
- points_forts : 3 éléments maximum, 1 phrase chacun
- defauts_connus : 5 éléments maximum, description 2 phrases maximum chacun

Réponds avec ce JSON :

{{
  "score_global": 0,
  "verdict": "Risqué | Moyen | Bon | Excellent",
  "criteres": {{
    "kilometrage": {{
      "score": 0,
      "max": 25,
      "justification": "",
      "statut": "complet | incomplet"
    }},
    "fiabilite": {{
      "score": 0,
      "max": 25,
      "score_modele": 0,
      "score_motorisation": 0,
      "justification": "",
      "statut": "complet | incomplet"
    }},
    "historique": {{
      "score": 0,
      "max": 20,
      "justification": "",
      "statut": "complet | incomplet"
    }},
    "signaux_vendeur": {{
      "score": 0,
      "max": 15,
      "justification": "",
      "statut": "complet | incomplet"
    }},
    "prix_marche": {{
      "score": 0,
      "max": 15,
      "fourchette_marche_min": 0,
      "fourchette_marche_max": 0,
      "positionnement": "bonne_affaire | dans_la_moyenne | légèrement_surévalué | surévalué",
      "justification": "",
      "statut": "complet | incomplet"
    }}
  }},
  "fiabilite_moteur": {{
    "bloc": "",
    "configuration": "",
    "verdict": "Fiable | Correct | Risqué | Très risqué",
    "points_forts": [],
    "defauts_connus": [
      {{ "defaut": "", "description": "", "kilometrage_critique": "" }}
    ],
    "interventions_critiques": [
      {{ "intervention": "", "kilometrage_preconise": "", "cout_estime_min": 0, "cout_estime_max": 0, "statut_sur_ce_vehicule": "fait_probablement | à_vérifier | à_prévoir_immédiatement" }}
    ],
    "analyse_narrative": ""
  }},
  "synthese_ia": ""
}}"""
    return system, user


def get_moto_prompt_3(vehicule: dict, r1: dict, r2: dict) -> tuple:
    system = """Tu es un expert en mécanique moto et en chiffrage de réparations en France.
Tu connais les tarifs pratiqués en France par les ateliers moto indépendants et les concessions pour toutes les interventions courantes et majeures.
Tu sais que les motos ont des cycles d'entretien très différents des voitures :
vidanges plus fréquentes (6 000 km), pneus arrière usés en 6 000-10 000 km, chaîne/transmission à 15 000-20 000 km.
Tu es prudent et honnête — tu n'alarmes pas inutilement mais tu ne minimises pas non plus.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base du scoring et de l'analyse de fiabilité, produis les points de vigilance et les coûts prévisionnels pour cette moto.

Données structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Scoring et fiabilité (R2) :
{json.dumps(r2, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

---

POINTS DE VIGILANCE :

Génère deux listes :

1. Points critiques (rouge) — maximum 3, problèmes sérieux à vérifier avant achat
   - Spécifiques à CETTE moto, pas des généralités
   - PRIORITÉ MOTO : si chute_suspectee = true dans R1, inclure systématiquement comme point critique
     (conséquences : cadre tordu non visible, fourche déréglée, radiateur fissuré, géométrie altérée)
   - Inclure la conséquence potentielle et le coût estimé si applicable
   - Sources : défauts connus du bloc moteur (R2), red flags vendeur (R1), chute suspectée

2. Points à surveiller (orange) — maximum 4, éléments importants mais moins urgents
   - Vérifications recommandées lors de la visite ou à court terme
   - Sources : interventions proches en km (R2), infos manquantes importantes (R1)

COÛTS PRÉVISIONNELS :

ÉTAPE PRÉLIMINAIRE OBLIGATOIRE — Lire l'historique d'entretien :
Avant de lister tout travail, lis attentivement la description et l'historique de la moto.
Identifie les travaux récents déjà effectués (ex: "chaîne changée", "pneus neufs", "vidange faite", "fourche révisée").
RÈGLE ABSOLUE : tout travail mentionné comme récemment effectué NE DOIT PAS apparaître dans
les travaux imminents ni dans les travaux long terme. Les ignorer complètement.

RÉFÉRENTIELS D'ENTRETIEN MOTO (à adapter selon le modèle) :
- Vidange moteur : tous les 6 000 km ou 1 an (coût : 60-120€ atelier indépendant)
- Filtre à air : 12 000-24 000 km selon modèle (20-60€)
- Bougies : 12 000-24 000 km (30-100€ selon nombre)
- Chaîne + pignon + couronne (kit transmission) : 15 000-20 000 km (200-400€)
- Pneu arrière : 6 000-10 000 km selon usage (80-200€ + pose)
- Pneu avant : 10 000-15 000 km (70-170€ + pose)
- Plaquettes frein avant : 10 000-20 000 km (30-80€)
- Plaquettes frein arrière : 15 000-25 000 km (25-60€)
- Liquide de frein : tous les 2 ans (20-40€)
- Joints de fourche : 20 000-40 000 km ou si fuite visible (80-200€)
- Huile de fourche : 20 000-40 000 km (40-100€)
- Embrayage (disques + ressorts) : 30 000-50 000 km selon usage (150-400€)
- Courroie de distribution (si applicable) : selon constructeur (200-600€)
- Soupapes (réglage/remplacement) : 20 000-40 000 km selon modèle (200-800€)

1. Entretien courant annuel
   - Estime le coût annuel moyen (vidange, révision, consommables de base)
   - Tiens compte de la marque, de la cylindrée et du kilométrage annuel

2. Travaux imminents
   - UNIQUEMENT les interventions réellement nécessaires maintenant pour CETTE moto précise
   - Un travail "imminent" = signal concret (kilométrage critique dépassé ET non fait,
     symptôme mentionné, ou défaut connu récurrent à CE kilométrage pour CE bloc)
   - NE PAS lister des travaux par précaution générique si aucun signal concret
   - NE PAS lister un travail récemment effectué
   - Maximum 3 travaux imminents

3. Travaux à surveiller (moyen/long terme)
   - Interventions probables dans les 2-5 prochaines années, non encore nécessaires
   - NE PAS lister un travail récemment effectué
   - Maximum 4 travaux long terme

CHECKLIST INSPECTION MOTO :
Génère UNIQUEMENT le tableau specifique_modele (8 points maximum) :
- Points de vérification spécifiques à CETTE moto et CE bloc moteur, basés sur les défauts connus (R2)
- Inclure systématiquement des vérifications chute : traces sur carénages, état des leviers, alignement des roues,
  état des protège-carters, rectitude du guidon, jeu de fourche
- Les catégories universelles (documents, carrosserie, essai_routier) sont gérées côté front — ne les génère pas.

RAPPELS CONSTRUCTEUR & SÉCURITÉ :
- Ne mentionne QUE les rappels dont tu as la certitude absolue (campagnes officielles documentées)
- En cas de doute : rappels_constructeur = [] et aucun_rappel_majeur = true
- INTERDIT de générer des rappels "probables" ou "à vérifier"
- Si aucune certitude, conseil_securite_paiement doit mentionner de vérifier avec le VIN/numéro de cadre
  sur le site officiel du constructeur
- Évalue le risque de vol pour ce modèle en France (certaines motos sont très ciblées)

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- Chaque point critique : titre (5 mots max) + description (2 phrases max) + consequence (1 phrase max) + coût estimé
- Chaque point à surveiller : titre + 1 phrase. Pas plus.
- Maximum 3 points critiques et 4 points à surveiller
- Maximum 3 travaux imminents et 4 travaux long terme
- Un travail récemment effectué = absent de toutes les listes, sans exception

Réponds avec ce JSON :

{{
  "points_vigilance": {{
    "critiques": [
      {{
        "titre": "",
        "description": "",
        "consequence": "",
        "cout_estime_min": 0,
        "cout_estime_max": 0
      }}
    ],
    "a_surveiller": [
      {{
        "titre": "",
        "description": ""
      }}
    ]
  }},
  "couts_previsionnels": {{
    "entretien_annuel_min": 0,
    "entretien_annuel_max": 0,
    "travaux_imminents": [
      {{
        "intervention": "",
        "urgence": "immédiat | avant_achat | dans_3_mois",
        "cout_min": 0,
        "cout_max": 0
      }}
    ],
    "total_travaux_imminents_min": 0,
    "total_travaux_imminents_max": 0,
    "travaux_long_terme": [
      {{
        "intervention": "",
        "horizon": "",
        "cout_min": 0,
        "cout_max": 0
      }}
    ]
  }},
  "checklist_inspection": {{
    "specifique_modele": []
  }},
  "securite": {{
    "rappels_constructeur": [],
    "aucun_rappel_majeur": true,
    "risque_vol": "",
    "conseil_securite_paiement": ""
  }}
}}"""
    return system, user


def get_moto_prompt_4(vehicule: dict, r1: dict, r2: dict, r3: dict, computed: dict) -> tuple:
    system = """Tu es un expert en cote moto et en négociation sur le marché de l'occasion français.
Tu connais parfaitement les dynamiques du marché moto français (LeBonCoin, La Centrale, L'Argus Moto, Motoplanete, Lacentrale).
Tu sais que le marché moto a une forte saisonnalité : les prix montent au printemps (mars-mai) et sont au plus bas en hiver (novembre-janvier).
Tu es pragmatique et orienté résultat — tu donnes des conseils concrets et actionnables.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    positionnement_pourcentage = computed.get('positionnement_pourcentage')
    kilometrage_2_ans = computed.get('kilometrage_2_ans')
    kilometrage_5_ans = computed.get('kilometrage_5_ans')

    def _fmt(v, suffix=''):
        return f'{v}{suffix}' if v is not None else 'non calculable'

    user = f"""Sur la base de toutes les données disponibles, produis l'analyse prix complète et les conseils de négociation pour cette moto.

Données structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Scoring (R2) :
{json.dumps(r2, ensure_ascii=False, indent=2)}

Risques et coûts (R3) :
{json.dumps(r3, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

---

ANALYSE PRIX :
- La fourchette marché est fournie par R2 (fourchette_marche_min et fourchette_marche_max du critère prix_marche)
- Le positionnement_pourcentage a déjà été calculé côté serveur : {_fmt(positionnement_pourcentage, '%')}
  (valeur négative = sous le marché, valeur positive = au-dessus du marché)
- Les kilométrages futurs ont déjà été calculés côté serveur :
  Dans 2 ans : {_fmt(kilometrage_2_ans, ' km')}
  Dans 5 ans : {_fmt(kilometrage_5_ans, ' km')}
- Utilise ces valeurs telles quelles dans le JSON de sortie sans les recalculer
- Déduis le positionnement (bonne_affaire / dans_la_moyenne / légèrement_surévalué / surévalué) depuis le positionnement_pourcentage

SAISONNALITÉ MOTO :
- Printemps/été (mars-août) : marché dynamique, prix hauts, moins de marge de négociation
- Automne/hiver (septembre-février) : marché atone, vendeurs moins pressés de vendre mais plus ouverts à négocier
- Commente l'impact de la saisonnalité sur la négociation actuelle (date de l'annonce)

Impact de l'âge de l'annonce :
- Si l'annonce a plus de 30 jours : le vendeur est probablement sous pression, marge de négociation augmentée
- Chiffre l'impact sur le prix cible

NÉGOCIATION :

Produis un objectif de négociation chiffré et réaliste avec :
- Prix cible recommandé
- Liste des arguments de négociation moto, chacun avec son impact estimé en €
  - Kilométrage élevé (vs moyenne moto de ce segment)
  - Chute suspectée ou avérée (argument fort — risques cadre/fourche non visibles)
  - Travaux imminents identifiés (utilise les totaux de R3)
  - Pneus usés (avant et/ou arrière)
  - Chaîne/pignon/couronne à changer
  - Infos manquantes (carnet, factures)
  - Âge de l'annonce
  - Saisonnalité défavorable au vendeur (si hiver)
- Total des arguments = justification du prix cible

MESSAGE VENDEUR :
Rédige un premier message de prise de contact naturel et simple.
- Commencer par demander si la moto est toujours disponible
- Enchaîner avec 2 ou 3 questions clés issues des points critiques (R3) — pas toutes les questions, juste les plus importantes
- Pour une moto avec chute suspectée : inclure une question naturelle sur l'état général/historique
- Ton neutre, curieux, sans s'engager ni se positionner
- INTERDIT : toute référence au prix, à la négociation, aux défauts ou aux travaux
- Maximum 80 mots

QUESTIONS À POSER AU VENDEUR :
Liste de 5 à 8 questions précises et priorisées.
- Basées sur les points critiques et à surveiller (R3)
- Pour les motos : toujours inclure une question sur les chutes ("A-t-elle déjà chuté ?")
  et sur l'état de la transmission (chaîne, pignons)
- Priorisées par importance
- Formulées de manière à obtenir des réponses vérifiables

PROJECTION DÉCOTE :
Estime la valeur de la moto dans 2 ans et 5 ans.
- Utilise les kilométrages futurs fournis ci-dessus
- Tiens compte de la revendabilité du modèle (certains modèles moto se déprécient peu, ex: motos japonaises polyvalentes)
- Tiens compte des travaux à prévoir et de l'impact des chutes éventuelles sur la revente
- Commente la revendabilité générale de cette moto

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- commentaire_age_annonce : 1 phrase maximum
- commentaire_saisonnalite : 1 phrase maximum
- commentaire_revendabilite : 3 lignes maximum
- arguments de négociation : 6 maximum
- message_vendeur : 100 mots maximum, ton sobre et professionnel
- point_vigilance_associe dans questions_vendeur : 1 phrase maximum par question

Réponds avec ce JSON :

{{
  "analyse_prix": {{
    "fourchette_marche_min": 0,
    "fourchette_marche_max": 0,
    "positionnement": "bonne_affaire | dans_la_moyenne | légèrement_surévalué | surévalué",
    "positionnement_pourcentage": 0,
    "commentaire_age_annonce": "",
    "commentaire_saisonnalite": ""
  }},
  "negociation": {{
    "prix_cible": 0,
    "economie_potentielle": 0,
    "arguments": [
      {{ "argument": "", "impact_euros": 0 }}
    ]
  }},
  "message_vendeur": "",
  "questions_vendeur": [
    {{ "priorite": 1, "question": "", "point_vigilance_associe": "" }}
  ],
  "projection_decote": {{
    "valeur_2_ans_min": 0,
    "valeur_2_ans_max": 0,
    "pourcentage_2_ans": 0,
    "kilometrage_estime_2_ans": 0,
    "valeur_5_ans_min": 0,
    "valeur_5_ans_max": 0,
    "pourcentage_5_ans": 0,
    "kilometrage_estime_5_ans": 0,
    "commentaire_revendabilite": ""
  }}
}}"""
    return system, user


def get_moto_prompt_5(vehicule: dict, r1: dict, date_aujourdhui: str) -> tuple:
    system = """Tu es un assistant moto français expert en réglementation, fiscalité et assurance moto en France.
Tu connais parfaitement les règles ZFE, le système Crit'Air pour les deux-roues, le calcul des cartes grises moto (en cm³), et les spécificités de l'assurance moto française.
Tu sais que l'assurance moto est très différente de l'assurance auto : le bonus moto est un contrat séparé du bonus auto,
les jeunes motards (< 3 ans de permis moto) paient des surprimes très importantes, et la couverture vol est souvent chère.
Tu es précis sur les chiffres et tu signales toujours quand une estimation est approximative.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base des données de la moto, produis toutes les informations pratiques.

Données structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

Date du jour : {date_aujourdhui}

---

1. CRIT'AIR & ZFE

Détermine la vignette Crit'Air de la moto (les règles sont les mêmes que pour les voitures) :
- Moto/scooter immatriculé entre 2000 et 2003 = Crit'Air 3
- Moto/scooter immatriculé entre 2004 et 2006 = Crit'Air 3
- Moto/scooter immatriculé entre 2007 et 2017 = Crit'Air 2
- Moto/scooter immatriculé à partir de 2018 (norme Euro 4/5) = Crit'Air 1
- Électrique = Crit'Air 0
(applique les règles officielles françaises en vigueur pour les deux-roues motorisés)

Note importante ZFE : à Paris et dans les grandes ZFE françaises, les deux-roues motorisés
sont parfois soumis à des restrictions différentes des voitures — précise-le si pertinent.

Évalue le statut dans les principales ZFE françaises en 2026 et les restrictions prévues.

2. BUDGET ASSURANCE MOTO

L'assurance moto est très différente de l'assurance auto — sois précis sur ces spécificités :

- Le bonus moto est INDÉPENDANT du bonus auto (un conducteur avec 10 ans de bonus auto commence à 100% en moto)
- Profil de référence : conducteur expérimenté, permis A depuis ≥ 5 ans, 50% de bonus moto, bon dossier
- Profil jeune motard : permis A2 ou permis A récent (< 3 ans), pas de bonus : surprime très importante (coefficient 1.5 à 2.0)

Estime les fourchettes de coût annuel (pas mensuel) pour :
- Assurance tous risques (avec vol)
- Assurance au tiers renforcée
- Assurance au tiers simple

Tiens compte de : la cylindrée, la puissance, la valeur de la moto, le type de moto,
et le risque de vol du modèle. Une sportive ou naked puissante coûte bien plus cher qu'un trail ou scooter.

Précise les particularités importantes :
- Permis A2 bridage : une moto bridée A2 puis débridée peut avoir des implications sur l'assurance
- Garantie vol : fortement recommandée pour les motos urbaines et les modèles ciblés par les voleurs

3. ESTIMATION CARTE GRISE MOTO

Le calcul de la carte grise moto est différent de la voiture :
- La moto n'a PAS de CV fiscaux au sens voiture — la taxe régionale est calculée sur la PUISSANCE en kW
- Certaines régions appliquent un tarif par kW, d'autres des tranches de cylindrée
- Utilise le tarif moyen national (~2,5€ par cm³ pour simplifier, ou selon barème kW régional)
- Appliquer la réduction de 50% pour les motos de plus de 10 ans sur la taxe régionale
- Détaille les composantes : taxe régionale, taxe de gestion, taxe de formation professionnelle, redevance d'acheminement

Note : le calcul exact dépend de la région et de la puissance en kW — indique toujours la marge d'approximation.

4. CONSOMMATION & AUTONOMIE

À partir de la motorisation identifiée dans R1 :
- Consommation théorique officielle ville / route / mixte (L/100km)
- Capacité du réservoir estimée pour ce modèle moto
- Autonomie estimée sur route (plein / conso route)
- Coût d'un plein au prix moyen national SP95 actuel (~1,75€/L)
  (presque toutes les motos roulent au sans plomb — vérifier si super carburant requis)
- Source : données constructeur officielles

5. PROFIL D'UTILISATION RECOMMANDÉ

Évalue l'adéquation de cette moto sur 4 axes spécifiques moto (score de 1 à 10) :
- Ville : maniabilité, gabarit, facilité de stationnement, conso urbaine, poids
- Route/Touring : confort sur long trajet, autonomie, protection au vent, puissance
- Plaisir/Sport : dynamisme, sensations, agilité, caractère moteur
- Confort : position de conduite, selle, équipements (bulle, poignées chauffantes, etc.)

Note : ne pas utiliser l'axe "Famille" — remplacé par "Confort" pour les motos.

Génère 3 tags représentatifs du profil moto (ex: #NakedAgressive, #TouringConfort, #LégèreVille, #SportiveEngagée)
et une description narrative du motard idéal pour cette moto (2 phrases maximum).
Précise le permis requis et si la moto est adaptée à un débutant ou nécessite de l'expérience.

CONTRAINTES DE LONGUEUR :
- description_conducteur_ideal : 2 phrases maximum
- commentaire dans assurance : 2 phrases maximum
- note_permis : 1 phrase sur l'accessibilité au permis requis et l'adéquation niveau motard

Réponds avec ce JSON :

{{
  "critair": {{
    "classe": "",
    "couleur": "",
    "zfe_statut_2026": "",
    "zfe_details": [
      {{ "ville": "", "statut": "autorisé | restrictions | interdit", "detail": "" }}
    ]
  }},
  "assurance": {{
    "profil_experimente_annuel_min": 0,
    "profil_experimente_annuel_max": 0,
    "profil_jeune_motard_annuel_min": 0,
    "profil_jeune_motard_annuel_max": 0,
    "au_tiers_min": 0,
    "au_tiers_max": 0,
    "commentaire": "",
    "particularites": ""
  }},
  "carte_grise": {{
    "puissance_kw": 0,
    "cylindree_cc": 0,
    "taxe_regionale_base": 0,
    "reduction_age": true,
    "taxe_regionale_finale": 0,
    "taxes_fixes": 0,
    "total_estime": 0,
    "note": ""
  }},
  "consommation": {{
    "ville": 0,
    "route": 0,
    "mixte": 0,
    "reservoir_litres": 0,
    "cout_plein_estime": 0
  }},
  "profil_utilisation": {{
    "ville": 0,
    "route_touring": 0,
    "plaisir_sport": 0,
    "confort": 0,
    "tags": [],
    "permis_requis": "",
    "note_permis": ""
  }}
}}"""
    return system, user
