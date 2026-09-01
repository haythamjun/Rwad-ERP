"""
Guardian Portal API — consumed by the Flutter mobile app.

Authentication: Bearer token issued by /api/portal/login/
All endpoints are read-only for guardians.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from django.db.models import Count, Q
from .models import Guardian, GuardianAuthToken, StudentAttendance


# ── Custom authentication ──────────────────────────────────────────────────────

class GuardianTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth.startswith('Bearer '):
            return None
        key = auth[7:].strip()
        try:
            token = GuardianAuthToken.objects.select_related(
                'guardian', 'guardian__student', 'guardian__student__branch'
            ).get(key=key)
            return (token.guardian, token)
        except GuardianAuthToken.DoesNotExist:
            raise AuthenticationFailed('رمز التحقق غير صالح أو منتهي الصلاحية')


class GuardianIsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return request.auth is not None


# ── Login ──────────────────────────────────────────────────────────────────────

class GuardianLoginView(APIView):
    """
    POST /api/portal/login/
    Body: { "phone": "05XXXXXXXX", "file_number": "RW-2026-0001" }
    Returns token + guardian + student summary.
    """
    authentication_classes = []
    permission_classes     = []

    def post(self, request):
        phone       = (request.data.get('phone') or '').strip()
        file_number = (request.data.get('file_number') or '').strip().upper()

        if not phone or not file_number:
            return Response(
                {'error': 'رقم الجوال ورقم الملف مطلوبان'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalise phone: accept 05XXXXXXXX or 5XXXXXXXX
        if phone.startswith('0') and len(phone) == 10:
            phone_normalised = phone[1:]        # strip leading 0
        else:
            phone_normalised = phone

        # Find a guardian whose phone matches and whose student matches file_number
        guardian = (
            Guardian.objects
            .select_related('student', 'student__branch')
            .filter(
                student__file_number=file_number,
            )
            .filter(
                Q(phone__endswith=phone_normalised) |
                Q(phone_alt__endswith=phone_normalised)
            )
            .first()
        )

        if not guardian:
            return Response(
                {'error': 'رقم الجوال أو رقم الملف غير صحيح'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        student = guardian.student

        # Issue (or reuse) a token
        token, _ = GuardianAuthToken.objects.get_or_create(guardian=guardian)

        return Response({
            'token': token.key,
            'guardian': {
                'id':           guardian.id,
                'name':         guardian.full_name,
                'phone':        guardian.phone,
                'relationship': guardian.get_relationship_display(),
            },
            'student': _student_summary(student),
        })


# ── Helpers ────────────────────────────────────────────────────────────────────

def _student_summary(student):
    return {
        'id':                  student.id,
        'file_number':         student.file_number,
        'full_name':           student.full_name,
        'national_id':         student.national_id,
        'date_of_birth':       str(student.date_of_birth),
        'age':                 student.age,
        'gender':              student.gender,
        'gender_display':      student.get_gender_display(),
        'status':              student.status,
        'status_display':      student.get_status_display(),
        'disability_type':     student.disability_type,
        'disability_display':  student.disability_display,
        # 'disability_degree' is kept for the existing Flutter app, which expects a
        # plain string — now carries the combined "type (degree)" display since a
        # single overall degree no longer exists (each type has its own degree).
        'disability_degree':   student.disability_display,
        'branch_name':         student.branch.name if student.branch else None,
        'registration_date':   str(student.registration_date),
        'photo':               student.photo.url if student.photo else None,
    }


def _attendance_stats(student_id, qs=None):
    if qs is None:
        qs = StudentAttendance.objects.filter(student_id=student_id)
    counts = qs.values('status').annotate(n=Count('id'))
    by_status = {row['status']: row['n'] for row in counts}
    total = sum(by_status.values())
    return {
        'total':          total,
        'present':        by_status.get('present', 0),
        'absent':         by_status.get('absent', 0),
        'late':           by_status.get('late', 0),
        'excused_absence':by_status.get('excused_absence', 0),
        'early_leave':    by_status.get('early_leave', 0),
        'attendance_rate': (
            round(by_status.get('present', 0) / total * 100, 1) if total else 0
        ),
    }


# ── Student profile ────────────────────────────────────────────────────────────

class PortalStudentView(APIView):
    """
    GET /api/portal/student/
    Full child profile for the authenticated guardian.
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def get(self, request):
        guardian = request.user      # set by GuardianTokenAuthentication
        student  = guardian.student
        # reload with branch
        student  = student.__class__.objects.select_related('branch').get(pk=student.pk)
        return Response(_student_summary(student))


# ── Attendance ─────────────────────────────────────────────────────────────────

class PortalAttendanceView(APIView):
    """
    GET /api/portal/attendance/?month=2026-07   (optional filter)
    Returns attendance records + summary stats.
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def get(self, request):
        guardian   = request.user
        student_id = guardian.student_id
        month      = request.query_params.get('month')     # e.g. "2026-07"

        qs = StudentAttendance.objects.filter(
            student_id=student_id
        ).order_by('-attendance_date')

        if month:
            try:
                year, m = month.split('-')
                qs = qs.filter(
                    attendance_date__year=int(year),
                    attendance_date__month=int(m),
                )
            except (ValueError, AttributeError):
                pass

        records = [
            {
                'id':               rec.id,
                'date':             str(rec.attendance_date),
                'status':           rec.status,
                'status_display':   rec.get_status_display(),
                'check_in_time':    str(rec.check_in_time)[:5] if rec.check_in_time else None,
                'check_out_time':   str(rec.check_out_time)[:5] if rec.check_out_time else None,
                'absence_reason':   rec.absence_reason or None,
                'guardian_notified':rec.guardian_notified,
                'notes':            rec.notes or None,
            }
            for rec in qs
        ]

        return Response({
            'stats':   _attendance_stats(student_id, qs),
            'records': records,
        })


# ── Dashboard / Stats ──────────────────────────────────────────────────────────

class PortalDashboardView(APIView):
    """
    GET /api/portal/dashboard/
    Quick summary: child info + recent attendance + overall stats.
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def get(self, request):
        guardian = request.user
        student  = guardian.student.__class__.objects.select_related('branch').get(
            pk=guardian.student_id
        )

        recent = (
            StudentAttendance.objects
            .filter(student_id=student.id)
            .order_by('-attendance_date')[:10]
        )

        recent_records = [
            {
                'date':           str(r.attendance_date),
                'status':         r.status,
                'status_display': r.get_status_display(),
                'check_in_time':  str(r.check_in_time)[:5] if r.check_in_time else None,
            }
            for r in recent
        ]

        return Response({
            'student':        _student_summary(student),
            'stats':          _attendance_stats(student.id),
            'recent_attendance': recent_records,
        })


# ── Logout ─────────────────────────────────────────────────────────────────────

class GuardianLogoutView(APIView):
    """
    POST /api/portal/logout/
    Deletes the guardian's token (signs out all devices).
    """
    authentication_classes = [GuardianTokenAuthentication]
    permission_classes     = [GuardianIsAuthenticated]

    def post(self, request):
        auth_token = request.auth    # the GuardianAuthToken instance
        auth_token.delete()
        return Response({'detail': 'تم تسجيل الخروج بنجاح'})
