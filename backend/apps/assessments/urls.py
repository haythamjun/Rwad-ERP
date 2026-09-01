from django.urls import path
from .views import (
    AssessmentListCreateView,
    AssessmentDetailView,
    StudentAssessmentListCreateView,
    StudentAssessmentDetailView,
)

urlpatterns = [
    # مكتبة المقاييس
    path('assessments/', AssessmentListCreateView.as_view(), name='assessment-list'),
    path('assessments/<int:pk>/', AssessmentDetailView.as_view(), name='assessment-detail'),
    # تقييمات الطلاب — لكل طالب
    path('students/<int:student_pk>/assessments/', StudentAssessmentListCreateView.as_view(), name='student-assessment-list'),
    path('students/<int:student_pk>/assessments/<int:pk>/', StudentAssessmentDetailView.as_view(), name='student-assessment-detail'),
]
