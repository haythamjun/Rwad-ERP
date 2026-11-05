from django.urls import path

from .portal_views import PortalVirtualSessionJoinView, PortalVirtualSessionsView
from .views import (
    RecordingPlayView, RecordingStreamView,
    VirtualSessionAttendanceView, VirtualSessionDetailView, VirtualSessionListCreateView,
    VirtualSessionStartView, VirtualSessionSyncView, ZohoRecordingsImportView, ZohoConnectView, ZohoCallbackView,
)

urlpatterns = [
    path('virtual-classes/sessions/',                     VirtualSessionListCreateView.as_view(), name='vc-session-list'),
    path('virtual-classes/sessions/<int:pk>/',            VirtualSessionDetailView.as_view(),     name='vc-session-detail'),
    path('virtual-classes/sessions/<int:pk>/start/',      VirtualSessionStartView.as_view(),      name='vc-session-start'),
    path('virtual-classes/sessions/<int:pk>/sync/',       VirtualSessionSyncView.as_view(),       name='vc-session-sync'),
    path('virtual-classes/sessions/<int:pk>/attendance/', VirtualSessionAttendanceView.as_view(), name='vc-session-attendance'),
    path('virtual-classes/recordings/<int:pk>/play/',     RecordingPlayView.as_view(),            name='vc-recording-play'),
    path('virtual-classes/recordings/stream/<str:token>/', RecordingStreamView.as_view(),         name='vc-recording-stream'),
    path('virtual-classes/zoho-recordings/',              ZohoRecordingsImportView.as_view(),     name='vc-zoho-recordings'),
    path('virtual-classes/zoho/connect/',                 ZohoConnectView.as_view(),              name='vc-zoho-connect'),
    path('virtual-classes/zoho/callback/',                ZohoCallbackView.as_view(),             name='vc-zoho-callback'),
    # بوابة أولياء الأمور
    path('portal/virtual-sessions/',                      PortalVirtualSessionsView.as_view(),    name='portal-virtual-sessions'),
    path('portal/virtual-sessions/<int:pk>/join/',        PortalVirtualSessionJoinView.as_view(), name='portal-virtual-session-join'),
]
