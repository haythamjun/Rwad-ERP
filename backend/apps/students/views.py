from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

from .models import Student, Guardian, FamilyInfo, StudentAttachment
from .serializers import (
    StudentListSerializer,
    StudentDetailSerializer,
    StudentCreateUpdateSerializer,
    GuardianSerializer,
    FamilyInfoSerializer,
    StudentAttachmentSerializer,
)
from .filters import StudentFilter
from .permissions import CanWrite, CanDelete
from apps.core.utils import log_action


class StudentListCreateView(generics.ListCreateAPIView):
    queryset = Student.objects.select_related('created_by').prefetch_related(
        'guardians', 'family_info'
    )
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StudentFilter
    search_fields = ['full_name', 'national_id', 'file_number']
    ordering_fields = ['full_name', 'registration_date', 'created_at', 'file_number']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentCreateUpdateSerializer
        return StudentListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanWrite()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        student = serializer.save()
        log_action(self.request, 'create', student, str(student))


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Student.objects.select_related('created_by').prefetch_related(
        'guardians', 'family_info', 'attachments'
    )
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StudentCreateUpdateSerializer
        return StudentDetailSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [CanWrite()]
        if self.request.method == 'DELETE':
            return [CanDelete()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        student = serializer.save()
        log_action(self.request, 'update', student, str(student))

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, str(instance))
        instance.delete()


# ──────────────────────────────────────────────────────────────────────────────
# Guardian views
# ──────────────────────────────────────────────────────────────────────────────

class GuardianListCreateView(generics.ListCreateAPIView):
    serializer_class = GuardianSerializer

    def get_queryset(self):
        return Guardian.objects.filter(student_id=self.kwargs['student_pk'])

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanWrite()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        student = get_object_or_404(Student, pk=self.kwargs['student_pk'])
        guardian = serializer.save(student=student)
        log_action(self.request, 'create', guardian, str(guardian))


class GuardianDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GuardianSerializer

    def get_queryset(self):
        return Guardian.objects.filter(student_id=self.kwargs['student_pk'])

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [CanWrite()]
        if self.request.method == 'DELETE':
            return [CanDelete()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        guardian = serializer.save()
        log_action(self.request, 'update', guardian, str(guardian))

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, str(instance))
        instance.delete()


# ──────────────────────────────────────────────────────────────────────────────
# FamilyInfo views
# ──────────────────────────────────────────────────────────────────────────────

