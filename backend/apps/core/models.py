from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class Branch(models.Model):
    name        = models.CharField(max_length=100, unique=True, verbose_name='اسم الفرع')
    location    = models.CharField(max_length=200, blank=True, verbose_name='الموقع')
    phone       = models.CharField(max_length=20,  blank=True, verbose_name='هاتف الفرع')
    is_active   = models.BooleanField(default=True, verbose_name='نشط')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'فرع'
        verbose_name_plural = 'الفروع'
        ordering            = ['name']

    def __str__(self):
        return self.name


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'إضافة'
        UPDATE = 'update', 'تعديل'
        DELETE = 'delete', 'حذف'
        VIEW = 'view', 'عرض'
        LOGIN = 'login', 'تسجيل دخول'
        LOGOUT = 'logout', 'تسجيل خروج'
        EXPORT = 'export', 'تصدير'

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='المستخدم',
    )
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name='العملية')

    content_type = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    object_repr = models.CharField(max_length=200, blank=True, verbose_name='العنصر')
    changes = models.JSONField(default=dict, verbose_name='التغييرات')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='الوقت')

    class Meta:
        verbose_name = 'سجل مراجعة'
        verbose_name_plural = 'سجلات المراجعة'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} | {self.get_action_display()} | {self.object_repr} | {self.timestamp:%Y-%m-%d %H:%M}"
