from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import UserModulePermission
from apps.core.models import Branch

User = get_user_model()


class ModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserModulePermission
        fields = ['module', 'can_view', 'can_edit', 'can_export', 'can_import']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username']  = user.username
        token['role']      = user.role
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        perms = ModulePermissionSerializer(
            self.user.module_permissions.all(), many=True
        ).data
        data['user'] = {
            'id':           self.user.id,
            'username':     self.user.username,
            'full_name':    self.user.get_full_name() or self.user.username,
            'role':         self.user.role,
            'role_display': self.user.get_role_display(),
            'email':        self.user.email,
            'can_write':       self.user.can_write,
            'can_delete':      self.user.can_delete,
            'is_admin':        self.user.is_admin,
            'assigned_branch': self.user.assigned_branch_id,
            'assigned_city':   self.user.assigned_city,
            'permissions':     perms,
        }
        return data


class UserPickerSerializer(serializers.ModelSerializer):
    """نسخة خفيفة لقوائم الاختيار (مثل اختيار الأخصائي بالجدول الدراسي) — متاحة لأي
    مستخدم مسجّل دخول، بلا بيانات تواصل أو صلاحيات حساسة (خلاف UserSerializer الكامل)."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name    = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'full_name', 'role', 'role_display']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserSerializer(serializers.ModelSerializer):
    role_display         = serializers.CharField(source='get_role_display', read_only=True)
    full_name            = serializers.SerializerMethodField()
    permissions          = ModulePermissionSerializer(source='module_permissions', many=True, read_only=True)
    assigned_branch_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'role', 'role_display', 'phone', 'avatar',
            'is_active', 'created_at', 'permissions',
            'assigned_branch', 'assigned_branch_name', 'assigned_city',
        ]
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_assigned_branch_name(self, obj):
        return obj.assigned_branch.name if obj.assigned_branch else None


class UserCreateSerializer(serializers.ModelSerializer):
    password        = serializers.CharField(write_only=True, min_length=8)
    permissions     = ModulePermissionSerializer(many=True, required=False, write_only=True)
    assigned_branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model  = User
        fields = [
            'username', 'password', 'first_name', 'last_name', 'email',
            'role', 'phone', 'permissions', 'assigned_branch', 'assigned_city',
        ]

    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions', [])
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        for perm in permissions_data:
            UserModulePermission.objects.create(user=user, **perm)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    permissions     = ModulePermissionSerializer(many=True, required=False)
    assigned_branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model  = User
        fields = [
            'first_name', 'last_name', 'email', 'role', 'phone', 'is_active',
            'permissions', 'assigned_branch', 'assigned_city',
        ]

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permissions_data is not None:
            instance.module_permissions.all().delete()
            for perm in permissions_data:
                UserModulePermission.objects.create(user=instance, **perm)
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
