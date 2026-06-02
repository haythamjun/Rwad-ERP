from django.urls import path
from .views import (
    StudentListCreateView,
    StudentDetailView,
    GuardianListCreateView,
    GuardianDetailView,
    FamilyInfoView,
    StudentAttachmentListView,
    StudentAttachmentDeleteView,
    StudentExportView,
    StudentImportView,
    StudentImportTemplateView,
)

urlpatterns = [
    path('students/', StudentListCreateView.as_view(), name='student-list'),
    path('students/export/', StudentExportView.as_view(), name='student-export'),
    path('students/import/', StudentImportView.as_view(), name='student-import'),
    path('students/import/template/', StudentImportTemplateView.as_view(), name='student-import-template'),
    path('students/<int:pk>/', StudentDetailView.as_view(), name='student-detail'),
    # Guardians
    path('students/<int:student_pk>/guardians/', GuardianListCreateView.as_view(), name='guardian-list'),
    path('students/<int:student_pk>/guardians/<int:pk>/', GuardianDetailView.as_view(), name='guardian-detail'),
    # Family
    path('students/<int:student_pk>/family/', FamilyInfoView.as_view(), name='family-info'),
    # Attachments
    path('students/<int:student_pk>/attachments/', StudentAttachmentListView.as_view(), name='attachment-list'),
    path('students/<int:student_pk>/attachments/<int:pk>/', StudentAttachmentDeleteView.as_view(), name='attachment-delete'),
]
