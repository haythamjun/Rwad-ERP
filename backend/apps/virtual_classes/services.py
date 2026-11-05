"""أرشفة تسجيلات Zoho: اكتشاف تسجيلات كل حصة ← تحميلها ← حفظها بتخزين التسجيلات."""
import logging
from datetime import datetime, timezone as dt_timezone

from django.core.files import File
from django.utils import timezone

from . import zoho
from .models import SessionRecording, VirtualSession
from .storage import is_remote

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5


def _recorded_at(rec):
    ms = rec.get('startTimeMillis') or rec.get('uploadedTime')
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=dt_timezone.utc)
    except (TypeError, ValueError):
        return None


def discover_recordings(session):
    """يسجّل في قاعدة البيانات أي تسجيل جديد ظهر لاجتماع الحصة (بدون تحميل)."""
    if not session.zoho_meeting_key:
        return []
    found = []
    for rec in zoho.meeting_recordings(session.zoho_meeting_key, session.zoho_account):
        rid = rec.get('erecordingId')
        if not rid:
            continue
        # Zoho يرفع التسجيل بعد معالجته؛ قبلها ما فيه رابط تحميل صالح
        if rec.get('status') and rec.get('status') != 'UPLOADED':
            continue
        obj, created = SessionRecording.objects.get_or_create(
            zoho_recording_id=rid,
            defaults={
                'session':           session,
                'zoho_download_url': rec.get('downloadUrl', ''),
                'recorded_at':       _recorded_at(rec),
            },
        )
        if not created and rec.get('downloadUrl') and obj.zoho_download_url != rec['downloadUrl']:
            obj.zoho_download_url = rec['downloadUrl']
            obj.save(update_fields=['zoho_download_url'])
        found.append(obj)
    session.recordings_checked_at = timezone.now()
    session.save(update_fields=['recordings_checked_at'])
    return found


def archive_recording(recording):
    if recording.status == SessionRecording.Status.ARCHIVED:
        return True
    recording.attempts += 1
    try:
        tmp = zoho.download_recording(recording.zoho_download_url, recording.session.zoho_account)
        try:
            stamp = (recording.recorded_at or timezone.now()).strftime('%Y%m%d-%H%M')
            name = f'classroom{recording.session.classroom_id}_session{recording.session_id}_{stamp}.mp4'
            recording.file.save(name, File(tmp), save=False)
            recording.size_bytes = recording.file.size
            recording.storage_backend = 'remote' if is_remote() else 'local'
        finally:
            tmp.close()
        recording.status = SessionRecording.Status.ARCHIVED
        recording.archived_at = timezone.now()
        recording.error = ''
    except Exception as e:  # نسجّل الخطأ ونكمل بقية التسجيلات
        logger.exception('archive recording %s failed', recording.pk)
        recording.error = str(e)[:1000]
        if recording.attempts >= MAX_ATTEMPTS:
            recording.status = SessionRecording.Status.FAILED
    recording.save()
    return recording.status == SessionRecording.Status.ARCHIVED


def sync_session(session):
    """يكتشف ويؤرشف تسجيلات حصة واحدة. يرجع (عدد المؤرشف، عدد المتبقي)."""
    discover_recordings(session)
    archived = pending = 0
    for rec in session.recordings.exclude(status=SessionRecording.Status.ARCHIVED):
        if rec.status == SessionRecording.Status.FAILED:
            continue
        if archive_recording(rec):
            archived += 1
        else:
            pending += 1
    return archived, pending


def repair_missing_files():
    """تسجيلات «مؤرشفة» ملفها اختفى من التخزين (مثلًا قرص Railway يُمسح مع كل نشر
    قبل تفعيل R2/S3) ← ترجع «معلّقة» لتُحمَّل من Zoho من جديد. يرجع الحصص المتأثرة."""
    sessions = {}
    qs = SessionRecording.objects.filter(status=SessionRecording.Status.ARCHIVED).select_related('session')
    if is_remote():
        # ما حُفظ على R2/S3 دائم — نفحص فقط ما حُفظ قبل التفعيل (قرص الخادم أو غير معروف)
        qs = qs.exclude(storage_backend='remote')
    for rec in qs:
        try:
            present = bool(rec.file) and rec.file.storage.exists(rec.file.name)
        except Exception:  # خطأ اتصال بالتخزين — ما نحكم بغياب الملف
            logger.exception('storage check failed for recording %s', rec.pk)
            continue
        if present:
            continue
        rec.status = SessionRecording.Status.PENDING
        rec.file = None
        rec.size_bytes = None
        rec.archived_at = None
        rec.attempts = 0
        rec.error = 'الملف مفقود من التخزين — أُعيد للأرشفة'
        rec.save()
        sessions[rec.session_id] = rec.session
    return list(sessions.values())


def sessions_due_for_sync(days=7):
    """حصص بدأت خلال آخر `days` يوم وتحتاج فحص تسجيلات: فيها تسجيل معلّق، أو ما
    عندها أي تسجيل مؤرشف، أو لسه ضمن 3 ساعات بعد نهايتها (لو المعلم أوقف التسجيل
    وأعاده يطلع أكثر من ملف)."""
    now = timezone.now()
    qs = VirtualSession.objects.filter(
        status=VirtualSession.Status.SCHEDULED,
        starts_at__gte=now - timezone.timedelta(days=days), starts_at__lte=now,
    ).exclude(zoho_meeting_key='')
    due = []
    for s in qs:
        if s.live_state != 'ended':
            continue
        has_pending  = s.recordings.filter(status=SessionRecording.Status.PENDING).exists()
        has_archived = s.recordings.filter(status=SessionRecording.Status.ARCHIVED).exists()
        recent = now <= s.ends_at + timezone.timedelta(hours=3)
        if has_pending or not has_archived or recent:
            due.append(s)
    return due
