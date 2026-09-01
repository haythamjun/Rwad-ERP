from django.urls import path
from .views import (
    AuditLogListView, BranchListCreateView, BranchDetailView,
    BusListCreateView, BusDetailView, DashboardStatsView,
    SiteSettingsView, AttendanceReportView, AttendanceReportExportView,
)

urlpatterns = [
    path('audit-logs/',         AuditLogListView.as_view(),    name='audit-logs'),
    path('branches/',           BranchListCreateView.as_view(), name='branch-list'),
    path('branches/<int:pk>/',  BranchDetailView.as_view(),    name='branch-detail'),
    path('buses/',              BusListCreateView.as_view(),   name='bus-list'),
    path('buses/<int:pk>/',     BusDetailView.as_view(),       name='bus-detail'),
    path('dashboard/stats/',    DashboardStatsView.as_view(),  name='dashboard-stats'),
    path('settings/',           SiteSettingsView.as_view(),    name='site-settings'),
    # التقارير
    path('reports/attendance/',        AttendanceReportView.as_view(),       name='report-attendance'),
    path('reports/attendance/export/', AttendanceReportExportView.as_view(), name='report-attendance-export'),
]