class FamilyInfoView(APIView):
    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return [CanWrite()]
        return [IsAuthenticated()]

    def get(self, request, student_pk):
        student = get_object_or_404(Student, pk=student_pk)
        try:
            family = student.family_info
        except FamilyInfo.DoesNotExist:
            return Response(
                {'detail': 'لا توجد بيانات أسرة لهذا الطالب بعد'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = FamilyInfoSerializer(family)
        return Response(serializer.data)

    def post(self, request, student_pk):
        student = get_object_or_404(Student, pk=student_pk)
        if hasattr(student, 'family_info'):
            return Response(
                {'detail': 'يوجد بالفعل سجل أسرة لهذا الطالب. استخدم PUT للتعديل.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = FamilyInfoSerializer(data=request.data)
        if serializer.is_valid():
            family = serializer.save(student=student)
            log_action(request, 'create', family, str(family))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, student_pk):
        student = get_object_or_404(Student, pk=student_pk)
        try:
            family = student.family_info
        except FamilyInfo.DoesNotExist:
            return Response(
                {'detail': 'لا توجد بيانات أسرة. استخدم POST لإنشائها أولاً.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = FamilyInfoSerializer(family, data=request.data, partial=True)
        if serializer.is_valid():
            family = serializer.save()
            log_action(request, 'update', family, str(family))
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# Attachment views
# ──────────────────────────────────────────────────────────────────────────────

class StudentAttachmentListView(generics.ListCreateAPIView):
    serializer_class = StudentAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return StudentAttachment.objects.filter(student_id=self.kwargs['student_pk'])

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanWrite()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        student = get_object_or_404(Student, pk=self.kwargs['student_pk'])
        attachment = serializer.save(student=student, uploaded_by=self.request.user)
        log_action(self.request, 'create', attachment, str(attachment))


class StudentAttachmentDeleteView(generics.DestroyAPIView):
    serializer_class = StudentAttachmentSerializer
    permission_classes = [CanDelete]

    def get_queryset(self):
        return StudentAttachment.objects.filter(student_id=self.kwargs['student_pk'])

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, str(instance))
        instance.file.delete(save=False)
        instance.delete()


# ──────────────────────────────────────────────────────────────────────────────
# Export
# ──────────────────────────────────────────────────────────────────────────────

class StudentExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        students = (
            Student.objects
            .all()
            .prefetch_related('guardians')
            .select_related('family_info')
            .order_by('file_number')
        )

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'بيانات المستفيدين'
        ws.sheet_view.rightToLeft = True

        # ── Group headers (row 1) ──────────────────────────────────────
        GROUP_HEADERS = [
            ('بيانات المستفيد',          1,  12),
            ('بيانات ولي الأمر',         13, 21),
            ('دراسة الحالة الاجتماعية',  22, 28),
        ]
        group_fill = PatternFill(start_color='0F2A47', end_color='0F2A47', fill_type='solid')
        group_font = Font(color='FFFFFF', bold=True, size=13)
        for title, start_col, end_col in GROUP_HEADERS:
            ws.merge_cells(start_row=1, start_column=start_col,
                           end_row=1,   end_column=end_col)
            cell = ws.cell(row=1, column=start_col, value=title)
            cell.fill      = group_fill
            cell.font      = group_font
            cell.alignment = Alignment(horizontal='center', vertical='center')

        # ── Column headers (row 2) ─────────────────────────────────────
        headers = [
            # بيانات المستفيد
            'رقم الملف', 'تاريخ التسجيل', 'الاسم الكامل', 'رقم الهوية',
            'تاريخ الميلاد', 'الجنس', 'الجنسية', 'الحالة',
            'نوع الإعاقة', 'درجة الإعاقة', 'التشخيص', 'جهة الإحالة',
            # بيانات ولي الأمر
            'اسم ولي الأمر', 'صلة القرابة', 'رقم هوية ولي الأمر',
            'رقم الجوال', 'جوال إضافي', 'البريد الإلكتروني',
            'العنوان', 'جهة التواصل الرئيسية', 'ملاحظات ولي الأمر',
            # دراسة الحالة
            'عدد أفراد الأسرة', 'ترتيب المستفيد', 'حالة الوالدين',
            'الدخل الشهري (ريال)', 'الدخل التقريبي', 'نوع السكن',
            'ملاحظات اجتماعية',
        ]

        header_fill = PatternFill(start_color='1E3A5F', end_color='1E3A5F', fill_type='solid')
        header_font = Font(color='FFFFFF', bold=True, size=11)
        ws.row_dimensions[1].height = 22
        ws.row_dimensions[2].height = 22

        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_idx, value=header)
            cell.fill      = header_fill
            cell.font      = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            ws.column_dimensions[cell.column_letter].width = 17

        # ── Data rows ─────────────────────────────────────────────────
        alt_fill = PatternFill(start_color='EEF2F8', end_color='EEF2F8', fill_type='solid')

        for row_idx, student in enumerate(students, 3):
            guardian = (
                student.guardians.filter(is_primary_contact=True).first()
                or student.guardians.first()
            )
            fam = getattr(student, 'family_info', None)
            row_fill = alt_fill if row_idx % 2 == 0 else None

            data = [
                # بيانات المستفيد
                student.file_number,
                str(student.registration_date),
                student.full_name,
                student.national_id,
                str(student.date_of_birth),
                student.get_gender_display(),
                student.nationality,
                student.get_status_display(),
                student.get_disability_type_display()  if student.disability_type  else '',
                student.get_disability_degree_display() if student.disability_degree else '',
                student.diagnosis or '',
                student.get_referral_source_display()  if student.referral_source  else '',
                # بيانات ولي الأمر
                guardian.full_name          if guardian else '',
                guardian.get_relationship_display() if guardian else '',
                guardian.national_id        if guardian else '',
                guardian.phone              if guardian else '',
                guardian.phone_alt          if guardian else '',
                guardian.email              if guardian else '',
                guardian.address            if guardian else '',
                'نعم' if (guardian and guardian.is_primary_contact) else 'لا',
                guardian.notes              if guardian else '',
                # دراسة الحالة
                fam.family_size    if fam else '',
                fam.sibling_order  if fam else '',
                fam.get_parents_status_display() if fam else '',
                fam.monthly_income if fam else '',
                fam.get_income_range_display()   if fam else '',
                fam.get_housing_type_display()   if fam else '',
                fam.social_notes   if fam else '',
            ]
            for col_idx, value in enumerate(data, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=value)
                cell.alignment = Alignment(horizontal='right', vertical='center')
                if row_fill:
                    cell.fill = row_fill

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="students_rwad.xlsx"'
        wb.save(response)

        log_action(request, 'export', None, 'تصدير قائمة الطلاب إلى Excel')
        return response
