from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import SAFE_METHODS

from apps.accounts.permissions import IsAdmin
from apps.students.models import Student
from apps.students.views import _scope_by_student, _assert_student_in_scope

from .models import Assessment, StudentAssessment
from .permissions import CanViewAssessments, CanEditAssessments
from .serializers import (
    AssessmentBuilderSerializer, AssessmentListSerializer,
    AssessmentDetailReadSerializer, StudentAssessmentSerializer,
)


# ── مكتبة المقاييس ────────────────────────────────────────────────────────────
# القراءة: أي مستخدم لديه صلاحية عرض المقاييس. الكتابة (إنشاء/تعديل/حذف المقياس
# نفسه وأسئلته): للمدير فقط — أصل مشترك موحّد للنظام كامل.

class AssessmentListCreateView(generics.ListCreateAPIView):
    queryset = Assessment.objects.all()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [CanViewAssessments()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return AssessmentListSerializer
        return AssessmentBuilderSerializer


class AssessmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Assessment.objects.all()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [CanViewAssessments()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return AssessmentDetailReadSerializer
        return AssessmentBuilderSerializer


# ── تقييمات الطلاب ────────────────────────────────────────────────────────────

class StudentAssessmentListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentAssessmentSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [CanViewAssessments()]
        return [CanEditAssessments()]

    def get_queryset(self):
        student_pk = self.kwargs.get('student_pk')
        qs = StudentAssessment.objects.select_related('assessment', 'started_by').prefetch_related('answers')
        if student_pk:
            qs = qs.filter(student_id=student_pk)
        return _scope_by_student(self.request.user, qs)

    def perform_create(self, serializer):
        student_pk = self.kwargs.get('student_pk')
        if student_pk:
            student = get_object_or_404(Student, pk=student_pk)
            _assert_student_in_scope(self.request.user, student)
            serializer.save(student=student)
        else:
            student = serializer.validated_data.get('student')
            if student is not None:
                _assert_student_in_scope(self.request.user, student)
            serializer.save()


class StudentAssessmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudentAssessmentSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [CanViewAssessments()]
        return [CanEditAssessments()]

    def get_queryset(self):
        student_pk = self.kwargs.get('student_pk')
        qs = StudentAssessment.objects.select_related('assessment', 'started_by').prefetch_related('answers')
        if student_pk:
            qs = qs.filter(student_id=student_pk)
        return _scope_by_student(self.request.user, qs)
