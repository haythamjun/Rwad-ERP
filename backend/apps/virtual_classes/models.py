from django.db import models
from django.utils import timezone

from .storage import get_recordings_storage
from . import zoho


class ZohoAccount(models.Model):
    """حساب Zoho Meeting لمعلم — يربطه المعلم بنفسه مرة (OAuth)، فتُنشأ حصص فصوله
    وتسجيلاتها بحسابه (مضيف مستقل، وحصص متزامنة لمعلمين مختلفين)."""
    user          = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE,
        related_name='zoho_account', verbose_name='المستخدم',
    )
    zuid          = models.CharField(max_length=30, verbose_name='معرّف Zoho')
    zsoid         = models.CharField(max_length=30, blank=True, verbose_name='منظمة Zoho')
    email         = models.EmailField(verbose_name='إيميل Zoho')
    refresh_token = models.CharField(max_length=300)
    connected_at  = models.DateTimeField(auto_now=True, verbose_name='تاريخ الربط')

    class Meta:
        verbose_name        = 'حساب Zoho لمعلم'
        verbose_name_plural = 'حسابات Zoho للمعلمين'

    def __str__(self):
        return f'{self.user} — {self.email}'


class VirtualSession(models.Model):
    """حصة أونلاين لفصل — يقابلها اجتماع في Zoho Meeting يُنشأ تلقائيًا عند الجدولة.
    الحالة المخزّنة مجدولة/ملغاة فقط؛ "جارية" و"منتهية" تُحسب من الوقت."""

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'مجدولة'
        CANCELLED = 'cancelled', 'ملغاة'

    classroom = models.ForeignKey(
        'core.Classroom', on_delete=models.CASCADE,
        related_name='virtual_sessions', verbose_name='الفصل',
    )
    title            = models.CharField(max_length=200, verbose_name='عنوان الحصة')
    starts_at        = models.DateTimeField(verbose_name='وقت البداية')
    duration_minutes = models.PositiveSmallIntegerField(default=45, verbose_name='المدة (دقيقة)')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED, verbose_name='الحالة',
    )

    zoho_meeting_key = models.CharField(max_length=50, blank=True, db_index=True, verbose_name='رقم اجتماع Zoho')
    zoho_join_url    = models.URLField(max_length=500, blank=True, verbose_name='رابط الدخول')
    zoho_start_url   = models.URLField(max_length=500, blank=True, verbose_name='رابط بدء المضيف')
    zoho_password    = models.CharField(max_length=50, blank=True, verbose_name='كلمة مرور الاجتماع')
    # الحساب المضيف — null = حساب المركز. يُثبَّت عند الإنشاء: التعديل والحذف وجلب
    # التسجيلات لازم تتم بنفس الحساب اللي أُنشئ به الاجتماع.
    zoho_account     = models.ForeignKey(
        ZohoAccount, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sessions', verbose_name='حساب Zoho المضيف',
    )

    recordings_checked_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر فحص للتسجيلات')

    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأها',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'حصة افتراضية'
        verbose_name_plural = 'الحصص الافتراضية'
        ordering            = ['-starts_at']

    def __str__(self):
        return f'{self.title} — {self.classroom.name}'

    @property
    def ends_at(self):
        return self.starts_at + timezone.timedelta(minutes=self.duration_minutes)

    @property
    def live_state(self):
        """upcoming / live / ended / cancelled — live تعني ضمن نافذة الدخول."""
        if self.status == self.Status.CANCELLED:
            return 'cancelled'
        opens, closes = zoho.join_window(self.starts_at, self.duration_minutes)
        now = timezone.now()
        if now < opens:
            return 'upcoming'
        if now <= closes:
            return 'live'
        return 'ended'


class SessionRecording(models.Model):
    """تسجيل حصة مؤرشف لدينا. zoho_recording_id فريد — يمنع تكرار الأرشفة."""

    class Status(models.TextChoices):
        PENDING  = 'pending',  'بانتظار الأرشفة'
        ARCHIVED = 'archived', 'مؤرشف'
        FAILED   = 'failed',   'فشل'

    session = models.ForeignKey(
        VirtualSession, on_delete=models.CASCADE,
        related_name='recordings', verbose_name='الحصة',
    )
    zoho_recording_id = models.CharField(max_length=100, unique=True, verbose_name='معرّف التسجيل في Zoho')
    zoho_download_url = models.URLField(max_length=800, blank=True)
    file = models.FileField(
        storage=get_recordings_storage, upload_to='recordings/%Y/%m/',
        blank=True, verbose_name='الملف',
    )
    size_bytes  = models.BigIntegerField(null=True, blank=True, verbose_name='الحجم')
    # remote = R2/S3 (دائم)، local = قرص الخادم (يُمسح مع النشر على Railway) — repair_missing_files
    storage_backend = models.CharField(max_length=10, blank=True, verbose_name='مكان الحفظ')
    recorded_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التسجيل')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة',
    )
    error       = models.TextField(blank=True, verbose_name='آخر خطأ')
    attempts    = models.PositiveSmallIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'تسجيل حصة'
        verbose_name_plural = 'تسجيلات الحصص'
        ordering            = ['-recorded_at', '-created_at']

    def __str__(self):
        return f'تسجيل {self.session}'


class SessionAttendance(models.Model):
    """حضور أونلاين: يُسجَّل عند ضغط ولي الأمر زر الدخول من التطبيق (سجل واحد لكل
    طالب بالحصة، مع عدد مرات الدخول). منفصل عن StudentAttendance اليومي."""
    session = models.ForeignKey(
        VirtualSession, on_delete=models.CASCADE,
        related_name='attendances', verbose_name='الحصة',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.CASCADE,
        related_name='virtual_attendances', verbose_name='الطالب',
    )
    guardian = models.ForeignKey(
        'students.Guardian', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='ولي الأمر',
    )
    first_joined_at = models.DateTimeField(verbose_name='أول دخول')
    last_joined_at  = models.DateTimeField(verbose_name='آخر دخول')
    join_count      = models.PositiveSmallIntegerField(default=1, verbose_name='مرات الدخول')

    class Meta:
        verbose_name        = 'حضور حصة افتراضية'
        verbose_name_plural = 'حضور الحصص الافتراضية'
        unique_together     = ('session', 'student')
        ordering            = ['first_joined_at']

    def __str__(self):
        return f'{self.student} — {self.session}'
