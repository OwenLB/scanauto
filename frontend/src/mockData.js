export const MOCK_VEHICULE = {
  description: 'Golf GTI Clubsport 245 ch DSG7 — demo',
  lien_annonce: '',
}

export const MOCK_R1 = {
  vehicule_identifie: {
    marque: 'Volkswagen',
    modele: 'Golf',
    finition: 'GTI Clubsport',
    annee: 2019,
    kilometrage: 87500,
    carburant: 'Essence',
    boite: 'DSG7',
    generation: 'Mk7.5 (facelift)',
    bloc_moteur: {
      designation: 'EA888 Gen3',
      code: 'DJF',
      puissance_ch: 245,
    },
    km_par_an: 17500,
    coherence_kilometrage: 'Cohérent',
    ct_valide: true,
    carnet_entretien: 'Complet',
    nb_proprietaires: 2,
    prix: 24900,
  },
  vendeur: {
    type: 'Particulier',
    localisation: 'Lyon (69)',
    age_annonce_jours: 12,
    ton_annonce: 'Honnête et détaillé',
    red_flags: [],
  },
  options_detectees: [
    { nom: 'Toit ouvrant panoramique', coherent_avec_finition: true },
    { nom: 'Sièges Recaro', coherent_avec_finition: true },
    { nom: 'Pack hiver', coherent_avec_finition: true },
    { nom: 'Caméra de recul', coherent_avec_finition: false },
  ],
  infos_manquantes: [
    { champ: 'Rapport Histovec', impact: 'important' },
    { champ: 'Date du dernier embrayage DSG', impact: 'important' },
    { champ: 'Facture distribution', impact: 'mineur' },
  ],
}

export const MOCK_R2 = {
  score_global: 72,
  verdict: 'Bon',
  synthese_ia:
    'Cette Golf GTI Clubsport 245 ch présente un bilan globalement positif. Le kilométrage est cohérent avec l\'âge du véhicule et le carnet d\'entretien complet rassure. La boîte DSG7 mérite une vérification de l\'embrayage autour de 90 000 km. Le prix est légèrement au-dessus du marché mais se justifie par l\'équipement. Un essai routier complet et une inspection préachat sont vivement recommandés.',
  criteres: {
    kilometrage: {
      score: 17,
      max: 25,
      statut: 'complet',
      justification: '87 500 km pour 6 ans, soit ~14 600 km/an. Cohérent pour un GTI de particulier.',
    },
    fiabilite: {
      score: 18,
      max: 25,
      statut: 'complet',
      justification: 'EA888 robuste mais DSG7 à surveiller entre 80–100 k km.',
    },
    historique: {
      score: 16,
      max: 20,
      statut: 'incomplet',
      justification: 'Carnet complet mais pas d\'Histovec. 2 propriétaires est rassurant.',
    },
    signaux_vendeur: {
      score: 12,
      max: 15,
      statut: 'complet',
      justification: 'Annonce détaillée, photos nombreuses, réponses rapides.',
    },
    prix_marche: {
      score: 9,
      max: 15,
      statut: 'complet',
      justification: 'Légèrement au-dessus de la cote, négociation possible de 800–1 500 €.',
      fourchette_marche_min: 22500,
      fourchette_marche_max: 25500,
      positionnement: 'légèrement_surévalué',
    },
  },
  fiabilite_moteur: {
    bloc: 'EA888 Gen3 2.0 TSI 245 ch',
    verdict: 'Correct',
    analyse_narrative:
      'Le bloc EA888 Gen3 est globalement fiable dans sa version 245 ch (DSG7). Les principaux points de vigilance concernent la boîte DSG7 qui peut présenter des à-coups en dessous de 50 000 km et nécessite un remplacement du liquide tous les 60 000 km. La distribution est en chaîne. L\'intercooler et le turbo sont des points à surveiller au-delà de 100 000 km.',
    points_forts: [
      'Distribution chaîne (pas de courroie à changer)',
      'Moteur éprouvé avec de nombreux retours positifs',
      'Puissance bien dosée, fiabilité supérieure à la version 220 ch',
    ],
    defauts_connus: [
      {
        defaut: 'À-coups DSG7 à froid',
        description:
          'La boîte DSG7 peut présenter des à-coups lors des manœuvres à basse vitesse, notamment à froid.',
        kilometrage_critique: 'Surtout < 50 000 km, puis peut réapparaître > 80 000 km si embrayage usé',
      },
      {
        defaut: 'Consommation d\'huile EA888',
        description:
          'Certains exemplaires consomment de l\'huile (0,5 L/1 000 km). À vérifier avec le propriétaire.',
        kilometrage_critique: '> 60 000 km',
      },
    ],
    interventions_critiques: [
      {
        intervention: 'Vidange huile DSG7',
        kilometrage_preconise: 'Tous les 60 000 km',
        statut_sur_ce_vehicule: 'à_prévoir_immédiatement',
        cout_estime_min: 200,
        cout_estime_max: 350,
      },
      {
        intervention: 'Inspection embrayage DSG7',
        kilometrage_preconise: '90 000 km',
        statut_sur_ce_vehicule: 'à_vérifier',
        cout_estime_min: 0,
        cout_estime_max: 0,
      },
    ],
  },
}

