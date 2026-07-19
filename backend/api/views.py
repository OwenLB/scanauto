import json
import logging
import threading
import time
import traceback
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from queue import Queue

import anthropic
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from supabase import create_client

from .prompts import get_prompt_1, get_prompt_2, get_prompt_3, get_prompt_4, get_prompt_5, get_prompt_vendor
try:
    from .moto_prompts import get_moto_prompt_1, get_moto_prompt_2, get_moto_prompt_3, get_moto_prompt_4, get_moto_prompt_5
    _MOTO_PROMPTS_AVAILABLE = True
except ImportError:
    _MOTO_PROMPTS_AVAILABLE = False

logger = logging.getLogger('api')

HAIKU = 'claude-haiku-4-5-20251001'
SONNET = 'claude-sonnet-4-6'

# ---------------------------------------------------------------------------
# Rate limiting in-memory (par user_id, fenêtre glissante)
# Fonctionne pour un processus unique. Avec plusieurs workers Gunicorn,
# chaque worker a son propre compteur — acceptable pour le volume actuel.
# ---------------------------------------------------------------------------
_rl_lock = threading.Lock()
_rl_buckets: dict[str, list[float]] = defaultdict(list)

_RATE_LIMITS = {
    'analyze': (20, 3600),   # 20 analyses / heure
    'scrape':  (60, 3600),   # 60 scrapes / heure
    'chat':    (100, 3600),  # 100 messages / heure
}

def _rate_ok(user_id: str, action: str, enabled: bool = True) -> bool:
    if not enabled:
        return True
    max_calls, window = _RATE_LIMITS.get(action, (30, 3600))
    now = time.time()
    with _rl_lock:
        bucket = _rl_buckets[f'{user_id}:{action}']
        bucket[:] = [t for t in bucket if now - t < window]
        if len(bucket) >= max_calls:
            return False
        bucket.append(now)
        return True

# Champs requis — source de vérité : vehicle-schema.json à la racine du repo.
# Chargement dynamique si le fichier est accessible (dev local, déploiement repo complet),
# sinon fallback sur les constantes inline pour éviter un crash au démarrage (ex: Render
# avec root directory = backend/).
_VEHICLE_REQUIRED_FALLBACK = frozenset({'marque', 'modele', 'annee', 'kilometrage', 'prix'})
_VEHICLE_KNOWN_FALLBACK = frozenset({
    'marque', 'modele', 'finition', 'motorisation', 'annee', 'kilometrage',
    'carburant', 'boite', 'prix', 'nb_proprietaires',
    'vendeur_type', 'vendeur_localisation', 'date_mise_en_ligne',
    'ct_valide', 'carnet_entretien', 'infos_cles', 'description', 'lien_annonce',
})

try:
    _schema_path = Path(__file__).resolve().parent.parent.parent / 'vehicle-schema.json'
    with _schema_path.open(encoding='utf-8') as _f:
        _schema = json.load(_f)
    VEHICLE_REQUIRED = frozenset(f['key'] for f in _schema['fields'] if f.get('required'))
    VEHICLE_KNOWN    = frozenset(f['key'] for f in _schema['fields'])
    logger.info(f'[schema] vehicle-schema.json chargé ({len(VEHICLE_KNOWN)} champs)')
except Exception as e:
    VEHICLE_REQUIRED = _VEHICLE_REQUIRED_FALLBACK
    VEHICLE_KNOWN    = _VEHICLE_KNOWN_FALLBACK
    logger.warning(f'[schema] vehicle-schema.json introuvable ({e}), fallback inline utilisé')


def _get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _get_fernet():
    key = settings.ENCRYPTION_KEY
    if not key:
        raise ValueError('ENCRYPTION_KEY non configurée')
    return Fernet(key.encode() if isinstance(key, str) else key)


def _encrypt_api_key(api_key: str) -> str:
    return _get_fernet().encrypt(api_key.encode()).decode()


def _decrypt_api_key(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


def _get_user_profile(user_id: str) -> dict:
    """Retourne {'api_key': str|None, 'rate_limit_enabled': bool}."""
    try:
        sb = _get_supabase()
        result = sb.table('user_profiles').select('anthropic_api_key, rate_limit_enabled').eq('id', user_id).execute()
        if not result.data:
            return {'api_key': None, 'rate_limit_enabled': True}
        row = result.data[0]
        api_key = None
        if row.get('anthropic_api_key'):
            try:
                api_key = _decrypt_api_key(row['anthropic_api_key'])
            except (InvalidToken, Exception) as e:
                logger.error(f'[api_key] Déchiffrement échoué pour {user_id}: {e}')
        return {
            'api_key': api_key,
            'rate_limit_enabled': row.get('rate_limit_enabled', True),
        }
    except Exception as e:
        logger.error(f'[profile] Impossible de récupérer le profil pour {user_id}: {e}')
        return {'api_key': None, 'rate_limit_enabled': True}


def _get_user_api_key(user_id: str) -> str | None:
    return _get_user_profile(user_id)['api_key']


def _get_user_id(request):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    try:
        # Déléguer la vérification du JWT à Supabase — fonctionne en HS256 et RS256
        res = _get_supabase().auth.get_user(token)
        return res.user.id if res.user else None
    except Exception as e:
        logger.warning(f'[auth] get_user failed: {type(e).__name__}: {e}')
        return None


def _cors_options():
    response = JsonResponse({})
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


def health(request):
    return JsonResponse({'status': 'ok', 'timestamp': datetime.now().isoformat()})


def call_claude(system_prompt: str, user_prompt: str, max_tokens: int = 4096, call_name: str = '', model: str = HAIKU, api_key: str = '') -> dict:
    label = f'[{call_name}]' if call_name else '[claude]'
    logger.info(f'{label} Starting — model={model}, max_tokens={max_tokens}, prompt_len={len(user_prompt)}')
    start = time.time()

    client = anthropic.Anthropic(api_key=api_key, timeout=300.0)
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=[
            {
                'type': 'text',
                'text': system_prompt,
                'cache_control': {'type': 'ephemeral'},
            }
        ],
        messages=[{'role': 'user', 'content': user_prompt}],
    )
    content = message.content[0].text.strip()

    if content.startswith('```'):
        lines = content.split('\n')
        content = '\n'.join(lines[1:-1]) if lines[-1].strip() == '```' else '\n'.join(lines[1:])

    elapsed = time.time() - start
    cache_created = getattr(message.usage, 'cache_creation_input_tokens', 0)
    cache_read = getattr(message.usage, 'cache_read_input_tokens', 0)
    logger.info(
        f'{label} Done in {elapsed:.1f}s — '
        f'in={message.usage.input_tokens} out={message.usage.output_tokens} '
        f'cache_created={cache_created} cache_read={cache_read}'
    )

    try:
        result = json.loads(content)
        return result
    except json.JSONDecodeError as e:
        logger.error(f'{label} JSON parse failed: {e}\nRaw content (first 500): {content[:500]}')
        raise


