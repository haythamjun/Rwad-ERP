from datetime import date

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from django.http import HttpResponse
from django.utils.dateparse import parse_date

from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Q
from .models import AuditLog, Branch, Bus, SiteSettings
from .permissions import CanViewReports
from .utils import log_action
from apps.accounts.permissions import IsManagerOrAbove, IsAdmin


# ── Audit Log ──────────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'action_display',
                  'object_repr', 'changes', 'ip_address', 'timestamp']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class AuditLogListView(generics.ListAPIView):
    queryset           = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class   = AuditLogSerializer
    permission_classes = [IsManagerOrAbove]
    filterset_fields   = ['action']
    search_fields      = ['object_repr', 'user__username']


# ── Branch ─────────────────────────────────────────────────────────────────────

class BranchSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Branch
        fields = ['id', 'name', 'city', 'location', 'phone', 'is_active', 'created_at', 'student_count']
        read_only_fields = ['id', 'created_at']


class BranchListCreateView(generics.ListCreateAPIView):
    serializer_class   = BranchSerializer
    pagination_class   = None          # branches are a small list; no pagination needed

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Branch.objects.annotate(student_count=Count('students')).order_by('name')


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BranchSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Branch.objects.annotate(student_count=Count('students'))


# ── إعدادات المركز ────────────────────────────────────────────────────────────

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SiteSettings
        fields = [
            'center_name_ar', 'center_name_en', 'phone', 'email',
            'website', 'address', 'logo', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class SiteSettingsView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.get_solo()).data)

    def patch(self, request):
        obj = SiteSettings.get_solo()
        serializer = SiteSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Bus ────────────────────────────────────────────────────────────────────────

class BusSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model  = Bus
        fields = [
            'id', 'chassis_number', 'plate_number', 'brand', 'manufacture_year',
            'serial_number', 'branch', 'branch_name',
            'registration_expiry', 'inspection_expiry',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_manufacture_year(self, value):
        current_year = date.today().year
        if not (1980 <= value <= current_year + 1):
            raise serializers.ValidationError(f'سنة الصنع يجب أن تكون بين 1980 و {current_year + 1}.')
        return value


class BusListCreateView(generics.ListCreateAPIView):
    serializer_class = BusSerializer
    pagination_class = None  # عدد الباصات محدود عادة — لا حاجة للترقيم
    filterset_fields = ['branch']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Bus.objects.select_related('branch').order_by('-created_at')


class BusDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BusSerializer
    permission_classes = [IsAdmin]
    queryset           = Bus.objects.select_related('branch')


# ── Dashboard stats ────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.students.models import Student
        from apps.accounts.models import User

        user = request.user
        qs = Student.objects.all()
        branches_qs = Branch.objects.filter(is_active=True)
        buses_qs = Bus.objects.all()

        if not user.is_admin:
            if user.assigned_branch_id:
                qs = qs.filter(branch_id=user.assigned_branch_id)
                branches_qs = branches_qs.filter(id=user.assigned_branch_id)
                buses_qs = buses_qs.filter(branch_id=user.assigned_branch_id)
            elif user.assigned_city:
                qs = qs.filter(branch__city=user.assigned_city)
                branches_qs = branches_qs.filter(city=user.assigned_city)
                buses_qs = buses_qs.filter(branch__city=user.assigned_city)

        total = qs.count()
        by_status = dict(
            qs.values_list('status').annotate(n=Count('id')).values_list('status', 'n')
        )

        branches = (
            branches_qs
            .annotate(
                student_count=Count('students', distinct=True),
                male_count=Count('students', filter=Q(students__gender='male'), distinct=True),
                female_count=Count('students', filter=Q(students__gender='female'), distinct=True),
            )
            .values('id', 'name', 'location', 'student_count', 'male_count', 'female_count')
            .order_by('name')
        )

        today = date.today()
        bus_count = buses_qs.count()
        buses_needing_renewal = buses_qs.filter(
            Q(registration_expiry__lt=today) | Q(inspection_expiry__lt=today)
        ).count()

        # عدد المستخدمين — نطاق عام (نظام) وليس محصورًا بالفرع
        users_qs = User.objects.filter(is_active=True)
        user_count = users_qs.count()
        users_by_role = dict(
            users_qs.values_list('role').annotate(n=Count('id')).values_list('role', 'n')
        )

        return Response({
            'total':     total,
            'by_status': by_status,
            'branches':  list(branches),
            'bus_count': bus_count,
            'buses_needing_renewal': buses_needing_renewal,
            'user_count': user_count,
            'users_by_role': users_by_role,
        })


# ── التقارير — تقرير الحضور والانصراف ────────────────────────────────────────

def _build_attendance_report(request):
    """يبني بيانات تقرير الحضور: (date_from, date_to, summary, rows) — يُستخدم من عرض JSON وتصدير Excel معًا."""
    from apps.students.models import Student, StudentAttendance

    today = date.today()
    date_from = parse_date(request.query_params.get('date_from', '')) or today.replace(day=1)
    date_to   = parse_date(request.query_params.get('date_to', '')) or today

    qs = StudentAttendance.objects.filter(attendance_date__gte=date_from, attendance_date__lte=date_to)

    user = request.user
    if not user.is_admin:
        if user.assigned_branch_id:
            qs = qs.filter(branch_id=user.assigned_branch_id)
        elif user.assigned_city:
            qs = qs.filter(branch__city=user.assigned_city)

    branch_param = request.query_params.get('branch')
    if branch_param:
        qs = qs.filter(branch_id=branch_param)

    student_param = request.query_params.get('student')
    if student_param:
        qs = qs.filter(student_id=student_param)

    def _rate(row):
        return round((row['present'] + row['late']) / row['total'] * 100, 1) if row['total'] else 0

    summary = qs.aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status='present')),
        absent=Count('id', filter=Q(status='absent')),
        late=Count('id', filter=Q(status='late')),
        excused_absence=Count('id', filter=Q(status='excused_absence')),
        early_leave=Count('id', filter=Q(status='early_leave')),
    )
    summary['attendance_rate'] = _rate(summary)
    summary['student_count'] = qs.values('student_id').distinct().count()

    rows = list(
        qs.values('student_id')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            absent=Count('id', filter=Q(status='absent')),
            late=Count('id', filter=Q(status='late')),
            excused_absence=Count('id', filter=Q(status='excused_absence')),
            early_leave=Count('id', filter=Q(status='early_leave')),
        )
        .order_by('-total')
    )
    students_map = {
        s.id: s for s in Student.objects.filter(id__in=[r['student_id'] for r in rows]).select_related('branch')
    }
    for r in rows:
        s = students_map.get(r['student_id'])
        r['student_name'] = s.full_name if s else ''
        r['file_number']  = s.file_number if s else ''
        r['branch_name']  = s.branch.name if s and s.branch_id else None
        r['attendance_rate'] = _rate(r)

    return date_from, date_to, summary, rows


