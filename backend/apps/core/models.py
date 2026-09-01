from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class Branch(models.Model):
    name        = models.CharField(max_length=100, unique=True, verbose_name='اسم الفرع')
    city        = models.CharField(max_length=100, blank=True, verbose_name='المدينة')
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


class SiteSettings(models.Model):
    """صف واحد فقط (Singleton) — معلومات المركز الظاهرة في المستندات الرسمية مثل إشعار القبول."""
    center_name_ar = models.CharField(max_length=200, default='مركز رؤية للتأهيل', verbose_name='اسم المركز (عربي)')
    center_name_en = models.CharField(max_length=200, blank=True, default='Roya Rehabilitation Center', verbose_name='اسم المركز (إنجليزي)')
    phone          = models.CharField(max_length=20,  blank=True, verbose_name='رقم التواصل')
    email          = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    website        = models.CharField(max_length=200, blank=True, verbose_name='الموقع الإلكتروني')
    address        = models.CharField(max_length=300, blank=True, verbose_name='العنوان')
    logo           = models.ImageField(upload_to='site/', null=True, blank=True, verbose_name='الشعار')
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'إعدادات المركز'
        verbose_name_plural  = 'إعدادات المركز'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.center_name_ar or 'إعدادات المركز'


class Bus(models.Model):
    chassis_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الهيكل')
    plate_number   = models.CharField(max_length=20,  unique=True, verbose_name='رقم اللوحة')
    brand          = models.CharField(max_length=100, verbose_name='ماركة المركبة')
    manufacture_year = models.PositiveIntegerField(verbose_name='سنة الصنع')
    serial_number  = models.CharField(max_length=50, blank=True, verbose_name='الرقم التسلسلي')
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE,
        related_name='buses', verbose_name='الفرع',
    )
    registration_expiry = models.DateField(verbose_name='تاريخ انتهاء الاستمارة')
    inspection_expiry   = models.DateField(verbose_name='تاريخ انتهاء الفحص الدوري')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'باص'
        verbose_name_plural  = 'الباصات'
        ordering             = ['-created_at']

    def __str__(self):
        return f'{self.brand} — {self.plate_number}'


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