def sse_event(event_type: str, data: dict) -> str:
    return f'event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'


def _update_analysis(sb, analysis_id, user_id, fields: dict):
    try:
        sb.table('analyses').update(fields).eq('id', analysis_id).eq('user_id', user_id).execute()
    except Exception as e:
        logger.error(f'[analyze] Supabase update {analysis_id} failed: {e}')


def _strip_md_links(text):
    """[Texte](url) → Texte"""
    import re
    return re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text).strip()


def _parse_lbc_markdown(markdown, url=''):
    """Parse procédural d'un markdown LeBonCoin → dict vehicule pour pré-remplir le formulaire."""
    import re
    # Normaliser les fins de ligne Windows éventuelles
    markdown = markdown.replace('\r\n', '\n').replace('\r', '\n')

    images = re.findall(r'!\[.*?\]\((https://img\.leboncoin\.fr[^)]+rule=ad-large[^)]*)\)', markdown)[:6]

    def _kv_section(md):
        lower = md.lower()
        idx = lower.find('informations cl')
        logger.info(f'[parse_lbc] "informations cl" idx={idx}')
        if idx == -1:
            h2s = [l for l in md.split('\n') if l.startswith('##')][:10]
            logger.warning(f'[parse_lbc] kv introuvable. H2s={h2s}')
            logger.warning(f'[parse_lbc] md[:500] hex={md[:500].encode("utf-8").hex()}')
            return {}
        # Log les 80 chars autour pour voir l'encodage exact
        logger.info(f'[parse_lbc] context around idx: {repr(md[max(0,idx-10):idx+30])}')
        block_start = md.find('\n', idx)
        next_h2 = md.find('\n##', block_start)
        block = md[block_start:next_h2] if next_h2 != -1 else md[block_start:]
        logger.info(f'[parse_lbc] block[:200]={repr(block[:200])}')
        pairs = {}
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        logger.info(f'[parse_lbc] first lines={lines[:8]}')
        i = 0
        while i < len(lines):
            key = lines[i]
            if i + 1 < len(lines):
                val_raw = lines[i + 1]
                val = _strip_md_links(val_raw)
                if val and not val.startswith('#') and not val.startswith('!'):
                    pairs[key] = val
                    i += 2
                    continue
            i += 1
        return pairs

    kv = _kv_section(markdown)
    logger.info(f'[parse_lbc] kv keys={list(kv.keys())}')

    def _kv(*keys):
        for k in keys:
            v = kv.get(k, '')
            if v:
                return v
        return ''

    prix_raw = re.search(r'([\d\s]+)\s*€', markdown)
    prix = int(re.sub(r'\s', '', prix_raw.group(1))) if prix_raw else ''

    km_raw = _kv('Kilométrage')
    km = int(re.sub(r'\s', '', re.sub(r'[^\d]', '', km_raw))) if km_raw else ''

    annee_raw = _kv('Année modèle', 'Année')
    annee = int(annee_raw) if annee_raw and annee_raw.isdigit() else ''

    ct_raw = _kv('Date de fin de validité du contrôle technique')

    # Description : arrêter avant "Voir plus" (lien LBC) ou prochain ##
    desc_m = re.search(r'##[\s ]+Description\s*(.*?)(?=\nVoir plus|\n##|\Z)', markdown, re.DOTALL)
    description = desc_m.group(1).strip() if desc_m else ''

    vendeur_m = re.search(r'##\s+Vendu par\s*(.*?)(?=\n##|\Z)', markdown, re.DOTALL)
    vendeur_block = vendeur_m.group(1) if vendeur_m else ''
    # Localisation : "· [Hoerdt](url) ·" → nettoyer le lien markdown
    loc_m = re.search(r'·\s*(\[?[^·\n]+?\]?(?:\([^)]+\))?)\s*·', markdown)
    localisation = _strip_md_links(loc_m.group(1)).strip() if loc_m else ''
    type_vendeur = 'pro' if 'Pro' in vendeur_block or 'professionnel' in vendeur_block.lower() else 'particulier'

    # Date : format "31 mai 2026hier à..." — pas de séparateur entre l'année et la suite
    prix_pos = markdown.find('€')
    search_zone = markdown[prix_pos:prix_pos + 200] if prix_pos != -1 else markdown
    mois_pat = r'(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)'
    date_m = re.search(r'(\d{1,2})\s+' + mois_pat + r'\s+(\d{4})', search_zone, re.IGNORECASE)
    date_mise_en_ligne = ''
    if date_m:
        mois_map = {'janvier':'01','fevrier':'02','février':'02','mars':'03','avril':'04','mai':'05','juin':'06',
                    'juillet':'07','aout':'08','août':'08','septembre':'09','octobre':'10','novembre':'11',
                    'decembre':'12','décembre':'12'}
        j = date_m.group(1).zfill(2)
        mo = mois_map.get(date_m.group(2).lower().replace('é','e').replace('û','u'), '01')
        an = date_m.group(3)
        date_mise_en_ligne = f'{an}-{mo}-{j}'

    historique = _kv('Historique et entretien').lower()
    carnet = 'oui' if 'carnet' in historique else 'non_mentionné'

    # Infos clés : toutes les paires kv formatées en texte pour le champ textarea
    infos_cles = '\n'.join(f'{k} : {v}' for k, v in kv.items()) if kv else ''

    return {
        'vehicle_type': 'moto' if '/motos/' in url or 'moto' in _kv('Catégorie', 'Type de véhicule', 'Sous-catégorie').lower() else 'voiture',
        'marque': _kv('Marque'),
        'modele': _kv('Modèle'),
        'finition': _kv('Finition Constructeur'),
        'motorisation': _kv('Version Constructeur', 'Finition Constructeur'),
        'annee': annee,
        'kilometrage': km,
        'carburant': _kv('Énergie'),
        'boite': _kv('Boîte de vitesse'),
        'prix': prix,
        'vendeur_localisation': localisation,
        'vendeur_type': type_vendeur,
        'description': description,
        'infos_cles': infos_cles,
        'lien_annonce': url,
        'date_mise_en_ligne': date_mise_en_ligne,
        'ct_valide': 'oui' if ct_raw else 'non_mentionné',
        'carnet_entretien': carnet,
        'images': images,
        'cylindree': int(re.sub(r'[^\d]', '', _kv('Cylindrée'))) if re.search(r'\d', _kv('Cylindrée')) else None,
        'type_moto': '',
        'permis_requis': _kv('Type de permis') or _kv('Permis') or None,
    }


