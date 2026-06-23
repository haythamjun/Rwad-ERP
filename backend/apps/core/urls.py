from django.urls import path
from .views import AuditLogListView, BranchListCreateView, BranchDetailView, DashboardStatsView

urlpatterns = [
    path('audit-logs/',         AuditLogListView.as_view(),    name='audit-logs'),
    path('branches/',           BranchListCreateView.as_view(), name='branch-list'),
    path('branches/<int:pk>/',  BranchDetailView.as_view(),    name='branch-detail'),
    path('dashboard/stats/',    DashboardStatsView.as_view(),  name='dashboard-stats'),
]
