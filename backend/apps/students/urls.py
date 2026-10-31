from django.urls import path
from .portal_views import (
    GuardianLoginView,
    GuardianLogoutView,
    PortalStudentView,
    PortalAttendanceView,
    PortalDashboardView,
)
from .views import (
    StudentListCreateView,
    StudentDetailView,
    AcceptStudentView,
    RejectStudentView,
    RestoreStudentView,
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
    ScheduleListCreateView,
    ScheduleDetailView,
    ScheduleBulkCreateView,
    ScheduleClassesView,
    MedicalProfileView,
    MedicalVisitListCreateView,
    MedicalVisitDetailView,
    MedicationListCreateView,
    MedicationDetailView,
    DailyCheckInListCreateView,
    DailyCheckInDetailView,
    MedicalCheckInSheetView,
    PlanListCreateView,
    PlanDetailView,
    PlanAttachmentListView,
    PlanAttachmentDeleteView,
    IndividualPlanListCreateView,
    IndividualPlanDetailView,
    GoalAnalysisSheetListCreateView,
    GoalAnalysisSheetDetailView,
    QuarterlyPlanListCreateView,
    QuarterlyPlanDetailView,
    StudentSpecialistAssignmentsView,
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
    path('students/<int:pk>/accept/', AcceptStudentView.as_view(), name='student-accept'),
    path('students/<int:pk>/reject/', RejectStudentView.as_view(), name='student-reject'),
    path('students/<int:pk>/restore/', RestoreStudentView.as_view(), name='student-restore'),
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
    # Schedule — per student weekly timetable
    path('students/<int:student_pk>/schedule/', ScheduleListCreateView.as_view(), name='schedule-list'),
    path('students/<int:student_pk>/schedule/<int:pk>/', ScheduleDetailView.as_view(), name='schedule-detail'),
    # Schedule — bulk creation across many students + grouped "classes" view
    path('schedule/bulk/', ScheduleBulkCreateView.as_view(), name='schedule-bulk-create'),
    path('schedule/classes/', ScheduleClassesView.as_view(), name='schedule-classes'),
    # الملف الطبي — لكل طالب
    path('students/<int:student_pk>/medical-profile/', MedicalProfileView.as_view(), name='medical-profile'),
    path('students/<int:student_pk>/medical-visits/', MedicalVisitListCreateView.as_view(), name='medical-visit-list'),
    path('students/<int:student_pk>/medical-visits/<int:pk>/', MedicalVisitDetailView.as_view(), name='medical-visit-detail'),
    path('students/<int:student_pk>/medications/', MedicationListCreateView.as_view(), name='medication-list'),
    path('students/<int:student_pk>/medications/<int:pk>/', MedicationDetailView.as_view(), name='medication-detail'),
    path('students/<int:student_pk>/medical-checkins/', DailyCheckInListCreateView.as_view(), name='medical-checkin-list'),
    path('students/<int:student_pk>/medical-checkins/<int:pk>/', DailyCheckInDetailView.as_view(), name='medical-checkin-detail'),
    # القسم الطبي — كشف يومي مدمج حسب الفرع
    path('medical/sheet/', MedicalCheckInSheetView.as_view(), name='medical-checkin-sheet'),
    # الخطة الشهرية — لكل طالب
    path('students/<int:student_pk>/plans/', PlanListCreateView.as_view(), name='plan-list'),
    path('students/<int:student_pk>/plans/<int:pk>/', PlanDetailView.as_view(), name='plan-detail'),
    # مرفقات الخطة — ملف Excel/Word جاهز
    path('students/<int:student_pk>/plans/<int:plan_pk>/attachments/', PlanAttachmentListView.as_view(), name='plan-attachment-list'),
    path('students/<int:student_pk>/plans/<int:plan_pk>/attachments/<int:pk>/', PlanAttachmentDeleteView.as_view(), name='plan-attachment-delete'),
    # الخطط — قائمة شاملة عبر كل الطلاب (نفس الـ View، بلا student_pk)
    path('plans/', PlanListCreateView.as_view(), name='plan-global'),
    # الخطة الفردية — لكل طالب
    path('students/<int:student_pk>/individual-plans/', IndividualPlanListCreateView.as_view(), name='individual-plan-list'),
    path('students/<int:student_pk>/individual-plans/<int:pk>/', IndividualPlanDetailView.as_view(), name='individual-plan-detail'),
    # الخطة الفردية — قائمة شاملة عبر كل الطلاب
    path('individual-plans/', IndividualPlanListCreateView.as_view(), name='individual-plan-global'),
    # نموذج تحليل الأهداف — شهر متابعة يومية لكل مجال في الخطة الفردية
    path('students/<int:student_pk>/individual-plans/<int:plan_pk>/analysis-sheets/', GoalAnalysisSheetListCreateView.as_view(), name='analysis-sheet-list'),
    path('students/<int:student_pk>/individual-plans/<int:plan_pk>/analysis-sheets/<int:pk>/', GoalAnalysisSheetDetailView.as_view(), name='analysis-sheet-detail'),
    # الخطة الفصلية — لكل طالب
    path('students/<int:student_pk>/quarterly-plans/', QuarterlyPlanListCreateView.as_view(), name='quarterly-plan-list'),
    path('students/<int:student_pk>/quarterly-plans/<int:pk>/', QuarterlyPlanDetailView.as_view(), name='quarterly-plan-detail'),
    # الخطة الفصلية — قائمة شاملة عبر كل الطلاب
    path('quarterly-plans/', QuarterlyPlanListCreateView.as_view(), name='quarterly-plan-global'),
    # تكليفات الأخصائيين — لكل طالب
    path('students/<int:student_pk>/specialist-assignments/', StudentSpecialistAssignmentsView.as_view(), name='student-specialist-assignments'),

    # ── Guardian Portal (Flutter app) ──────────────────────────────────────────
    path('portal/login/',      GuardianLoginView.as_view(),    name='portal-login'),
    path('portal/logout/',     GuardianLogoutView.as_view(),   name='portal-logout'),
    path('portal/dashboard/',  PortalDashboardView.as_view(),  name='portal-dashboard'),
    path('portal/student/',    PortalStudentView.as_view(),    name='portal-student'),
    path('portal/attendance/', PortalAttendanceView.as_view(), name='portal-attendance'),
]
