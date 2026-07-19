import json
from datetime import date


def get_prompt_1(vehicule: dict, date_aujourdhui: str, computed: dict) -> tuple:
    system = """Tu es un expert automobile français spécialisé dans l'analyse d'annonces de véhicules d'occasion.
Tu as une connaissance approfondie de tous les modèles et motorisations vendus en France depuis 1990.
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

    user = f"""Analyse les données de cette annonce et structure-les précisément.

Données de l'annonce :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

{computed_note}

Ta mission :

1. IDENTIFICATION DU VÉHICULE
   - Confirme ou corrige la marque, le modèle, la finition
   - Identifie le bloc moteur exact à partir de la motorisation fournie
     (ex: "2.0 TDI 184ch" sur une Audi de 2015 = bloc EA288)
   - Précise la génération du modèle si identifiable (ex: "Audi TT 8S — 3ème génération")
   - Indique l'année de début et fin de production de cette génération

2. DÉTECTION OPTIONS & ÉQUIPEMENTS
   - Extrais toutes les options et équipements mentionnés dans la description
   - Vérifie leur cohérence avec la finition déclarée
   - Signale toute incohérence

3. DÉTECTION INFOS MANQUANTES
   - Liste uniquement les informations vraiment utiles à l'évaluation et non renseignées
   - Pour chaque info manquante, indique son niveau d'impact :
     "critique" (bloque l'évaluation), "important" (dégrade le score), "mineur" (informatif)
   - Le champ "champ" doit être un libellé court en français lisible par l'utilisateur final
     JAMAIS un nom de variable snake_case (nb_proprietaires, ct_valide, etc.)
   - RÈGLES IMPÉRATIVES sur les infos manquantes :
     * NE JAMAIS signaler l'absence de CT : en France le CT est légalement obligatoire pour vendre,
       son absence dans l'annonce ne signifie pas qu'il n'existe pas
     * "Nombre de propriétaires" : impact "mineur" seulement — info rarement communiquée en annonce
     * "Carnet d'entretien" : impact "mineur" si pas mentionné — beaucoup de vendeurs ne le précisent pas

4. SIGNAUX VENDEUR
   - L'âge de l'annonce est calculé côté serveur (age_annonce_jours) — utilise UNIQUEMENT cette valeur,
     ne tente jamais d'interpréter ou commenter l'année dans la date de mise en ligne
   - Red flags RÉELS uniquement (urgence explicite, prix anormalement bas pour cacher un défaut,
     incohérences factuelles graves entre description et données techniques)
   - NE PAS signaler comme red flag :
     * L'absence de mention du CT (légalement obligatoire, voir ci-dessus)
     * Un garage pro vendant un véhicule d'une autre marque (reprise courante)
     * L'année en cours dans la date de l'annonce
     * Une garantie d'une enseigne différente de la marque du véhicule (garage multimarque)
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
    "bloc_moteur": {{
      "code": "",
      "designation": "",
      "puissance_ch": 0,
      "periode_production": "",
      "notes": ""
    }},
    "prix": 0,
    "nb_proprietaires": 0,
    "ct_valide": true,
    "carnet_entretien": "oui | non | non_mentionné"
  }},
  "vendeur": {{
    "type": "particulier | pro",
    "localisation": "",
    "age_annonce_jours": 0,
    "annonce_ancienne": true,
    "red_flags": [],
    "ton_annonce": "détaillé | standard | minimal"
  }},
  "options_detectees": [
    {{ "nom": "", "coherent_avec_finition": true }}
  ],
  "infos_manquantes": [
    {{ "champ": "Nombre de propriétaires", "impact": "critique | important | mineur" }}
  ]
}}"""
    return system, user


def get_prompt_2(vehicule: dict, r1: dict) -> tuple:
    system = """Tu es un expert automobile français spécialisé dans la fiabilité des véhicules d'occasion.
Tu as une connaissance encyclopédique des problèmes mécaniques récurrents par modèle ET par motorisation spécifique.
Tu connais les kilométrages critiques pour chaque intervention majeure (courroie, embrayage, turbo, etc.) sur chaque bloc moteur.
Tu es direct, précis et honnête. Tu ne minimises pas les risques.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base des données structurées ci-dessous, produis le scoring complet et l'analyse de fiabilité.

Données du véhicule structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

---

SCORING — Score global sur 100 pts répartis ainsi :
- Kilométrage : 25 pts
- Fiabilité modèle + motorisation spécifique : 25 pts
- Historique & transparence : 20 pts
- Signaux vendeur : 15 pts
- Prix marché : 15 pts

