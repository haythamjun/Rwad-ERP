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
    StudentExportCsvView,
    StudentImportCsvView,
    StudentImportCsvTemplateView,
    AttendanceListCreateView,
    AttendanceDetailView,
    AttendanceSheetView,
)

urlpatterns = [
    path('students/', StudentListCreateView.as_view(), name='student-list'),
    path('students/export/', StudentExportView.as_view(), name='student-export'),
    path('students/export/csv/', StudentExportCsvView.as_view(), name='student-export-csv'),
    path('students/import/', StudentImportView.as_view(), name='student-import'),
    path('students/import/template/', StudentImportTemplateView.as_view(), name='student-import-template'),
    path('students/import/csv/', StudentImportCsvView.as_view(), name='student-import-csv'),
    path('students/import/csv/template/', StudentImportCsvTemplateView.as_view(), name='student-import-csv-template'),
    path('students/<int:pk>/', StudentDetailView.as_view(), name='student-detail'),
    # Guardians
    path('students/<int:student_pk>/guardians/', GuardianListCreateView.as_view(), name='guardian-list'),
    path('students/<int:student_pk>/guardians/<int:pk>/', GuardianDetailView.as_view(), name='guardian-detail'),
    # Family
    path('students/<int:student_pk>/family/', FamilyInfoView.as_view(), name='family-info'),
    # Attachments
    path('students/<int:student_pk>/attachments/', StudentAttachmentListView.as_view(), name='attachment-list'),
    path('students/<int:student_pk>/attachments/<int:pk>/', StudentAttachmentDeleteView.as_view(), name='attachment-delete'),
    # Attendance — per student
    path('students/<int:student_pk>/attendance/', AttendanceListCreateView.as_view(), name='attendance-list'),
    path('students/<int:student_pk>/attendance/<int:pk>/', AttendanceDetailView.as_view(), name='attendance-detail'),
    # Attendance — global list (for attendance sheet views)
    path('attendance/', AttendanceListCreateView.as_view(), name='attendance-global'),
    # Attendance — daily sheet (students merged with attendance)
    path('attendance/sheet/', AttendanceSheetView.as_view(), name='attendance-sheet'),
]
