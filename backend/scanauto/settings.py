import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-prod')

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS_ENV = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_ENV.split(',') if h.strip()]

INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'scanauto.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'scanauto.wsgi.application'

# No database needed for V1
DATABASES = {}

# CORS settings
CORS_ALLOWED_ORIGINS_ENV = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS_ENV.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Autorisé uniquement en dev

# BYOK — clé de chiffrement des clés API utilisateurs (Fernet)
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '')
if not DEBUG and not ENCRYPTION_KEY:
    from django.core.exceptions import ImproperlyConfigured
    raise ImproperlyConfigured('ENCRYPTION_KEY must be set in production')

# Limite la taille des requêtes entrantes (protège contre les payloads trop lourds)
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024  # 2 MB

# Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', '')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

# Firecrawl (V3)
FIRECRAWL_API_KEY = os.environ.get('FIRECRAWL_API_KEY', '')

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
            'datefmt': '%H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'api': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
