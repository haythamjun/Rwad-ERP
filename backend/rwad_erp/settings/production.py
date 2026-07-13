from .base import *
from decouple import config
import os

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

_cors = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o for o in _cors.split(',') if o]
CORS_ALLOW_CREDENTIALS = True

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ── Cloud storage for uploaded files (S3 / Cloudflare R2) ───────────────────
# Set AWS_STORAGE_BUCKET_NAME in Railway environment variables to activate.
# For Cloudflare R2 also set AWS_S3_ENDPOINT_URL to your R2 endpoint.
if os.environ.get('AWS_STORAGE_BUCKET_NAME'):
    DEFAULT_FILE_STORAGE    = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID       = os.environ.get('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY   = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME      = os.environ.get('AWS_S3_REGION_NAME', 'auto')
    AWS_S3_ENDPOINT_URL     = os.environ.get('AWS_S3_ENDPOINT_URL', '')
    AWS_S3_FILE_OVERWRITE   = False
    AWS_DEFAULT_ACL         = None
    _custom_domain = os.environ.get('AWS_S3_CUSTOM_DOMAIN', '')
    MEDIA_URL = (
        f'https://{_custom_domain}/'
        if _custom_domain
        else f'https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/'
    )
else:
    import sys
    print(
        'WARNING: AWS_STORAGE_BUCKET_NAME not set — uploaded files will be lost on redeploy.',
        file=sys.stderr,
    )
