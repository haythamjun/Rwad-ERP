import logging
import re
import threading
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.core import signing
from django.db import connection
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Classroom
from apps.core.utils import log_action
from apps.students.views import _scope_branch_ids, _teacher_classroom_ids

from . import services, zoho
from .models import SessionRecording, VirtualSession, ZohoAccount
from .serializers import SessionAttendanceSerializer, VirtualSessionSerializer
from .storage import is_remote, recordings_storage

logger = logging.getLogger(__name__)

_STREAM_SALT = 'virtual-classes.recording-stream'


# ── الصلاحيات والنطاق ───────────────────────────────────────────────────────────

def _has_module(user, perm='can_view'):
    if user.is_admin:
        return True
    return user.module_permissions.filter(module='virtual_classes', **{perm: True}).exists()


def _visible_classroom_ids(user):
    """None = كل الفصول. معلم الفصل يرى فصوله دائمًا؛ صاحب صلاحية الموديول يرى
    فصول فروعه؛ غيرهم لا يرى شيئًا (تسجيلات أطفال — لا عرض افتراضي للجميع)."""
    if user.is_admin:
        return None
    ids = set(_teacher_classroom_ids(user) or [])
    if _has_module(user):
        branch_ids = _scope_branch_ids(user)
        if branch_ids is None:
            return None
        ids |= set(Classroom.objects.filter(branch_id__in=branch_ids).values_list('id', flat=True))
    return list(ids)


def _can_manage(user, classroom):
    if user.is_admin or classroom.teacher_id == user.id:
        return True
    if not _has_module(user, 'can_edit'):
        return False
    visible = _visible_classroom_ids(user)
    return visible is None or classroom.id in visible


def _scoped_sessions(user):
    qs = VirtualSession.objects.select_related(
        'classroom', 'classroom__branch', 'classroom__teacher', 'created_by', 'zoho_account',
    ).prefetch_related('recordings')
    ids = _visible_classroom_ids(user)
    return qs if ids is None else qs.filter(classroom_id__in=ids)


def _zoho_error_response(e):
    logger.warning('Zoho error: %s', e)
    return Response(
        {'error': 'تعذّر التواصل مع Zoho Meeting، حاول مرة أخرى', 'detail': str(e)[:300]},
        status=status.HTTP_502_BAD_GATEWAY,
    )


def _host_account(classroom):
    """حساب Zoho اللي تُنشأ به حصة الفصل: حساب معلم الفصل لو ربطه، وإلا حساب المركز."""
    if classroom.teacher_id:
        return ZohoAccount.objects.filter(user_id=classroom.teacher_id).first()
    return None


def _archive_in_background(session_ids):
    """تحميل التسجيل قد يتجاوز مهلة gunicorn، فيتم بخيط منفصل. لو انقطع (إعادة
    تشغيل الخادم مثلًا) يكمله أمر sync_zoho_recordings الدوري."""
    def run():
        try:
            for sid in session_ids:
                try:
                    services.sync_session(VirtualSession.objects.get(pk=sid))
                except Exception:
                    logger.exception('background archive failed for session %s', sid)
        finally:
            connection.close()
    threading.Thread(target=run, daemon=True).start()


# ── الحصص ──────────────────────────────────────────────────────────────────────