Pour chaque critère :
- Attribue un score chiffré
- Justifie en 1-2 phrases
- Si une info manquante impacte le critère, applique une pénalité d'incertitude et signale-le

RÈGLES DE SCORING :

Kilométrage (25 pts) :
- Évalue le km/an vs la moyenne du segment (fournie dans R1)
- Diesel normal ≤15 000 km/an : 25 pts. Élevé 15-20k : 18 pts. Très élevé >20k : 10 pts. Anormal >25k : 5 pts
- Bonus si kilométrage autoroute probable (mentionné dans description)
- Malus si kilométrage urbain probable

Fiabilité modèle + motorisation (25 pts) :
- Ce critère évalue le RISQUE ACTUEL du véhicule, pas uniquement la réputation générale du modèle.
- CAS SPÉCIAL VÉHICULE RÉCENT : si le véhicule a moins de 2 ans ET moins de 15 000 km,
  le score de fiabilité est au minimum 22/25, quelle que soit la réputation de la marque.
  Raisonnement : risque mécanique quasi nul à ce stade, couvert par la garantie constructeur.
  Seul un défaut de conception documenté affectant les premiers km peut justifier de descendre sous 22.
- Pour les autres véhicules : évalue séparément la réputation du modèle (0-10 pts) et de la motorisation spécifique (0-15 pts)
- Pour la motorisation : tiens compte du bloc exact identifié dans R1, de son année de production, et du kilométrage actuel vs les kilométrages critiques connus
- Modulation obligatoire selon la distance aux kilométrages critiques :
  * Km actuel < 40% du premier km critique connu : bonus +4 pts (risque encore lointain)
  * Km actuel entre 40% et 80% du premier km critique : bonus +2 pts
  * Km actuel ≥ 80% d'un km critique ou l'ayant dépassé : pas de bonus, score selon usure réelle estimée
- Sois précis sur les défauts connus de CE bloc moteur (pas du modèle en général)

Historique & transparence (20 pts) :
- CAS SPÉCIAL VÉHICULE RÉCENT : si le véhicule a moins de 2 ans ET moins de 15 000 km,
  l'absence de carnet, de propriétaires antérieurs et de raison de vente est NORMALE et attendue — ne pas pénaliser ces absences.
  Score de base pour un véhicule récent : 15/20 minimum si vendu par un pro avec garantie ≥ 12 mois,
  ajustable uniquement selon la transparence de l'annonce et les éventuelles incohérences.
- CT : En France, le CT est légalement obligatoire pour vendre un véhicule.
  Partir du principe qu'il est valide par défaut (+4 pts).
  Bonus si CT valide explicitement mentionné (+6 pts au lieu de +4).
  Pénalité UNIQUEMENT si explicitement absent ou invalide mentionné (-5 pts).
  Pour un véhicule < 4 ans : CT non applicable, traiter comme valide (+4 pts).
  Ne jamais pénaliser simplement parce qu'il n'est pas mentionné dans l'annonce.
