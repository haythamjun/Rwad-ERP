from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserPickerSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsAdmin
from apps.core.utils import log_action

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data.get('username'))
            log_action(request, 'login', user, str(user))
        return response


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        log_action(request, 'logout', request.user, str(request.user))
        return Response({'detail': 'تم تسجيل الخروج بنجاح'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'detail': 'كلمة المرور الحالية غير صحيحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'تم تغيير كلمة المرور بنجاح'})


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.prefetch_related('module_permissions').order_by('-date_joined')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        # القراءة الكاملة (بريد/جوال/فرع/صلاحيات كل مستخدم) مقصورة على المدير/المشرف؛
        # أي مستخدم آخر مسجّل دخول (لقوائم اختيار مثل الأخصائي بالجدول الدراسي) يحصل
        # على نسخة خفيفة بلا بيانات حساسة.
        if self.request.user.is_manager_or_above:
            return UserSerializer
        return UserPickerSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(request, 'create', user, str(user))
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.prefetch_related('module_permissions').all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(request, 'update', user, str(user))
        return Response(UserSerializer(user).data)

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, str(instance))
        instance.delete()