export const MOCK_R3 = {
  points_vigilance: {
    critiques: [
      {
        titre: 'État embrayage DSG7',
        description:
          'À 87 500 km, l\'embrayage DSG7 approche de sa limite de vie (80–100 k km). Un test à froid et des manœuvres lentes doivent être effectués lors de l\'essai.',
        consequence: 'Remplacement nécessaire : 1 200 à 1 800 € en atelier spécialisé.',
        cout_estime_min: 1200,
        cout_estime_max: 1800,
      },
    ],
    a_surveiller: [
      {
        titre: 'Consommation d\'huile moteur',
        description:
          'Demander si le propriétaire a observé une consommation anormale. Vérifier le niveau lors de la visite.',
      },
      {
        titre: 'Historique HistoVec manquant',
        description:
          'Demander le rapport Histovec pour confirmer le kilométrage et l\'absence de sinistres.',
      },
    ],
  },
  couts_previsionnels: {
    total_travaux_imminents_min: 1200,
    total_travaux_imminents_max: 1800,
    entretien_annuel_min: 600,
    entretien_annuel_max: 900,
    travaux_imminents: [
      {
        intervention: 'Remplacement embrayage DSG7',
        urgence: 'avant_achat',
        cout_min: 1200,
        cout_max: 1800,
      },
      {
        intervention: 'Vidange liquide DSG7',
        urgence: 'immédiat',
        cout_min: 200,
        cout_max: 350,
      },
    ],
    travaux_long_terme: [
      {
        intervention: 'Remplacement pneumatiques (4)',
        horizon: 'Dans 10 000 km',
        cout_min: 500,
        cout_max: 700,
      },
      {
        intervention: 'Freins (disques + plaquettes AV)',
        horizon: 'Dans 15 000 km',
        cout_min: 300,
        cout_max: 450,
      },
    ],
  },
  checklist_inspection: {
    specifique_modele: [
      'Tester la DSG7 à froid : à-coups dans les manœuvres lentes',
      'Vérifier le niveau d\'huile moteur et la présence de mousse (émulsion)',
      'Contrôler les soufflets de cardan (usure typique sur Golf sportive)',
      'Inspecter l\'intercooler et les durites turbo (fissures)',
      'Vérifier l\'absence de fumée bleue à l\'échappement à froid',
      'Tester le toit ouvrant panoramique (joints et moteur)',
      'Contrôler l\'état des sièges Recaro (armatures, coutures)',
    ],
  },
  securite: {
    aucun_rappel_majeur: true,
    rappels_constructeur: [],
    risque_vol: 'Élevé — GTI très convoitées. Antivol supplémentaire conseillé.',
    conseil_securite_paiement: 'Virement bancaire recommandé. Éviter tout paiement en espèces au-delà de 1 000 €.',
  },
}

export const MOCK_R4 = {
  analyse_prix: {
    fourchette_marche_min: 22500,
    fourchette_marche_max: 25500,
    positionnement: 'légèrement_surévalué',
    positionnement_pourcentage: 8,
    commentaire_age_annonce:
      'L\'annonce est en ligne depuis 12 jours sans baisse de prix, le vendeur est probablement réceptif à une négociation.',
  },
  negociation: {
    prix_cible: 23200,
    economie_potentielle: 1700,
    arguments: [
      { argument: 'Embrayage DSG7 à remplacer avant 100 000 km', impact_euros: 1500 },
      { argument: 'Histovec non fourni — risque incertain', impact_euros: 500 },
      { argument: 'Légère surcote vs marché actuel', impact_euros: 800 },
    ],
  },
  message_vendeur:
    'Bonjour,\n\nVotre Golf GTI Clubsport est-elle toujours disponible ?\n\nJe suis intéressé et aurais quelques questions : le liquide DSG7 a-t-il été changé récemment ? Avez-vous observé des à-coups à froid ? Serait-il possible d\'avoir le rapport Histovec ?\n\nCordialement',
  questions_vendeur: [
    {
      question: 'Avez-vous observé des à-coups à froid avec la DSG7 ?',
      priorite: 1,
      point_vigilance_associe: 'État embrayage DSG7',
    },
    {
      question: 'Le liquide DSG a-t-il été changé ? Si oui, à quel kilométrage ?',
      priorite: 1,
      point_vigilance_associe: 'Vidange DSG7',
    },
    {
      question: 'Y a-t-il eu des réparations ou accidents non mentionnés ?',
      priorite: 2,
      point_vigilance_associe: null,
    },
    {
      question: 'Pouvez-vous fournir le rapport Histovec ?',
      priorite: 1,
      point_vigilance_associe: 'Historique HistoVec manquant',
    },
  ],
  projection_decote: {
    valeur_2_ans_min: 19000,
    valeur_2_ans_max: 21000,
    pourcentage_2_ans: 18,
    kilometrage_estime_2_ans: 122500,
    valeur_5_ans_min: 13500,
    valeur_5_ans_max: 16000,
    pourcentage_5_ans: 38,
    kilometrage_estime_5_ans: 175000,
    commentaire_revendabilite:
      'Les GTI Clubsport sont recherchées sur le marché de l\'occasion. La décote reste raisonnable si l\'entretien est tenu à jour.',
  },
}

export const MOCK_R5 = {
  critair: {
    classe: '1',
    couleur: 'Violet',
    zfe_statut_2026: 'Autorisé dans toutes les ZFE en 2026',
    zfe_details: [
      { ville: 'Paris', statut: 'autorisé' },
      { ville: 'Lyon', statut: 'autorisé' },
      { ville: 'Marseille', statut: 'autorisé' },
    ],
  },
  assurance: {
    tous_risques_min: 85,
    tous_risques_max: 140,
    au_tiers_min: 35,
    au_tiers_max: 65,
  },
  carte_grise: {
    cv_fiscaux: 9,
    reduction_age: false,
    total_estime: 430,
  },
  consommation: {
    ville: '11,2 L',
    mixte: '8,1 L',
    route: '6,4 L',
    reservoir_litres: 50,
    cout_plein_estime: 90,
  },
  profil_utilisation: {
    ville: 5,
    autoroute: 7,
    famille: 6,
    plaisir: 9,
    tags: ['Sport', 'Week-end', 'Conducteur'],
  },
}