class _SessionPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class VirtualSessionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/virtual-classes/sessions/?classroom=&when=upcoming|past&page_size=
    POST /api/virtual-classes/sessions/  — يُنشئ الاجتماع في Zoho ثم يحفظ الحصة
    """
    serializer_class = VirtualSessionSerializer
    pagination_class = _SessionPagination

    def get_queryset(self):
        qs = _scoped_sessions(self.request.user)
        p = self.request.query_params
        if p.get('classroom'):
            qs = qs.filter(classroom_id=p['classroom'])
        now = timezone.now()
        if p.get('when') == 'upcoming':
            # الجارية حاليًا تظهر مع القادمة (بداية خلال آخر 4 ساعات تغطي أطول حصة)
            qs = qs.filter(starts_at__gte=now - timezone.timedelta(hours=4)) \
                   .exclude(status=VirtualSession.Status.CANCELLED).order_by('starts_at')
        elif p.get('when') == 'past':
            qs = qs.filter(starts_at__lt=now).order_by('-starts_at')
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        classroom = serializer.validated_data['classroom']
        if not _can_manage(user, classroom):
            raise PermissionDenied('ليس لديك صلاحية لجدولة حصص هذا الفصل')
        if not zoho.is_configured():
            raise PermissionDenied('ربط Zoho Meeting غير مُعدّ على الخادم')
        d = serializer.validated_data
        account = _host_account(classroom)
        meeting = zoho.create_meeting(
            f'{d["title"]} — {classroom.name}', d['starts_at'], d['duration_minutes'], account,
        )
        session = serializer.save(
            created_by=user,
            zoho_account=account,
            zoho_meeting_key=str(meeting.get('meetingKey', '')),
            zoho_join_url=meeting.get('joinLink', ''),
            zoho_start_url=meeting.get('startLink', ''),
            zoho_password=meeting.get('pwd', ''),
        )
        log_action(self.request, 'create', session, f'جدولة حصة افتراضية: {session}')

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except zoho.ZohoError as e:
            return _zoho_error_response(e)


class VirtualSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH يحدّث اجتماع Zoho أيضًا. DELETE = إلغاء (يحذف الاجتماع من Zoho
    ويُبقي سجل الحصة وتسجيلاتها وحضورها)."""
    serializer_class = VirtualSessionSerializer

    def get_queryset(self):
        return _scoped_sessions(self.request.user)

    def _check_manage(self, session):
        if not _can_manage(self.request.user, session.classroom):
            raise PermissionDenied('ليس لديك صلاحية لتعديل حصص هذا الفصل')

    def update(self, request, *args, **kwargs):
        session = self.get_object()
        self._check_manage(session)
        if session.status == VirtualSession.Status.CANCELLED:
            return Response({'error': 'الحصة ملغاة'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(session, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        d = {**{f: getattr(session, f) for f in ('title', 'starts_at', 'duration_minutes')},
             **serializer.validated_data}
        try:
            if session.zoho_meeting_key:
                zoho.update_meeting(
                    session.zoho_meeting_key, f'{d["title"]} — {session.classroom.name}',
                    d['starts_at'], d['duration_minutes'], session.zoho_account,
                )
        except zoho.ZohoError as e:
            return _zoho_error_response(e)
        serializer.save()
        log_action(request, 'update', session, f'تعديل حصة افتراضية: {session}')
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        session = self.get_object()
        self._check_manage(session)
        if session.status != VirtualSession.Status.CANCELLED and session.live_state == 'upcoming':
            try:
                if session.zoho_meeting_key:
                    zoho.delete_meeting(session.zoho_meeting_key, session.zoho_account)
            except zoho.ZohoError as e:
                if '→ 404' not in str(e):
                    return _zoho_error_response(e)
        session.status = VirtualSession.Status.CANCELLED
        session.save(update_fields=['status', 'updated_at'])
        log_action(request, 'delete', session, f'إلغاء حصة افتراضية: {session}')
        return Response(self.get_serializer(session).data)


class VirtualSessionStartView(APIView):
    """POST /api/virtual-classes/sessions/<pk>/start/ — رابط بدء المضيف (للمعلم/الإدارة فقط)."""

    def post(self, request, pk):
        session = get_object_or_404(_scoped_sessions(request.user), pk=pk)
        if not _can_manage(request.user, session.classroom):
            raise PermissionDenied('فقط معلم/ة الفصل أو الإدارة يبدأ الحصة')
        if session.status == VirtualSession.Status.CANCELLED:
            return Response({'error': 'الحصة ملغاة'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'start_url': session.zoho_start_url,
            'join_url':  session.zoho_join_url,
            'password':  session.zoho_password,
        })


class VirtualSessionSyncView(APIView):
    """POST /api/virtual-classes/sessions/<pk>/sync/ — فحص فوري للتسجيلات وأرشفتها بالخلفية."""

    def post(self, request, pk):
        session = get_object_or_404(_scoped_sessions(request.user), pk=pk)
        if not _can_manage(request.user, session.classroom):
            raise PermissionDenied()
        try:
            found = services.discover_recordings(session)
        except zoho.ZohoError as e:
            return _zoho_error_response(e)
        pending = [r for r in found if r.status == SessionRecording.Status.PENDING]
        if pending:
            _archive_in_background([session.id])
        return Response({'found': len(found), 'archiving': len(pending)})


class VirtualSessionAttendanceView(APIView):
    """GET /api/virtual-classes/sessions/<pk>/attendance/ — كل طلاب الفصل مع حالة دخولهم."""

    def get(self, request, pk):
        session = get_object_or_404(_scoped_sessions(request.user), pk=pk)
        joined = {a.student_id: a for a in session.attendances.select_related('student', 'guardian')}
        rows = []
        for s in session.classroom.students.order_by('first_name', 'family_name'):
            a = joined.pop(s.id, None)
            rows.append({
                'student':      s.id,
                'student_name': s.full_name,
                'file_number':  s.file_number,
                'attended':     a is not None,
                **({k: v for k, v in SessionAttendanceSerializer(a).data.items()
                    if k in ('first_joined_at', 'last_joined_at', 'join_count', 'guardian_name')}
                   if a else {}),
            })
        # طلاب دخلوا ثم نُقلوا لفصل آخر — يبقون بالسجل
        for a in joined.values():
            rows.append({**SessionAttendanceSerializer(a).data, 'attended': True})
        return Response({
            'session_id': session.id,
            'total':      len(rows),
            'attended':   sum(1 for r in rows if r['attended']),
            'rows':       rows,
        })


# ── مشاهدة التسجيلات ───────────────────────────────────────────────────────────

class RecordingPlayView(APIView):
    """GET /api/virtual-classes/recordings/<pk>/play/ → {url} رابط مؤقت للمشاهدة."""

    def get(self, request, pk):
        rec = get_object_or_404(
            SessionRecording.objects.select_related('session__classroom'), pk=pk,
            session__in=_scoped_sessions(request.user),
        )
        if rec.status != SessionRecording.Status.ARCHIVED or not rec.file:
            return Response({'error': 'التسجيل لم يُؤرشف بعد'}, status=status.HTTP_409_CONFLICT)
        if is_remote():
            url = rec.file.url   # رابط موقّع من S3/R2
        else:
            token = signing.dumps({'r': rec.id, 'u': request.user.id}, salt=_STREAM_SALT)
            url = request.build_absolute_uri(f'/api/virtual-classes/recordings/stream/{token}/')
        log_action(request, 'view', rec, f'مشاهدة تسجيل: {rec.session}')
        return Response({'url': url, 'expires_in': settings.RECORDINGS_URL_EXPIRE_SECONDS})


def _iter_file(f, length, chunk=1024 * 512):
    try:
        while length > 0:
            data = f.read(min(chunk, length))
            if not data:
                break
            length -= len(data)
            yield data
    finally:
        f.close()


class RecordingStreamView(APIView):
    """بث ملف محلي برابط موقّع مؤقت (بديل الرابط الموقّع لـ S3 عند التخزين المحلي).
    يدعم Range حتى يشتغل التقديم والترجيع بمشغّل الفيديو."""
    authentication_classes = []
    permission_classes     = []

    def get(self, request, token):
        try:
            data = signing.loads(token, salt=_STREAM_SALT, max_age=settings.RECORDINGS_URL_EXPIRE_SECONDS)
        except signing.BadSignature:
            return HttpResponse('الرابط منتهي أو غير صالح', status=403)
        rec = get_object_or_404(SessionRecording, pk=data['r'], status=SessionRecording.Status.ARCHIVED)
        name = rec.file.name
        size = recordings_storage.size(name)
        start, end = 0, size - 1
        m = re.match(r'bytes=(\d*)-(\d*)$', request.META.get('HTTP_RANGE', ''))
        partial = bool(m and (m.group(1) or m.group(2)))
        if partial:
            if m.group(1):
                start = int(m.group(1))
                end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
            else:
                start = max(size - int(m.group(2)), 0)
            if start > end:
                resp = HttpResponse(status=416)
                resp['Content-Range'] = f'bytes */{size}'
                return resp
        f = recordings_storage.open(name, 'rb')
        f.seek(start)
        length = end - start + 1
        resp = StreamingHttpResponse(_iter_file(f, length), status=206 if partial else 200,
                                     content_type='video/mp4')
        # يُغلق الملف حتى لو قطع المشغّل الاتصال قبل اكتمال البث
        resp._resource_closers.append(f.close)
        if partial:
            resp['Content-Range'] = f'bytes {start}-{end}/{size}'
        resp['Content-Length'] = str(length)
        resp['Accept-Ranges']  = 'bytes'
        resp['Cache-Control']  = 'private, no-store'
        return resp


# ── استيراد تسجيلات Zoho القديمة ───────────────────────────────────────────────

class ZohoRecordingsImportView(APIView):
    """
    GET  /api/virtual-classes/zoho-recordings/  — كل تسجيلات حساب Zoho مع حالة الاستيراد
    POST /api/virtual-classes/zoho-recordings/  {recording_id, classroom} — ربط تسجيل قديم بفصل وأرشفته
    """

    def _check(self, request):
        if not _has_module(request.user, 'can_import'):
            raise PermissionDenied('ليس لديك صلاحية استيراد التسجيلات')
        if not zoho.is_configured():
            raise PermissionDenied('ربط Zoho Meeting غير مُعدّ على الخادم')

    def get(self, request):
        self._check(request)
        try:
            recs = zoho.list_recordings()
        except zoho.ZohoError as e:
            return _zoho_error_response(e)
        imported = dict(
            SessionRecording.objects.filter(zoho_recording_id__in=[r.get('erecordingId') for r in recs])
            .values_list('zoho_recording_id', 'session__classroom__name')
        )
        return Response([{
            'recording_id': r.get('erecordingId'),
            'meeting_key':  r.get('meetingKey'),
            'topic':        (r.get('topic') or '').strip(),
            'recorded_at':  services._recorded_at(r),
            'date_label':   r.get('datenTime'),
            'file_size':    r.get('fileSize'),
            'imported':     r.get('erecordingId') in imported,
            'classroom_name': imported.get(r.get('erecordingId')),
        } for r in recs])

    def post(self, request):
        self._check(request)
        rid = request.data.get('recording_id')
        classroom = get_object_or_404(Classroom, pk=request.data.get('classroom'))
        if not _can_manage(request.user, classroom):
            raise PermissionDenied('ليس لديك صلاحية على هذا الفصل')
        if SessionRecording.objects.filter(zoho_recording_id=rid).exists():
            return Response({'error': 'هذا التسجيل مستورد مسبقًا'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rec = next((r for r in zoho.list_recordings() if r.get('erecordingId') == rid), None)
            if not rec:
                return Response({'error': 'التسجيل غير موجود في Zoho'}, status=status.HTTP_404_NOT_FOUND)
            key = str(rec.get('meetingKey') or '')
            meeting = zoho.get_meeting(key) if key else {}
        except zoho.ZohoError as e:
            return _zoho_error_response(e)

        session = VirtualSession.objects.filter(zoho_meeting_key=key, classroom=classroom).first() if key else None
        if not session:
            ms = meeting.get('startTimeMillisec') or rec.get('startTimeMillis')
            starts_at = (datetime.fromtimestamp(int(ms) / 1000, tz=dt_timezone.utc)
                         if ms else services._recorded_at(rec) or timezone.now())
            session = VirtualSession.objects.create(
                classroom=classroom,
                title=(rec.get('topic') or meeting.get('topic') or 'حصة مستوردة').strip()[:200],
                starts_at=starts_at,
                duration_minutes=max(5, min(240, int(meeting.get('duration') or 3600000) // 60000)),
                zoho_meeting_key=key,
                zoho_join_url=meeting.get('joinLink', ''),
                created_by=request.user,
            )
        SessionRecording.objects.create(
            session=session, zoho_recording_id=rid,
            zoho_download_url=rec.get('downloadUrl', ''),
            recorded_at=services._recorded_at(rec),
        )
        _archive_in_background([session.id])
        log_action(request, 'create', session, f'استيراد تسجيل Zoho للفصل {classroom.name}')
        return Response(VirtualSessionSerializer(session).data, status=status.HTTP_201_CREATED)


# ── ربط حساب Zoho للمعلم (OAuth) ─────────────────────────────────────────────────
# connect يرجع رابط موافقة Zoho ← المعلم يسجّل دخوله ← Zoho يرجع للـ callback (بلا JWT،
# الهوية من state الموقَّع) ← نحفظ الحساب ونرجّعه لصفحة الفصول الافتراضية بالواجهة.

_CONNECT_SALT = 'virtual-classes.zoho-connect'
_CONNECT_MAX_AGE = 15 * 60


def _return_origin(request):
    """أصل الواجهة اللي بدأ منها الربط — فقط لو ضمن CORS_ALLOWED_ORIGINS (لا نعيد توجيه لأي موقع)."""
    origin = request.headers.get('Origin') or ''
    allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or []
    if origin in allowed:
        return origin
    return allowed[0] if allowed else ''


def _account_payload(account):
    if not account:
        return {'connected': False}
    return {'connected': True, 'email': account.email, 'connected_at': account.connected_at}


class ZohoConnectView(APIView):
    """GET حالة ربط حساب المستخدم الحالي، POST رابط بدء الربط، DELETE إلغاء الربط."""

    def get(self, request):
        account = ZohoAccount.objects.filter(user=request.user).first()
        return Response({**_account_payload(account), 'available': zoho.web_client_configured()})

    def post(self, request):
        if not zoho.web_client_configured():
            return Response({'error': 'ربط حسابات Zoho غير مُعدّ على الخادم'}, status=status.HTTP_400_BAD_REQUEST)
        if not (request.user.email or '').strip():
            return Response(
                {'error': 'أضف إيميلك (نفس إيميل Zoho) في بيانات المستخدم أولًا'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        state = signing.dumps({'u': request.user.pk, 'o': _return_origin(request)}, salt=_CONNECT_SALT)
        return Response({'url': zoho.authorize_url(state, settings.ZOHO_WEB_REDIRECT_URI)})

    def delete(self, request):
        account = ZohoAccount.objects.filter(user=request.user).first()
        if account:
            zoho.revoke(account.refresh_token)
            account.delete()  # حصصه السابقة تبقى (zoho_account يصير null)
            log_action(request, 'delete', None, f'إلغاء ربط حساب Zoho: {request.user}')
        return Response({'connected': False})


class ZohoCallbackView(APIView):
    """GET /api/virtual-classes/zoho/callback/?code=&state= — يرجع له Zoho بعد الموافقة."""
    authentication_classes = []
    permission_classes = []

    def _back(self, origin, result, message=''):
        from django.http import HttpResponseRedirect
        from urllib.parse import urlencode
        query = urlencode({'zoho': result, **({'msg': message} if message else {})})
        if not origin:
            return HttpResponse(message or 'تم ربط حساب Zoho، ارجع للمنصة.', content_type='text/plain; charset=utf-8')
        return HttpResponseRedirect(f'{origin}/virtual-classes?{query}')

    def get(self, request):
        from apps.accounts.models import User
        try:
            data = signing.loads(request.query_params.get('state', ''), salt=_CONNECT_SALT, max_age=_CONNECT_MAX_AGE)
        except signing.BadSignature:
            return HttpResponse('رابط الربط غير صالح أو انتهت مدته — ابدأ الربط من جديد من المنصة.',
                                status=400, content_type='text/plain; charset=utf-8')
        origin = data.get('o', '')
        if request.query_params.get('error'):
            return self._back(origin, 'error', 'تم إلغاء الربط من Zoho')
        user = User.objects.filter(pk=data.get('u'), is_active=True).first()
        code = request.query_params.get('code')
        if not user or not code:
            return self._back(origin, 'error', 'بيانات الربط ناقصة')
        try:
            refresh_token, access_token = zoho.exchange_code(code, settings.ZOHO_WEB_REDIRECT_URI)
            details = zoho.user_details(access_token)
        except zoho.ZohoError as e:
            logger.warning('Zoho connect failed for user %s: %s', user.pk, e)
            return self._back(origin, 'error', 'تعذّر إكمال الربط مع Zoho، حاول مرة أخرى')

        email = (details.get('primaryEmail') or details.get('emailId') or '').strip().lower()
        zuid = str(details.get('zuid') or '')
        zsoid = str(details.get('zsoid') or '')
        # الحساب لازم يكون نفس إيميل المعلم بالمنصة — حتى ما يُربط حساب شخص آخر
        if not email or email != (user.email or '').strip().lower():
            zoho.revoke(refresh_token)
            return self._back(origin, 'mismatch', f'حساب Zoho ({email or "بلا إيميل"}) لا يطابق إيميلك في المنصة ({user.email})')
        if not zuid:
            zoho.revoke(refresh_token)
            return self._back(origin, 'error', 'Zoho لم يرجع معرّف الحساب')
        if zsoid and settings.ZOHO_ORG_ID and zsoid != str(settings.ZOHO_ORG_ID):
            zoho.revoke(refresh_token)
            return self._back(origin, 'error', 'حساب Zoho هذا ليس ضمن منظمة المركز')

        old = ZohoAccount.objects.filter(user=user).first()
        if old and old.refresh_token != refresh_token:
            zoho.revoke(old.refresh_token)
        account, _ = ZohoAccount.objects.update_or_create(user=user, defaults={
            'zuid': zuid, 'zsoid': zsoid, 'email': email, 'refresh_token': refresh_token,
        })
        from django.core.cache import cache
        cache.delete(f'{zoho._TOKEN_CACHE_KEY}:{account.pk}')
        logger.info('Zoho account connected for user %s', user.pk)
        return self._back(origin, 'connected')