class AttendanceReportView(APIView):
    """تقرير الحضور والانصراف — إحصائيات مجمّعة عبر مدى تاريخي (وليس تسجيلًا يوميًا)."""
    permission_classes = [CanViewReports]

    def get(self, request):
        date_from, date_to, summary, rows = _build_attendance_report(request)
        return Response({
            'date_from': date_from,
            'date_to':   date_to,
            'summary':   summary,
            'by_student': rows,
        })


class AttendanceReportExportView(APIView):
    permission_classes = [CanViewReports]

    def get(self, request):
        date_from, date_to, summary, rows = _build_attendance_report(request)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'تقرير الحضور'
        ws.sheet_view.rightToLeft = True

        title_fill = PatternFill(start_color='0F2A47', end_color='0F2A47', fill_type='solid')
        title_font = Font(color='FFFFFF', bold=True, size=13)
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=9)
        cell = ws.cell(row=1, column=1, value=f'تقرير الحضور والانصراف — من {date_from} إلى {date_to}')
        cell.fill = title_fill
        cell.font = title_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        ws.row_dimensions[1].height = 24

        headers = ['رقم الملف', 'اسم الطالب', 'الفرع', 'حاضر', 'غائب', 'متأخر', 'غياب بعذر', 'انصراف مبكر', 'الإجمالي', 'نسبة الحضور %']
        header_fill = PatternFill(start_color='1E3A5F', end_color='1E3A5F', fill_type='solid')
        header_font = Font(color='FFFFFF', bold=True, size=11)
        ws.row_dimensions[2].height = 22
        for col_idx, header in enumerate(headers, 1):
            c = ws.cell(row=2, column=col_idx, value=header)
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            ws.column_dimensions[c.column_letter].width = 16

        alt_fill = PatternFill(start_color='EEF2F8', end_color='EEF2F8', fill_type='solid')
        for row_idx, r in enumerate(rows, 3):
            values = [
                r['file_number'], r['student_name'], r['branch_name'] or '',
                r['present'], r['absent'], r['late'], r['excused_absence'], r['early_leave'],
                r['total'], r['attendance_rate'],
            ]
            for col_idx, value in enumerate(values, 1):
                c = ws.cell(row=row_idx, column=col_idx, value=value)
                c.alignment = Alignment(horizontal='center', vertical='center')
                if row_idx % 2 == 0:
                    c.fill = alt_fill

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="attendance_report_{date_from}_{date_to}.xlsx"'
        wb.save(response)

        log_action(request, 'export', None, f'تصدير تقرير الحضور والانصراف ({date_from} إلى {date_to})')
        return response
