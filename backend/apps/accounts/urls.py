from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    LogoutView,
    UserProfileView,
    ChangePasswordView,
    UserListCreateView,
    UserDetailView,
    SpecialistCertificateListCreateView,
    SpecialistCertificateDetailView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('users/', UserListCreateView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('certificates/', SpecialistCertificateListCreateView.as_view(), name='certificate-list'),
    path('certificates/<int:pk>/', SpecialistCertificateDetailView.as_view(), name='certificate-detail'),
]