def _extract_from_text(description, user_api_key):
    """Appel Claude Haiku pour extraire les champs vehicule depuis un texte libre."""
    system = """Tu es un assistant qui extrait les informations d'une annonce véhicule (voiture ou moto).
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.
Si une information est absente du texte, utilise null."""

    user = f"""Extrais les informations de cette annonce et retourne ce JSON.

INSTRUCTIONS :
- vehicle_type : "moto" si l'annonce concerne une moto/scooter/deux-roues, sinon "voiture"
- marque/modele/finition : depuis le titre ou la section "Les informations clés" / "Informations clés"
- motorisation : la désignation complète (ex: "718 Cayman T 300 CV PDK", "2.0 TDI 184ch", "471cc bicylindre")
- annee : l'année modèle (entier, ex: 2020)
- kilometrage : nombre entier de km, sans espaces ni unités
- carburant : Essence, Diesel, Hybride, Électrique...
- boite : Manuelle ou Automatique (null pour les motos si non précisé)
- prix : entier en euros
- nb_proprietaires : entier si mentionné, sinon null
- vendeur_localisation : ville ou code postal du vendeur
- vendeur_type : "pro" si vendu par un professionnel/garage, sinon "particulier"
- ct_valide : "oui" si CT valide explicitement mentionné, "non" si absent/invalide, "non_mentionné" sinon (toujours "non_mentionné" pour une moto)
- carnet_entretien : "oui" si carnet/factures mentionnés, "non" si explicitement absent, "non_mentionné" sinon
- date_mise_en_ligne : date de publication au format YYYY-MM-DD si présente dans le texte (ex: "26 mai 2026" → "2026-05-26"), sinon null
- infos_cles : toutes les paires clé/valeur de la section "Les informations clés" formatées en texte, une par ligne (ex: "Marque : PORSCHE\\nModèle : Cayman\\n..."), ou null si section absente
- description : UNIQUEMENT le texte rédigé par le vendeur (après le titre "Description" s'il existe, avant "Localisation" / "Vendu par"). Exclure le header (titre, prix, date), les infos clés, les équipements standards listés automatiquement, et les infos vendeur.
- cylindree : cylindrée en cm³ (entier), null si absent ou si voiture
- type_moto : parmi roadster, sportive, trail, custom, scooter, enduro — null si voiture ou indéterminé
- permis_requis : A1, A2 ou A — null si voiture ou non mentionné

{{
  "vehicle_type": "voiture | moto",
  "marque": "",
  "modele": "",
  "finition": "",
  "motorisation": "",
  "annee": 0,
  "kilometrage": 0,
  "carburant": "",
  "boite": "",
  "prix": 0,
  "nb_proprietaires": null,
  "vendeur_localisation": "",
  "vendeur_type": "particulier | pro",
  "ct_valide": "oui | non | non_mentionné",
  "carnet_entretien": "oui | non | non_mentionné",
  "date_mise_en_ligne": null,
  "infos_cles": null,
  "description": null,
  "lien_annonce": null,
  "cylindree": null,
  "type_moto": null,
  "permis_requis": null
}}

Texte de l'annonce :
{description}"""

    result = call_claude(system, user, max_tokens=1500, call_name='extract_prefill', api_key=user_api_key)
    # Si Claude n'a pas extrait de description propre, garder le texte brut en fallback
    if not result.get('description'):
        result['description'] = description
    result['images'] = []
    return result


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def scrape_prefill(request):
    """Scrape une URL ou extrait un texte collé → retourne les champs structurés pour pré-remplir le formulaire."""
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Authentification requise'}, status=401)

    try:
        body = json.loads(request.body)
        url = body.get('url', '').strip()
        description = body.get('description', '').strip()
        if not url and not description:
            return JsonResponse({'error': 'url ou description requis'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

    profile = _get_user_profile(user_id)
    if not _rate_ok(user_id, 'scrape', profile['rate_limit_enabled']):
        return JsonResponse({'error': 'Trop de requêtes. Réessayez dans une heure.'}, status=429)

    # --- Mode texte collé : extraction Claude ---
    if description:
        user_api_key = profile['api_key']
        if not user_api_key:
            return JsonResponse({'error': 'Clé API non configurée.'}, status=403)
        try:
            vehicule = _extract_from_text(description, user_api_key)
            logger.info(f'[extract_prefill] {vehicule.get("marque")} {vehicule.get("modele")} {vehicule.get("annee")}')
        except Exception as e:
            logger.error(f'[extract_prefill] Failed: {e}')
            return JsonResponse({'error': f'Extraction échouée : {str(e)}'}, status=500)
        return JsonResponse({'vehicule': vehicule})

    # --- Mode URL : scraping Firecrawl + parsing regex ---
    firecrawl_api_key = getattr(settings, 'FIRECRAWL_API_KEY', '')
    logger.info(f'[scrape_prefill] firecrawl_key_set={bool(firecrawl_api_key)}')
    if not firecrawl_api_key:
        return JsonResponse({'error': 'Scraping non configuré — clé Firecrawl manquante.'}, status=503)

    try:
        from firecrawl import FirecrawlApp
        fc = FirecrawlApp(api_key=firecrawl_api_key)
        result = fc.scrape_url(url, params={'formats': ['markdown']})
        markdown = result.get('markdown') if isinstance(result, dict) else result.markdown
        if not markdown:
            return JsonResponse({'error': 'Aucun contenu récupéré — vérifiez l\'URL.'}, status=502)
        # DataDome bloque parfois une partie de la page — on vérifie qu'il y a du vrai contenu
        has_content = '## Les informations clés' in markdown or '## Description' in markdown
        if not has_content and ('Vous avez été bloqué' in markdown or 'captcha-delivery.com' in markdown):
            return JsonResponse({'error': 'LeBonCoin a bloqué la requête. Réessayez dans quelques secondes.'}, status=503)
        logger.info(f'[scrape_prefill] {url} — {len(markdown)} chars')
    except Exception as e:
        logger.error(f'[scrape_prefill] Scraping failed: {e}')
        return JsonResponse({'error': f'Impossible de récupérer l\'annonce : {str(e)}'}, status=502)

    vehicule = _parse_lbc_markdown(markdown, url)
    logger.info(f'[scrape_prefill] parsed: {vehicule["marque"]} {vehicule["modele"]} {vehicule["annee"]} {vehicule["kilometrage"]}km {vehicule["prix"]}€')
    return JsonResponse({'vehicule': vehicule})


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def analysis_create(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Authentification requise'}, status=401)

    try:
        body = json.loads(request.body)
        vehicule = body.get('vehicule', {})
        if not vehicule:
            return JsonResponse({'error': 'vehicule data required'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

    try:
        sb = _get_supabase()
        result = sb.table('analyses').insert({
            'user_id': user_id,
            'vehicule': vehicule,
            'status': 'pending',
        }).execute()
        if not result.data:
            return JsonResponse({'error': 'Failed to create analysis'}, status=500)
        analysis_id = result.data[0]['id']
        logger.info(f'[analysis_create] Created {analysis_id} for user {user_id}')
        return JsonResponse({'analysis_id': analysis_id})
    except Exception as e:
        logger.error(f'[analysis_create] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET', 'POST', 'OPTIONS'])
def analyze(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Authentification requise'}, status=401)

    profile = _get_user_profile(user_id)
    if not _rate_ok(user_id, 'analyze', profile['rate_limit_enabled']):
        return JsonResponse({'error': 'Limite d\'analyses atteinte (20/h). Réessayez dans une heure.'}, status=429)

    user_api_key = profile['api_key']
    if not user_api_key:
        return JsonResponse({'error': 'Clé API non configurée. Ajoutez votre clé Anthropic dans les paramètres.'}, status=403)

    try:
        body = json.loads(request.body)
        vehicule = body.get('vehicule', {})
        if not vehicule:
            return JsonResponse({'error': 'vehicule data required'}, status=400)
        analysis_id = body.get('analysis_id')  # UUID créé par analysis_create
        # vehicule_for_prompts exclut les champs display-only inutiles pour Claude
        vehicule_for_prompts = {k: v for k, v in vehicule.items() if k != 'images'}
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f'[analyze] Bad request body: {e}')
        return JsonResponse({'error': str(e)}, status=400)

    today = date.today().strftime('%Y-%m-%d')

    missing = VEHICLE_REQUIRED - {k for k, v in vehicule.items() if v}
    if missing:
        logger.warning(f'[analyze] Missing required fields: {missing}')

    desc_len = len(vehicule.get('description', '') or '')
    logger.info(
        f'[analyze] New analysis — marque={vehicule.get("marque") or "?"} '
        f'modele={vehicule.get("modele") or "?"} '
        f'prix={vehicule.get("prix")} '
        f'user_id={user_id or "anonymous"} '
        f'desc_chars={desc_len}'
    )

    def event_stream():
        yield ': stream start\n\n'
        analysis_start = time.time()
        sb = _get_supabase() if (user_id and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY) else None

        try:
            annee_actuelle = date.today().year
            annee_vehicule = vehicule.get('annee')
            kilometrage = vehicule.get('kilometrage') or 0
            date_mise_en_ligne_str = vehicule.get('date_mise_en_ligne')

            age_vehicule = (annee_actuelle - annee_vehicule) if (annee_vehicule and annee_actuelle > annee_vehicule) else None
            km_par_an = round(kilometrage / age_vehicule) if (kilometrage and age_vehicule and age_vehicule > 0) else None

            age_annonce_jours = None
            annonce_ancienne = None
            if date_mise_en_ligne_str:
                try:
                    date_obj = datetime.strptime(date_mise_en_ligne_str, '%Y-%m-%d').date()
                    age_annonce_jours = (date.today() - date_obj).days
                    annonce_ancienne = age_annonce_jours > 30
                except (ValueError, TypeError):
                    pass

            kilometrage_2_ans = (kilometrage + km_par_an * 2) if km_par_an else None
            kilometrage_5_ans = (kilometrage + km_par_an * 5) if km_par_an else None

            computed = {
                'km_par_an': km_par_an,
                'age_annonce_jours': age_annonce_jours,
                'annonce_ancienne': annonce_ancienne,
                'age_vehicule': age_vehicule,
                'kilometrage_2_ans': kilometrage_2_ans,
                'kilometrage_5_ans': kilometrage_5_ans,
            }

            is_moto = vehicule.get('vehicle_type') == 'moto' and _MOTO_PROMPTS_AVAILABLE
            _p1, _p2, _p3, _p4, _p5 = (
                (get_moto_prompt_1, get_moto_prompt_2, get_moto_prompt_3, get_moto_prompt_4, get_moto_prompt_5)
                if is_moto else
                (get_prompt_1, get_prompt_2, get_prompt_3, get_prompt_4, get_prompt_5)
            )

            sys1, usr1 = _p1(vehicule_for_prompts, today, computed)
            r1 = call_claude(sys1, usr1, call_name='R1', api_key=user_api_key)

            if sb and analysis_id:
                _update_analysis(sb, analysis_id, user_id, {'r1': r1, 'computed': computed})
            yield sse_event('r1', r1)

            results = {}
            q = Queue()

            def run_call_2():
                try:
                    sys2, usr2 = _p2(vehicule_for_prompts, r1)
                    r2 = call_claude(sys2, usr2, call_name='R2', model=SONNET, api_key=user_api_key)
                    q.put(('r2', r2, None))
                except Exception as e:
                    logger.error(f'[R2] Failed: {e}\n{traceback.format_exc()}')
                    q.put(('r2', None, str(e)))

            def run_call_5():
                try:
                    sys5, usr5 = _p5(vehicule_for_prompts, r1, today)
                    r5 = call_claude(sys5, usr5, call_name='R5', api_key=user_api_key)
                    q.put(('r5', r5, None))
                except Exception as e:
                    logger.error(f'[R5] Failed: {e}\n{traceback.format_exc()}')
                    q.put(('r5', None, str(e)))

            t2 = threading.Thread(target=run_call_2, daemon=True)
            t5 = threading.Thread(target=run_call_5, daemon=True)
            t2.start()
            t5.start()

            for _ in range(2):
                key, data, err = q.get()
                if err:
                    logger.error(f'[analyze] {key.upper()} errored: {err}')
                    yield sse_event(f'error_{key}', {'error': err, 'call': key})
                else:
                    results[key] = data
                    if sb and analysis_id:
                        _update_analysis(sb, analysis_id, user_id, {key: data})
                    yield sse_event(key, data)

            t2.join()
            t5.join()

            r2 = results.get('r2')
            if r2 is None:
                yield sse_event('error', {'error': 'Appel 2 (scoring) échoué', 'fatal': True})
                return

            fourchette_min = (r2.get('criteres', {}).get('prix_marche', {}).get('fourchette_marche_min') or 0)
            fourchette_max = (r2.get('criteres', {}).get('prix_marche', {}).get('fourchette_marche_max') or 0)
            prix_vehicule = (r1.get('vehicule_identifie', {}).get('prix') or vehicule.get('prix') or 0)
            if fourchette_min and fourchette_max and prix_vehicule:
                fourchette_moyenne = (fourchette_min + fourchette_max) / 2
                computed['positionnement_pourcentage'] = round(((prix_vehicule - fourchette_moyenne) / fourchette_moyenne) * 100)
            else:
                computed['positionnement_pourcentage'] = None

            r2_for_r3 = {
                'score_global': r2.get('score_global'),
                'verdict': r2.get('verdict'),
                'criteres': r2.get('criteres'),
                'fiabilite_moteur': {
                    'bloc': r2.get('fiabilite_moteur', {}).get('bloc'),
                    'verdict': r2.get('fiabilite_moteur', {}).get('verdict'),
                    'defauts_connus': r2.get('fiabilite_moteur', {}).get('defauts_connus'),
                    'interventions_critiques': r2.get('fiabilite_moteur', {}).get('interventions_critiques'),
                },
            }
            r1_for_r3 = {
                'vehicule_identifie': r1.get('vehicule_identifie'),
                'vendeur': r1.get('vendeur'),
                'infos_manquantes': r1.get('infos_manquantes'),
            }
            sys3, usr3 = _p3(vehicule_for_prompts, r1_for_r3, r2_for_r3)
            r3 = call_claude(sys3, usr3, max_tokens=8192, call_name='R3', model=SONNET, api_key=user_api_key)
            if sb and analysis_id:
                _update_analysis(sb, analysis_id, user_id, {'r3': r3})
            yield sse_event('r3', r3)

            r2_for_r4 = {
                'score_global': r2.get('score_global'),
                'verdict': r2.get('verdict'),
                'criteres': {
                    'prix_marche': r2.get('criteres', {}).get('prix_marche'),
                    'signaux_vendeur': r2.get('criteres', {}).get('signaux_vendeur'),
                },
            }
            r3_for_r4 = {
                'points_vigilance': r3.get('points_vigilance'),
                'couts_previsionnels': {
                    'total_travaux_imminents_min': r3.get('couts_previsionnels', {}).get('total_travaux_imminents_min'),
                    'total_travaux_imminents_max': r3.get('couts_previsionnels', {}).get('total_travaux_imminents_max'),
                    'travaux_imminents': r3.get('couts_previsionnels', {}).get('travaux_imminents'),
                },
            }
            sys4, usr4 = _p4(vehicule_for_prompts, r1.get('vehicule_identifie', r1), r2_for_r4, r3_for_r4, computed)
            r4 = call_claude(sys4, usr4, max_tokens=8192, call_name='R4', api_key=user_api_key)
            if sb and analysis_id:
                _update_analysis(sb, analysis_id, user_id, {'r4': r4, 'status': 'complete'})
            yield sse_event('r4', r4)

            total = time.time() - analysis_start
            logger.info(f'[analyze] Complete in {total:.1f}s — analysis_id={analysis_id}')
            yield sse_event('complete', {'success': True, 'analysis_id': analysis_id})

        except Exception as e:
            logger.error(f'[analyze] Fatal error: {e}\n{traceback.format_exc()}')
            yield sse_event('error', {'error': str(e), 'fatal': True})

    response = StreamingHttpResponse(
        streaming_content=event_stream(),
        content_type='text/event-stream; charset=utf-8',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


@csrf_exempt
@require_http_methods(['GET', 'OPTIONS'])
def analyses_list(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    try:
        sb = _get_supabase()
        result = sb.table('analyses').select(
            'id, created_at, vehicule, r2, status, group_id, group_ids'
        ).eq('user_id', user_id).order('created_at', desc=True).execute()
        # Exclure les pending (en cours ou échoués sans résultats) — ils sont gérés côté frontend via activeAnalyses
        all_data = result.data or []
        completed = [a for a in all_data if a.get('status') in (None, 'complete')]
        return JsonResponse({'analyses': completed})
    except Exception as e:
        logger.error(f'[analyses_list] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET', 'DELETE', 'PATCH', 'OPTIONS'])
def analysis_detail(request, analysis_id):
    if request.method == 'OPTIONS':
        resp = _cors_options()
        resp['Access-Control-Allow-Methods'] = 'GET, DELETE, PATCH, OPTIONS'
        return resp

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()

    if request.method == 'DELETE':
        try:
            sb.table('analyses').delete().eq('id', analysis_id).eq('user_id', user_id).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body)
            allowed = {'group_id', 'group_ids'}
            updates = {k: v for k, v in body.items() if k in allowed}
            if not updates:
                return JsonResponse({'error': 'No valid fields to update'}, status=400)
            sb.table('analyses').update(updates).eq('id', analysis_id).eq('user_id', user_id).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    try:
        result = sb.table('analyses').select('*').eq('id', analysis_id).eq('user_id', user_id).execute()
        if not result.data:
            return JsonResponse({'error': 'Not found'}, status=404)
        return JsonResponse(result.data[0])
    except Exception as e:
        logger.error(f'[analysis_detail] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET', 'POST', 'OPTIONS'])
def groups_list(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            name = (body.get('name') or '').strip()
            color = body.get('color') or '#6366f1'
            if not name:
                return JsonResponse({'error': 'name required'}, status=400)
            result = sb.table('groups').insert({
                'user_id': user_id, 'name': name, 'color': color,
            }).execute()
            return JsonResponse(result.data[0], status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    try:
        result = sb.table('groups').select('*').eq('user_id', user_id).order('created_at').execute()
        return JsonResponse({'groups': result.data or []})
    except Exception as e:
        logger.error(f'[groups_list] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['PATCH', 'DELETE', 'OPTIONS'])
def group_detail(request, group_id):
    if request.method == 'OPTIONS':
        resp = _cors_options()
        resp['Access-Control-Allow-Methods'] = 'PATCH, DELETE, OPTIONS'
        return resp

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()

    if request.method == 'DELETE':
        try:
            sb.table('groups').delete().eq('id', group_id).eq('user_id', user_id).execute()
            # Remove group from all analyses' group_ids arrays
            affected = sb.table('analyses').select('id, group_ids') \
                .eq('user_id', user_id).execute()
            for a in (affected.data or []):
                ids = a.get('group_ids') or []
                if group_id in ids:
                    sb.table('analyses').update({'group_ids': [i for i in ids if i != group_id]}) \
                        .eq('id', a['id']).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    try:
        body = json.loads(request.body)
        allowed = {'name', 'color'}
        updates = {k: v for k, v in body.items() if k in allowed}
        if 'name' in updates:
            updates['name'] = updates['name'].strip()
            if not updates['name']:
                return JsonResponse({'error': 'name cannot be empty'}, status=400)
        if not updates:
            return JsonResponse({'error': 'No valid fields'}, status=400)
        sb.table('groups').update(updates).eq('id', group_id).eq('user_id', user_id).execute()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def vendor_response(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    user_api_key = _get_user_api_key(user_id)
    if not user_api_key:
        return JsonResponse({'error': 'Clé API non configurée'}, status=403)

    try:
        body = json.loads(request.body)
        analysis_id = body.get('analysis_id')
        vendor_resp = body.get('vendor_responses', {})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

    if not analysis_id or not vendor_resp:
        return JsonResponse({'error': 'analysis_id and vendor_responses required'}, status=400)

    sb = _get_supabase()

    try:
        result = sb.table('analyses').select('*').eq('id', analysis_id).eq('user_id', user_id).execute()
        if not result.data:
            return JsonResponse({'error': 'Analysis not found'}, status=404)
        analysis = result.data[0]
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    try:
        sys_v, usr_v = get_prompt_vendor(
            analysis.get('r1'), analysis.get('r2'),
            analysis.get('r3'), analysis.get('r4'),
            vendor_resp,
        )
        vendor_reanalysis = call_claude(sys_v, usr_v, max_tokens=4096, call_name='VENDOR', model=SONNET, api_key=user_api_key)
    except Exception as e:
        logger.error(f'[vendor_response] Claude call failed: {e}\n{traceback.format_exc()}')
        return JsonResponse({'error': 'Analyse échouée'}, status=500)

    try:
        sb.table('analyses').update({
            'vendor_responses': vendor_resp,
            'vendor_reanalysis': vendor_reanalysis,
        }).eq('id', analysis_id).execute()
    except Exception as e:
        logger.error(f'[vendor_response] Supabase update failed: {e}')

    return JsonResponse({'vendor_reanalysis': vendor_reanalysis})


def _vehicle_identity_lines(vehicule: dict, r1: dict) -> list[str]:
    """Lignes d'identité communes (véhicule, motorisation, historique, vendeur)."""
    v = r1.get('vehicule_identifie') or vehicule
    marque = v.get('marque') or vehicule.get('marque', '')
    modele = v.get('modele') or vehicule.get('modele', '')
    annee = v.get('annee') or vehicule.get('annee', '')
    km = v.get('kilometrage') or vehicule.get('kilometrage', '')
    prix = v.get('prix') or vehicule.get('prix', '')

    identity_parts = [str(x) for x in [marque, modele, v.get('generation'), annee, v.get('finition')] if x]
    lines = [f"VÉHICULE: {' '.join(identity_parts)} — {km} km — {prix} €"]

    details = []
    if v.get('carburant'):
        details.append(v['carburant'])
    if v.get('boite'):
        details.append(v['boite'])
    bm = v.get('bloc_moteur') or {}
    if bm.get('designation'):
        detail = bm['designation']
        if bm.get('puissance_ch'):
            detail += f" {bm['puissance_ch']} ch"
        details.append(detail)
    elif bm.get('code'):
        details.append(bm['code'])
    if details:
        lines.append(f"Motorisation: {' · '.join(details)}")

    props = []
    nb_prop = v.get('nb_proprietaires')
    if nb_prop is not None:
        props.append(f"{nb_prop} propriétaire{'s' if nb_prop > 1 else ''}")
    ct = v.get('ct_valide')
    if ct is not None:
        props.append(f"CT {'valide' if ct else 'non valide'}")
    carnet = v.get('carnet_entretien')
    if carnet and carnet != 'non_mentionné':
        props.append(f"carnet {'présent' if carnet == 'oui' else 'absent'}")
    km_an = v.get('km_par_an')
    if km_an:
        props.append(f"{km_an:,} km/an".replace(',', ' '))
    coher = v.get('coherence_kilometrage')
    if coher and coher != 'normal':
        props.append(f"kilométrage {coher}")
    if props:
        lines.append(f"Historique: {' · '.join(props)}")

    vendeur = r1.get('vendeur') or {}
    vend_parts = [p for p in [vendeur.get('type'), vendeur.get('localisation')] if p]
    if vendeur.get('ton_annonce'):
        vend_parts.append(f"annonce {vendeur['ton_annonce']}")
    if vend_parts:
        lines.append(f"Vendeur: {' · '.join(vend_parts)}")
    red_flags = vendeur.get('red_flags') or []
    if red_flags:
        flags_str = [f if isinstance(f, str) else f.get('description') or str(f) for f in red_flags[:3]]
        lines.append(f"Red flags vendeur: {', '.join(flags_str)}")

    options = r1.get('options_detectees') or []
    if options:
        noms = [o.get('nom') if isinstance(o, dict) else str(o) for o in options[:8]]
        noms = [n for n in noms if n]
        if noms:
            lines.append(f"Options: {', '.join(noms)}")

    return lines


def _vehicle_score_lines(r2: dict) -> list[str]:
    """Lignes de score/fiabilité communes."""
    lines = []
    score = r2.get('score_global')
    verdict = r2.get('verdict')
    if score:
        lines.append(f"SCORE: {score}/100")
    if verdict:
        lines.append(f"VERDICT: {verdict}")

    prix_marche = (r2.get('criteres') or {}).get('prix_marche') or {}
    if prix_marche.get('fourchette_marche_min'):
        lines.append(f"FOURCHETTE MARCHÉ: {prix_marche['fourchette_marche_min']}–{prix_marche.get('fourchette_marche_max', '')} €")

    fm = r2.get('fiabilite_moteur') or {}
    if fm.get('bloc'):
        lines.append(f"FIABILITÉ MOTEUR: {fm.get('bloc', '')} — {fm.get('verdict', '')}")
        defauts = fm.get('defauts_connus') or []
        if defauts:
            defauts_str = [d if isinstance(d, str) else d.get('description') or d.get('nom') or str(d) for d in defauts[:4]]
            lines.append(f"Défauts connus: {', '.join(defauts_str)}")
        interventions = fm.get('interventions_critiques') or []
        if interventions:
            interventions_str = [i if isinstance(i, str) else i.get('description') or i.get('nom') or str(i) for i in interventions[:3]]
            lines.append(f"Interventions critiques: {', '.join(interventions_str)}")

    return lines


def _build_chat_system_prompt(analysis):
    vehicule = analysis.get('vehicule') or {}
    r1 = analysis.get('r1') or {}
    r2 = analysis.get('r2') or {}
    r3 = analysis.get('r3') or {}
    r4 = analysis.get('r4') or {}
    r5 = analysis.get('r5') or {}

    lines = [
        "Tu es un expert automobile. Tu as analysé cette annonce de voiture d'occasion et tu réponds aux questions de l'utilisateur pour l'aider à prendre une décision éclairée.",
        "",
        *_vehicle_identity_lines(vehicule, r1),
        "",
        *_vehicle_score_lines(r2),
        "",
    ]

    points_raw = r3.get('points_vigilance')
    points = (points_raw if isinstance(points_raw, list) else [])[:5]
    if points:
        lines.append("POINTS DE VIGILANCE:")
        for p in points:
            if isinstance(p, dict):
                lines.append(f"  - [{p.get('severite', '')}] {p.get('point', '')}: {p.get('detail', '')}")
            else:
                lines.append(f"  - {p}")

    couts = r3.get('couts_previsionnels') or {}
    if couts.get('total_travaux_imminents_min') is not None:
        lines.append(f"TRAVAUX IMMINENTS: {couts['total_travaux_imminents_min']}–{couts.get('total_travaux_imminents_max', '')} €")

    lines.append("")

    if r4.get('prix_cible'):
        lines.append(f"PRIX CIBLE NÉGOCIATION: {r4['prix_cible']} €")
    if r4.get('strategie_negociation'):
        lines.append(f"STRATÉGIE: {r4['strategie_negociation']}")

    lines.append("")

    carbu = r5.get('cout_carburant_mensuel')
    assur = r5.get('assurance_estimation_mensuelle')
    if carbu or assur:
        lines.append(f"COÛTS MENSUELS ESTIMÉS: carburant ~{carbu} €, assurance ~{assur} €")

    lines.append("")
    lines.append("Réponds en français. Sois bref et direct : 2 à 4 phrases maximum, pas de titres ni de listes sauf si vraiment nécessaire. Appuie-toi sur les données du rapport. Si une information n'est pas dans le rapport, dis-le en une phrase.")

    return "\n".join(lines)


@csrf_exempt
@require_http_methods(['GET', 'OPTIONS'])
def chat_history(request, analysis_id):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()
    try:
        check = sb.table('analyses').select('id').eq('id', analysis_id).eq('user_id', user_id).execute()
        if not check.data:
            return JsonResponse({'error': 'Not found'}, status=404)

        result = sb.table('chat_messages').select('role, content, created_at') \
            .eq('analysis_id', analysis_id).order('created_at').execute()
        return JsonResponse({'messages': result.data or []})
    except Exception as e:
        logger.error(f'[chat_history] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def chat(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Authentification requise'}, status=401)

    profile = _get_user_profile(user_id)
    if not _rate_ok(user_id, 'chat', profile['rate_limit_enabled']):
        return JsonResponse({'error': 'Trop de messages. Réessayez dans une heure.'}, status=429)

    user_api_key = profile['api_key']
    if not user_api_key:
        return JsonResponse({'error': 'Clé API non configurée'}, status=403)

    try:
        body = json.loads(request.body)
        analysis_id = body.get('analysis_id', '').strip()
        message = body.get('message', '').strip()
        history = body.get('history', [])
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

    if not analysis_id or not message:
        return JsonResponse({'error': 'analysis_id et message requis'}, status=400)

    # Sanitize history: keep only valid role/content pairs, cap at 20 messages
    history = [
        {'role': m['role'], 'content': str(m['content'])}
        for m in history[-20:]
        if isinstance(m, dict) and m.get('role') in ('user', 'assistant') and m.get('content')
    ]

    sb = _get_supabase()

    try:
        result = sb.table('analyses').select('vehicule, r1, r2, r3, r4, r5') \
            .eq('id', analysis_id).eq('user_id', user_id).execute()
        if not result.data:
            return JsonResponse({'error': 'Analyse introuvable'}, status=404)
        analysis = result.data[0]
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    system_prompt = _build_chat_system_prompt(analysis)

    def event_stream():
        full_text = []
        try:
            client = anthropic.Anthropic(api_key=user_api_key)
            messages = [*history, {'role': 'user', 'content': message}]

            with client.messages.stream(
                model=HAIKU,
                max_tokens=1024,
                system=[{'type': 'text', 'text': system_prompt, 'cache_control': {'type': 'ephemeral'}}],
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    full_text.append(text)
                    yield f'event: chunk\ndata: {json.dumps({"text": text}, ensure_ascii=False)}\n\n'

            complete_text = ''.join(full_text)
            try:
                sb.table('chat_messages').insert([
                    {'analysis_id': analysis_id, 'user_id': user_id, 'role': 'user', 'content': message},
                    {'analysis_id': analysis_id, 'user_id': user_id, 'role': 'assistant', 'content': complete_text},
                ]).execute()
            except Exception as e:
                logger.error(f'[chat] Save messages failed: {e}')

            yield f'event: done\ndata: {{}}\n\n'

        except Exception as e:
            logger.error(f'[chat] Stream error: {e}\n{traceback.format_exc()}')
            yield f'event: error\ndata: {json.dumps({"error": str(e)}, ensure_ascii=False)}\n\n'

    response = StreamingHttpResponse(
        streaming_content=event_stream(),
        content_type='text/event-stream; charset=utf-8',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


def _build_dashboard_system_prompt(analyses, scope_label):
    lines = [
        "Tu es un expert automobile. L'utilisateur a analysé plusieurs véhicules d'occasion et cherche à prendre une décision.",
        f"Tu dois l'aider à comparer et choisir parmi : {scope_label}.",
        "",
        "VÉHICULES ANALYSÉS :",
        "",
    ]

    for i, a in enumerate(analyses, 1):
        vehicule = a.get('vehicule') or {}
        r1 = a.get('r1') or {}
        r2 = a.get('r2') or {}
        r3 = a.get('r3') or {}
        r4 = a.get('r4') or {}

        # Identité (une ligne préfixée par numéro)
        id_lines = _vehicle_identity_lines(vehicule, r1)
        lines.append(f"{i}. {id_lines[0].replace('VÉHICULE: ', '')}")
        for l in id_lines[1:]:
            lines.append(f"   {l}")

        # Score et fiabilité moteur (résumé)
        score = r2.get('score_global')
        verdict = r2.get('verdict')
        score_line = f"   Score: {score}/100" if score else "   Score: —"
        if verdict:
            score_line += f" · {verdict}"
        lines.append(score_line)

        prix_marche = (r2.get('criteres') or {}).get('prix_marche') or {}
        f_min = prix_marche.get('fourchette_marche_min')
        f_max = prix_marche.get('fourchette_marche_max')
        if f_min and f_max:
            lines.append(f"   Marché: {f_min}–{f_max} €")

        fm = r2.get('fiabilite_moteur') or {}
        if fm.get('bloc'):
            fm_line = f"   Moteur: {fm['bloc']}"
            if fm.get('verdict'):
                fm_line += f" — {fm['verdict']}"
            lines.append(fm_line)

        points_raw = r3.get('points_vigilance') or []
        for p in (points_raw[:2] if isinstance(points_raw, list) else []):
            if isinstance(p, dict) and p.get('point'):
                lines.append(f"   ⚠ [{p.get('severite', '')}] {p['point']}")
            elif isinstance(p, str):
                lines.append(f"   ⚠ {p}")

        couts = r3.get('couts_previsionnels') or {}
        trav_min = couts.get('total_travaux_imminents_min')
        trav_max = couts.get('total_travaux_imminents_max')
        if trav_min is not None:
            lines.append(f"   Travaux imminents: {trav_min}–{trav_max} €")

        prix_cible = r4.get('prix_cible')
        if prix_cible:
            lines.append(f"   Cible négociation: {prix_cible} €")

        lines.append("")

    lines.append("Réponds en français. Aide l'utilisateur à comparer ces véhicules et à prendre une décision. Sois direct et synthétique. Si on te demande de choisir, donne une recommandation claire avec les raisons principales.")
    return "\n".join(lines)


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def chat_dashboard(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Authentification requise'}, status=401)

    user_api_key = _get_user_api_key(user_id)
    if not user_api_key:
        return JsonResponse({'error': 'Clé API non configurée'}, status=403)

    try:
        body = json.loads(request.body)
        scope = body.get('scope', 'all')
        group_id = (body.get('group_id') or '').strip() or None
        message = body.get('message', '').strip()
        history = body.get('history', [])
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

    if not message:
        return JsonResponse({'error': 'message requis'}, status=400)

    history = [
        {'role': m['role'], 'content': str(m['content'])}
        for m in history[-20:]
        if isinstance(m, dict) and m.get('role') in ('user', 'assistant') and m.get('content')
    ]

    sb = _get_supabase()
    try:
        query = sb.table('analyses').select(
            'id, vehicule, r2, r3, r4, group_ids, created_at'
        ).eq('user_id', user_id).order('created_at', desc=True).limit(30)

        result = query.execute()
        all_data = result.data or []
        # Filter by status (complete or legacy null) and by r2 presence
        all_data = [a for a in all_data if a.get('status') in (None, 'complete') and a.get('r2')]

        if scope == 'group' and group_id:
            all_data = [a for a in all_data if group_id in (a.get('group_ids') or [])]

        analyses = all_data
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    if not analyses:
        return JsonResponse({'error': 'Aucune analyse complète trouvée pour ce scope'}, status=404)

    n = len(analyses)
    scope_label = (
        f"ce groupe ({n} véhicule{'s' if n > 1 else ''})"
        if scope == 'group'
        else f"toutes vos analyses ({n} véhicule{'s' if n > 1 else ''})"
    )
    system_prompt = _build_dashboard_system_prompt(analyses, scope_label)

    def event_stream():
        try:
            client = anthropic.Anthropic(api_key=user_api_key)
            with client.messages.stream(
                model=HAIKU,
                max_tokens=1024,
                system=[{'type': 'text', 'text': system_prompt, 'cache_control': {'type': 'ephemeral'}}],
                messages=[*history, {'role': 'user', 'content': message}],
            ) as stream:
                for text in stream.text_stream:
                    yield f'event: chunk\ndata: {json.dumps({"text": text}, ensure_ascii=False)}\n\n'
            yield f'event: done\ndata: {{}}\n\n'
        except Exception as e:
            logger.error(f'[chat_dashboard] Stream error: {e}\n{traceback.format_exc()}')
            yield f'event: error\ndata: {json.dumps({"error": str(e)}, ensure_ascii=False)}\n\n'

    response = StreamingHttpResponse(
        streaming_content=event_stream(),
        content_type='text/event-stream; charset=utf-8',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


@csrf_exempt
@require_http_methods(['GET', 'POST', 'DELETE', 'OPTIONS'])
def user_api_key(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()

    if request.method == 'GET':
        try:
            result = sb.table('user_profiles').select('anthropic_api_key').eq('id', user_id).execute()
            has_key = bool(result.data and result.data[0].get('anthropic_api_key'))
            return JsonResponse({'has_key': has_key})
        except Exception as e:
            logger.error(f'[user_api_key GET] {e}')
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            api_key = body.get('api_key', '').strip()
        except Exception:
            return JsonResponse({'error': 'Corps de requête invalide'}, status=400)

        if not api_key or not api_key.startswith('sk-ant-'):
            return JsonResponse({'error': 'La clé API doit commencer par sk-ant-'}, status=400)

        try:
            encrypted = _encrypt_api_key(api_key)
            sb.table('user_profiles').upsert({
                'id': user_id,
                'anthropic_api_key': encrypted,
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            logger.error(f'[user_api_key POST] {e}')
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        try:
            sb.table('user_profiles').update({
                'anthropic_api_key': None,
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).eq('id', user_id).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            logger.error(f'[user_api_key DELETE] {e}')
            return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET', 'PATCH', 'OPTIONS'])
def user_settings(request):
    if request.method == 'OPTIONS':
        return _cors_options()

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()

    if request.method == 'GET':
        try:
            result = sb.table('user_profiles').select('rate_limit_enabled').eq('id', user_id).execute()
            rate_limit_enabled = result.data[0].get('rate_limit_enabled', True) if result.data else True
            return JsonResponse({'rate_limit_enabled': rate_limit_enabled})
        except Exception as e:
            logger.error(f'[user_settings GET] {e}')
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

        allowed = {'rate_limit_enabled'}
        updates = {k: v for k, v in body.items() if k in allowed}
        if 'rate_limit_enabled' in updates and not isinstance(updates['rate_limit_enabled'], bool):
            return JsonResponse({'error': 'rate_limit_enabled doit être un booléen'}, status=400)
        if not updates:
            return JsonResponse({'error': 'Aucun champ valide'}, status=400)

        try:
            updates['updated_at'] = datetime.now(timezone.utc).isoformat()
            sb.table('user_profiles').upsert({'id': user_id, **updates}).execute()
            return JsonResponse({'success': True})
        except Exception as e:
            logger.error(f'[user_settings PATCH] {e}')
            return JsonResponse({'error': str(e)}, status=500)


# ── Partage d'analyse ──────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST', 'DELETE', 'OPTIONS'])
def analysis_share(request, analysis_id):
    """POST → activer le partage, DELETE → désactiver."""
    if request.method == 'OPTIONS':
        resp = _cors_options()
        resp['Access-Control-Allow-Methods'] = 'POST, DELETE, OPTIONS'
        return resp

    user_id = _get_user_id(request)
    if not user_id:
        return JsonResponse({'error': 'Auth required'}, status=401)

    sb = _get_supabase()
    is_shared = request.method == 'POST'

    try:
        result = sb.table('analyses').update({'is_shared': is_shared}) \
            .eq('id', analysis_id).eq('user_id', user_id).execute()
        if not result.data:
            return JsonResponse({'error': 'Not found'}, status=404)
        return JsonResponse({'is_shared': is_shared})
    except Exception as e:
        logger.error(f'[analysis_share] {e}')
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET', 'OPTIONS'])
def analysis_public(request, analysis_id):
    """Lecture publique d'une analyse partagée — pas d'auth requise."""
    if request.method == 'OPTIONS':
        return _cors_options()

    sb = _get_supabase()
    try:
        result = sb.table('analyses') \
            .select('id, vehicule, r1, r2, r3, r4, r5, computed, is_shared') \
            .eq('id', analysis_id).eq('is_shared', True).execute()
        if not result.data:
            return JsonResponse({'error': 'Analyse introuvable ou non partagée'}, status=404)
        data = result.data[0]
        # Ne pas exposer les données utilisateur sensibles
        data.pop('user_id', None)
        return JsonResponse(data)
    except Exception as e:
        logger.error(f'[analysis_public] {e}')
        return JsonResponse({'error': str(e)}, status=500)
