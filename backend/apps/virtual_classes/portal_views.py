"""
Guardian Portal — الحصص المباشرة (تطبيق Flutter).

رابط Zoho لا يُرسَل في القائمة أبدًا؛ يُسلَّم فقط عبر /join/ بعد التحقق أن الطفل
من طلاب الفصل وأن الحصة ضمن نافذة الدخول، وعندها يُسجَّل حضوره.
"""
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.students.portal_views import GuardianIsAuthenticated, GuardianTokenAuthentication

from . import zoho
from .models import SessionAttendance, VirtualSession

_UPCOMING_DAYS = 14


def _session_json(s, attended_ids):
    opens, _ = zoho.join_window(s.starts_at, s.duration_minutes)
    return {
        'id':               s.id,
        'title':            s.title,
        'classroom_name':   s.classroom.name,
        'teacher_name':     (s.classroom.teacher.get_full_name() or s.classroom.teacher.username)
                            if s.classroom.teacher else None,
        'starts_at':        s.starts_at.isoformat(),
        'ends_at':          s.ends_at.isoformat(),
        'duration_minutes': s.duration_minutes,
        'state':            s.live_state,
        'joinable_from':    opens.isoformat(),
        'attended':         s.id in attended_ids,
    }


class PortalVirtualSessionsView(APIView):
    """
    GET /api/portal/virtual-sessions/
    { live: [...], upcoming: [...] } لفصل الطفل — القادمة خلال 14 يوم.
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def get(self, request):
        student = request.user.student
        if not student.classroom_id:
            return Response({'live': [], 'upcoming': [], 'has_classroom': False})
        now = timezone.now()
        qs = (VirtualSession.objects
              .select_related('classroom', 'classroom__teacher')
              .filter(classroom_id=student.classroom_id,
                      status=VirtualSession.Status.SCHEDULED,
                      starts_at__gte=now - timezone.timedelta(hours=4),
                      starts_at__lte=now + timezone.timedelta(days=_UPCOMING_DAYS))
              .order_by('starts_at'))
        attended = set(SessionAttendance.objects.filter(
            student=student, session__in=qs).values_list('session_id', flat=True))
        live, upcoming = [], []
        for s in qs:
            state = s.live_state
            if state == 'live':
                live.append(_session_json(s, attended))
            elif state == 'upcoming':
                upcoming.append(_session_json(s, attended))
        return Response({'live': live, 'upcoming': upcoming, 'has_classroom': True})


class PortalVirtualSessionJoinView(APIView):
    """
    POST /api/portal/virtual-sessions/<pk>/join/
    يتحقق ← يسجّل الحضور ← يرجع رابط الدخول وكلمة المرور.
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def post(self, request, pk):
        guardian = request.user
        student  = guardian.student
        session  = get_object_or_404(VirtualSession, pk=pk, classroom_id=student.classroom_id)

        state = session.live_state
        if state == 'cancelled':
            return Response({'error': 'تم إلغاء هذه الحصة'}, status=status.HTTP_400_BAD_REQUEST)
        if state == 'upcoming':
            return Response({'error': 'الحصة لم تبدأ بعد — يفتح الدخول قبل الموعد بـ 10 دقائق'},
                            status=status.HTTP_400_BAD_REQUEST)
        if state == 'ended':
            return Response({'error': 'انتهت هذه الحصة'}, status=status.HTTP_400_BAD_REQUEST)
        if not session.zoho_join_url:
            return Response({'error': 'رابط الحصة غير متاح، تواصل مع المركز'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        now = timezone.now()
        att, created = SessionAttendance.objects.get_or_create(
            session=session, student=student,
            defaults={'guardian': guardian, 'first_joined_at': now, 'last_joined_at': now},
        )
        if not created:
            SessionAttendance.objects.filter(pk=att.pk).update(
                last_joined_at=now, join_count=F('join_count') + 1, guardian=guardian,
            )

        return Response({
            'join_url':     session.zoho_join_url,
            'password':     session.zoho_password,
            # الاسم اللي يكتبه ولي الأمر عند الدخول حتى يعرفه المعلم
            'display_name': student.full_name,
        })
