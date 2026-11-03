"""
تخزين تسجيلات الحصص — منفصل عن تخزين الوسائط العام.

الوسائط العامة بالإنتاج (production.py) روابطها عامة بلا توقيع، وهذا غير مقبول
لتسجيلات أطفال؛ لذلك التسجيلات لها bucket خاص بروابط موقّعة مؤقتة. التبديل بين
مزوّد وآخر (R2 / S3 / قرص محلي) يتم من متغيرات البيئة فقط:

    RECORDINGS_BUCKET_NAME      ← وجوده يفعّل S3/R2، غيابه = قرص محلي
    RECORDINGS_ENDPOINT_URL     ← لـ R2: https://<account>.r2.cloudflarestorage.com
    RECORDINGS_REGION_NAME      ← 'auto' لـ R2
    RECORDINGS_ACCESS_KEY_ID / RECORDINGS_SECRET_ACCESS_KEY
"""
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.functional import LazyObject


def _build_storage():
    if settings.RECORDINGS_BUCKET_NAME:
        from storages.backends.s3boto3 import S3Boto3Storage
        return S3Boto3Storage(
            bucket_name=settings.RECORDINGS_BUCKET_NAME,
            endpoint_url=settings.RECORDINGS_ENDPOINT_URL or None,
            region_name=settings.RECORDINGS_REGION_NAME or None,
            access_key=settings.RECORDINGS_ACCESS_KEY_ID,
            secret_key=settings.RECORDINGS_SECRET_ACCESS_KEY,
            default_acl=None,
            querystring_auth=True,
            querystring_expire=settings.RECORDINGS_URL_EXPIRE_SECONDS,
            file_overwrite=False,
            custom_domain=None,
        )
    # بلا base_url: الملفات المحلية لا تُخدم عبر MEDIA_URL إطلاقًا، فقط عبر عرض البث المحمي
    return FileSystemStorage(location=settings.RECORDINGS_LOCAL_ROOT, base_url=None)


class RecordingsStorage(LazyObject):
    def _setup(self):
        self._wrapped = _build_storage()


recordings_storage = RecordingsStorage()


def get_recordings_storage():
    # callable حتى لا يُثبَّت المزوّد داخل ملفات الـ migrations
    return recordings_storage


def is_remote():
    return bool(settings.RECORDINGS_BUCKET_NAME)