- Carnet d'entretien / factures explicitement mentionnés : +5 pts
  Non mentionné : +4 pts (bénéfice du doute fort — la majorité des vendeurs sérieux ne le précisent pas dans l'annonce)
  Explicitement absent : -2 pts
  Bonus : si vendeur pro avec garantie ≥ 12 mois et carnet non mentionné : +1 pt supplémentaire
- Nombre de propriétaires : 1 proprio = +4 pts, 2 = +3 pts, 3+ = +1 pt,
  non mentionné = +2 pts (neutre favorable — information rarement précisée, ne pas pénaliser)
- Raison de vente mentionnée : +2 pts. Non mentionnée : +1 pt (normal, ne pas pénaliser l'absence).
- Description détaillée et honnête : +0 à +3 pts (selon qualité)
- Pénalité si incohérences factuelles détectées dans R1 : -5 pts

Signaux vendeur (15 pts) :
- Particulier : base solide (+7 pts) — un particulier vendant son propre véhicule est un signal positif par nature.
  Pro avec garantie explicitement mentionnée ≥ 12 mois : +11 pts.
  Pro avec garantie courte (< 12 mois) : +8 pts.
  Pro sans garantie mentionnée : +7 pts.
- Cohérence des informations fournies : jusqu'à +3 pts
- Red flags RÉELS uniquement : -2 pts chacun (max -6 pts)
  Un red flag réel = urgence explicite de vente, prix anormalement bas sans explication,
  incohérences factuelles graves (km inversés, année impossible, etc.)
  PAS un red flag : absence de CT (légal), garage multimarque, année en cours
- Annonce ancienne (>60 jours) : -2 pts (signe de difficulté à vendre)

Prix marché (15 pts) :
- Estime la fourchette de prix marché réaliste pour ce véhicule (modèle, année, km, carburant, boîte)
- Bonne affaire (>10% sous marché) : 15 pts
- Dans la moyenne (écart ≤5% dans un sens ou dans l'autre) : 12 pts
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
- Points forts de ce bloc
- Défauts connus et récurrents avec description précise
- Kilométrages critiques pour les interventions majeures sur CE bloc
- Évaluation du risque au kilométrage actuel
- Verdict fiabilité moteur : Fiable / Correct / Risqué / Très risqué

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- synthese_ia : 4 lignes maximum. Ton neutre et factuel, pas de majuscules excessives, pas de style alarmiste.
  Structure imposée : [constat principal sur le véhicule] + [point positif principal] + [point négatif principal] + [recommandation courte]
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


def get_prompt_3(vehicule: dict, r1: dict, r2: dict) -> tuple:
    system = """Tu es un expert en mécanique automobile et en chiffrage de réparations en France.
Tu connais les tarifs pratiqués en France par les garages indépendants et les concessions pour toutes les interventions courantes et majeures.
Tu es prudent et honnête — tu n'alarmes pas inutilement mais tu ne minimises pas non plus.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base du scoring et de l'analyse de fiabilité, produis les points de vigilance et les coûts prévisionnels.

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
   - Spécifiques à CE véhicule, pas des généralités
   - Inclure la conséquence potentielle et le coût estimé si applicable
   - Sources : défauts connus du bloc moteur (R2), red flags vendeur (R1)

2. Points à surveiller (orange) — maximum 4, éléments importants mais moins urgents
   - Vérifications recommandées lors de la visite ou à court terme
   - Sources : interventions proches en km (R2), infos manquantes importantes (R1)

COÛTS PRÉVISIONNELS :

ÉTAPE PRÉLIMINAIRE OBLIGATOIRE — Lire l'historique d'entretien :
Avant de lister tout travail, lis attentivement la description, les infos_cles et l'historique du véhicule.
Identifie les travaux récents déjà effectués (ex: "FAP changé", "embrayage refait", "courroie de distribution remplacée").
RÈGLE ABSOLUE : tout travail mentionné comme récemment effectué NE DOIT PAS apparaître dans
les travaux imminents ni dans les travaux long terme. Les ignorer complètement.

1. Entretien courant annuel
   - Estime le coût annuel moyen (révision, vidange, consommables)
   - Tiens compte de la marque, du carburant et du kilométrage

2. Travaux imminents
   - UNIQUEMENT les interventions réellement nécessaires maintenant pour CE véhicule précis
   - Un travail "imminent" = il y a un signal concret (kilométrage critique dépassé ET non fait,
     symptôme mentionné, ou défaut connu récurrent à CE kilométrage pour CE bloc)
   - NE PAS lister des travaux par précaution générique si aucun signal concret
   - NE PAS lister un travail récemment effectué (voir étape préliminaire)
   - Maximum 3 travaux imminents — si tu en trouves plus de 3 vrais, prends les 3 plus urgents

3. Travaux à surveiller (moyen/long terme)
   - Interventions probables dans les 2-5 prochaines années, non encore nécessaires
   - NE PAS lister un travail récemment effectué (voir étape préliminaire)
   - Être réaliste sur les horizons : un FAP remplacé récemment ne revient pas avant 5-7 ans
   - Maximum 4 travaux long terme

CHECKLIST INSPECTION :
Génère UNIQUEMENT le tableau specifique_modele (8 points maximum) :
- Points de vérification spécifiques à CE modèle et CETTE motorisation, basés sur les défauts connus (R2)
- Les catégories universelles (documents, carrosserie, mecanique, essai_routier) sont gérées statiquement côté front — ne les génère pas.

RAPPELS CONSTRUCTEUR & SÉCURITÉ :
- Ne mentionne QUE les rappels dont tu as la certitude absolue (campagnes officielles documentées)
- En cas de doute : rappels_constructeur = [] et aucun_rappel_majeur = true
- INTERDIT de générer des rappels "probables" ou "à vérifier" — ce sont des hallucinations
- Si aucune certitude, conseil_securite_paiement doit mentionner de vérifier avec le VIN sur le site officiel du constructeur
- Évalue le risque de vol pour ce modèle en France

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- Chaque point critique : titre (5 mots max) + description (2 phrases max) + consequence (1 phrase max) + coût estimé
- Chaque point à surveiller : titre + 1 phrase. Pas plus.
- Maximum 3 points critiques et 4 points à surveiller
- Maximum 3 travaux imminents et 3 travaux long terme
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


def get_prompt_4(vehicule: dict, r1: dict, r2: dict, r3: dict, computed: dict) -> tuple:
    system = """Tu es un expert en cote automobile et en négociation sur le marché de l'occasion français.
Tu connais parfaitement les dynamiques du marché auto français (LeBonCoin, La Centrale, L'Argus, AutoScout24).
Tu es pragmatique et orienté résultat — tu donnes des conseils concrets et actionnables.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    positionnement_pourcentage = computed.get('positionnement_pourcentage')
    kilometrage_2_ans = computed.get('kilometrage_2_ans')
    kilometrage_5_ans = computed.get('kilometrage_5_ans')

    def _fmt(v, suffix=''):
        return f'{v}{suffix}' if v is not None else 'non calculable'

    user = f"""Sur la base de toutes les données disponibles, produis l'analyse prix complète et les conseils de négociation.

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

Impact de l'âge de l'annonce :
- Si l'annonce a plus de 30 jours : le vendeur est probablement sous pression, marge de négociation augmentée
- Chiffre l'impact sur le prix cible

NÉGOCIATION :

Produis un objectif de négociation chiffré et réaliste avec :
- Prix cible recommandé
- Liste des arguments de négociation, chacun avec son impact estimé en €
  - Kilométrage élevé
  - Travaux imminents identifiés (utilise les totaux de R3)
  - Infos manquantes (carnet, factures)
  - Âge de l'annonce
  - Défauts esthétiques mentionnés
- Total des arguments = justification du prix cible

MESSAGE VENDEUR :
Rédige un premier message de prise de contact naturel et simple.
- Commencer par demander si le véhicule est toujours disponible
- Enchaîner avec 2 ou 3 questions clés issues des points critiques (R3) — pas toutes les questions, juste les plus importantes
- Ton neutre, curieux, sans s'engager ni se positionner
- INTERDIT : toute référence au prix, à la négociation, aux défauts ou aux travaux
- Maximum 80 mots

QUESTIONS À POSER AU VENDEUR :
Liste de 5 à 8 questions précises et priorisées.
- Basées sur les points critiques et à surveiller (R3)
- Priorisées par importance (les questions sur les points critiques en premier)
- Formulées de manière à obtenir des réponses vérifiables

PROJECTION DÉCOTE :
Estime la valeur du véhicule dans 2 ans et 5 ans.
- Utilise les kilométrages futurs fournis ci-dessus (calculés côté serveur) — ne les recalcule pas
- Tiens compte de la revendabilité du modèle/finition
- Tiens compte des travaux à prévoir qui affecteront la valeur
- Commente la revendabilité générale du véhicule

CONTRAINTES DE LONGUEUR STRICTES — à respecter absolument :
- commentaire_age_annonce : 1 phrase maximum
- commentaire_revendabilite : 3 lignes maximum
- arguments de négociation : 5 maximum
- message_vendeur : 100 mots maximum, ton sobre et professionnel
- point_vigilance_associe dans questions_vendeur : 1 phrase maximum par question

Réponds avec ce JSON :

{{
  "analyse_prix": {{
    "fourchette_marche_min": 0,
    "fourchette_marche_max": 0,
    "positionnement": "bonne_affaire | dans_la_moyenne | légèrement_surévalué | surévalué",
    "positionnement_pourcentage": 0,
    "commentaire_age_annonce": ""
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


def get_prompt_5(vehicule: dict, r1: dict, date_aujourdhui: str) -> tuple:
    system = """Tu es un assistant automobile français expert en réglementation, fiscalité automobile et assurance en France.
Tu connais parfaitement les règles ZFE, le système Crit'Air, le calcul des cartes grises par région, et les tarifs d'assurance en France.
Tu es précis sur les chiffres et tu signales toujours quand une estimation est approximative.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown."""

    user = f"""Sur la base des données du véhicule, produis toutes les informations pratiques.

Données structurées (R1) :
{json.dumps(r1, ensure_ascii=False, indent=2)}

Données originales :
{json.dumps(vehicule, ensure_ascii=False, indent=2)}

Date du jour : {date_aujourdhui}

---

1. CRIT'AIR & ZFE

Détermine la vignette Crit'Air du véhicule :
- Diesel immatriculé entre 2011 et 2014 = Crit'Air 3
- Diesel immatriculé entre 2015 et 2018 = Crit'Air 2
- Essence immatriculée entre 2011 et 2014 = Crit'Air 2
- Essence immatriculée entre 2015 et 2018 = Crit'Air 1
- Électrique = Crit'Air 0
(applique les règles officielles françaises en vigueur)

Évalue le statut dans les principales ZFE françaises en 2026 et les restrictions prévues.

2. BUDGET ASSURANCE

Estime les fourchettes de coût mensuel pour :
- Assurance tous risques
- Assurance au tiers
Basé sur : profil bon conducteur standard, 50% de bonus, véhicule d'occasion.
Tiens compte de la puissance, de la valeur du véhicule, et du risque de vol du modèle.

3. ESTIMATION CARTE GRISE

Calcule l'estimation de carte grise pour ce véhicule.
- Détermine le nombre de CV fiscaux à partir de la puissance et du carburant
- Applique la réduction de 50% pour les véhicules de plus de 10 ans sur la taxe régionale
- Utilise le tarif moyen national de la taxe régionale (~43€/CV) si la région n'est pas connue
- Détaille les composantes : taxe régionale, taxe de gestion, taxe de formation, redevance acheminement

4. CONSOMMATION & AUTONOMIE

À partir de la motorisation identifiée dans R1 :
- Consommation théorique officielle ville / route / mixte (L/100km)
- Capacité du réservoir estimée pour ce modèle
- Autonomie estimée sur route (plein / conso route)
- Coût d'un plein au prix moyen national actuel (diesel : ~1,80€/L, essence SP95 : ~1,75€/L)
- Source : données constructeur officielles

5. PROFIL D'UTILISATION RECOMMANDÉ

Évalue l'adéquation du véhicule sur 4 axes (score de 1 à 10) :
- Ville : maniabilité, gabarit, conso urbaine, stationnement
- Autoroute : confort, consommation, puissance
- Famille : espace, coffre, praticité
- Plaisir : dynamisme, équipements, prestige

Génère 3 tags représentatifs du profil (ex: #Routière, #FaibleConso, #SportyLook)
et une description narrative du conducteur idéal pour ce véhicule (2 phrases maximum).

CONTRAINTES DE LONGUEUR :
- description_conducteur_ideal : 2 phrases maximum
- commentaire dans assurance : 2 phrases maximum

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
    "tous_risques_min": 0,
    "tous_risques_max": 0,
    "au_tiers_min": 0,
    "au_tiers_max": 0
  }},
  "carte_grise": {{
    "cv_fiscaux": 0,
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
    "autoroute": 0,
    "famille": 0,
    "plaisir": 0,
    "tags": []
  }}
}}"""
    return system, user


def get_prompt_vendor(r1, r2, r3, r4, vendor_responses):
    system = """Tu es un expert automobile qui réévalue l'achat d'un véhicule après réception des réponses du vendeur.
Tu as déjà effectué une analyse complète. Le vendeur a maintenant répondu à une série de questions.
Ton rôle : identifier ce que les réponses confirment ou infirment, et mettre à jour la recommandation d'achat.

RÈGLES STRICTES :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires
- Base-toi exclusivement sur les réponses fournies
- Sois concis et actionnable
- Le prix cible peut rester identique si les réponses sont neutres"""

    vendor_str = "\n".join([f"- {k}: {v}" for k, v in (vendor_responses or {}).items()])

    user = f"""ANALYSE INITIALE :
Score global : {r2.get('score_global') if r2 else 'N/A'}/100 — Verdict : {r2.get('verdict') if r2 else 'N/A'}
Points de vigilance : {len((r3 or {}).get('points_vigilance', {}).get('critiques', [])) if r3 else 0} critiques, {len((r3 or {}).get('points_vigilance', {}).get('avertissements', [])) if r3 else 0} avertissements
Prix cible initial : {(r4 or {}).get('negociation', {}).get('prix_cible_negociation')} €

RÉPONSES DU VENDEUR :
{vendor_str}

Retourne ce JSON :
{{
  "verdict_final": "Achat confirmé" | "Achat possible" | "Prudence" | "Abandon recommandé",
  "resume": "2-3 phrases résumant l'impact des réponses sur la décision",
  "points_confirmes": ["string", ...],
  "points_non_confirmes": ["string", ...],
  "nouveaux_risques": ["string", ...],
  "prix_cible_mise_a_jour": 0,
  "justification_prix": "string",
  "message_suite": "Message de suivi au vendeur (60 mots max, neutre et professionnel)"
}}"""

    return system, user
