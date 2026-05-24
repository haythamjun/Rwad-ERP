from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'مدير النظام'
        MANAGER = 'manager', 'مدير'
        SPECIALIST = 'specialist', 'أخصائي'
        RECEPTION = 'reception', 'استقبال'
        VIEWER = 'viewer', 'مشاهد'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        verbose_name='الدور الوظيفي',
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الجوال')
    avatar = models.ImageField(
        upload_to='avatars/', null=True, blank=True, verbose_name='الصورة الشخصية'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_manager_or_above(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]

    @property
    def can_write(self):
        return self.role in [
            self.Role.ADMIN,
            self.Role.MANAGER,
            self.Role.SPECIALIST,
            self.Role.RECEPTION,
        ]

    @property
    def can_delete(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]
