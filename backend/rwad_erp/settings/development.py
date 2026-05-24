from .base import *
from pathlib import Path

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
]

CORS_ALLOW_CREDENTIALS = True

# Use SQLite for local development (no PostgreSQL installation required)
# Switch to PostgreSQL by setting USE_POSTGRES=True in .env
import os
if os.environ.get('USE_POSTGRES', 'false').lower() != 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]

SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = __import__('datetime').timedelta(days=1)
