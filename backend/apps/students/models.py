from django.db import models, transaction
from django.utils import timezone


class Student(models.Model):
    class Status(models.TextChoices):
        PENDING     = 'pending',     'في انتظار القبول'
        ACTIVE      = 'active',      'نشط'
        INACTIVE    = 'inactive',    'غير نشط'
        GRADUATED   = 'graduated',   'خرّيج'
        SUSPENDED   = 'suspended',   'موقوف'
        TRANSFERRED = 'transferred', 'محوّل'
        REJECTED    = 'rejected',    'مرفوض'

    class Gender(models.TextChoices):
        MALE   = 'male',   'ذكر'
        FEMALE = 'female', 'أنثى'

    class DisabilityType(models.TextChoices):
        INTELLECTUAL = 'intellectual', 'إعاقة ذهنية'
        AUTISM       = 'autism',       'طيف التوحد'
        DOWN         = 'down',         'متلازمة داون'
        PHYSICAL     = 'physical',     'إعاقة حركية'
        HEARING      = 'hearing',      'إعاقة سمعية'
        VISUAL       = 'visual',       'إعاقة بصرية'
        SPEECH       = 'speech',       'إعاقة لغوية / نطقية'
        LEARNING     = 'learning',     'صعوبات تعلم'
        BEHAVIORAL   = 'behavioral',   'اضطراب سلوكي'
        MULTIPLE     = 'multiple',     'إعاقة مركّبة'
        OTHER        = 'other',        'أخرى'

    class DisabilityDegree(models.TextChoices):
        MILD     = 'mild',     'بسيطة'
        MODERATE = 'moderate', 'متوسطة'
        SEVERE   = 'severe',   'شديدة'
        PROFOUND = 'profound', 'شديدة جداً'

    class EducationalLevel(models.TextChoices):
        NONE         = 'none',         'لا يتعلم'
        KINDERGARTEN = 'kindergarten', 'رياض أطفال'
        ELEMENTARY   = 'elementary',   'ابتدائي'
        INTERMEDIATE = 'intermediate', 'متوسط'
        SECONDARY    = 'secondary',    'ثانوي'
        UNIVERSITY   = 'university',   'جامعي'
        SPECIAL      = 'special',      'برنامج تربية خاصة'

    class ReferralSource(models.TextChoices):
        HOSPITAL   = 'hospital',   'مستشفى / عيادة'
        SCHOOL     = 'school',     'مدرسة'
        FAMILY     = 'family',     'الأسرة مباشرة'
        NGO        = 'ngo',        'جمعية / مؤسسة'
        MINISTRY   = 'ministry',   'وزارة / جهة حكومية'
        SPECIALIST = 'specialist', 'طبيب / معالج'
        OTHER      = 'other',      'أخرى'

    # ── بيانات التعريف ─────────────────────────────────────────────────
    file_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name='رقم الملف'
    )
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='students',
        verbose_name='الفرع',
    )
    bus = models.ForeignKey(
        'core.Bus',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='students',
        verbose_name='الباص',
    )
    registration_date = models.DateField(
        default=timezone.now, verbose_name='تاريخ التسجيل'
    )

    # ── البيانات الشخصية ───────────────────────────────────────────────
    first_name       = models.CharField(max_length=50, verbose_name='الاسم الأول')
    middle_name      = models.CharField(max_length=50, blank=True, default='', verbose_name='اسم الأب')
    grandfather_name = models.CharField(max_length=50, blank=True, default='', verbose_name='اسم الجد')
    family_name      = models.CharField(max_length=50, verbose_name='اسم العائلة')
    national_id = models.CharField(
        max_length=20, unique=True, verbose_name='رقم الهوية / الإقامة'
    )
    date_of_birth = models.DateField(verbose_name='تاريخ الميلاد')
    gender        = models.CharField(
        max_length=10, choices=Gender.choices, verbose_name='الجنس'
    )
    nationality = models.CharField(max_length=100, verbose_name='الجنسية')
    photo = models.ImageField(
        upload_to='students/photos/%Y/%m/',
        null=True, blank=True,
        verbose_name='صورة المستفيد',
    )

    # ── الإعاقة والتشخيص ──────────────────────────────────────────────
    # قائمة كائنات: [{'type': 'autism', 'degree': 'moderate'}, ...] — كل نوع إعاقة
    # له درجته الخاصة (بدل درجة واحدة عامة تنطبق على كل الأنواع المختارة).
    disability_type = models.JSONField(
        default=list, verbose_name='نوع الإعاقة ودرجتها',
    )
    diagnosis = models.TextField(blank=True, verbose_name='التشخيص التفصيلي')
    iq_score = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='درجة الذكاء',
    )

    # ── المعلومات التعليمية ────────────────────────────────────────────
    educational_level = models.CharField(
        max_length=20, choices=EducationalLevel.choices,
        blank=True, verbose_name='المستوى التعليمي',
    )
    school_name = models.CharField(
        max_length=200, blank=True, verbose_name='اسم المدرسة / المؤسسة التعليمية'
    )
    grade = models.CharField(
        max_length=50, blank=True, verbose_name='الصف / المرحلة'
    )

    # ── جهة الإحالة ───────────────────────────────────────────────────
    referral_source = models.CharField(
        max_length=20, choices=ReferralSource.choices,
        blank=True, verbose_name='جهة الإحالة',
    )
    referral_source_detail = models.CharField(
        max_length=200, blank=True, verbose_name='تفاصيل جهة الإحالة'
    )

    # ── الحالة والملاحظات ─────────────────────────────────────────────
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDING, verbose_name='الحالة',
    )
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    # ── بيانات النظام ─────────────────────────────────────────────────
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_students',
        verbose_name='أضيف بواسطة',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'مستفيد'
        verbose_name_plural = 'المستفيدون'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file_number']),
            models.Index(fields=['national_id']),
            models.Index(fields=['status']),
            models.Index(fields=['first_name']),
            models.Index(fields=['family_name']),

        ]

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.grandfather_name, self.family_name]
        return ' '.join(p for p in parts if p)

    @property
    def disability_display(self):
        """Comma-joined 'نوع (درجة)' pairs, e.g. 'طيف التوحد (متوسطة)، إعاقة حركية (شديدة)'."""
        type_map   = dict(self.DisabilityType.choices)
        degree_map = dict(self.DisabilityDegree.choices)
        entries = self.disability_type if isinstance(self.disability_type, list) else []
        parts = []
        for e in entries:
            if isinstance(e, dict):
                t, d = e.get('type', ''), e.get('degree', '')
            else:
                t, d = e, ''  # شكل قديم (نص فقط) — شبكة أمان
            if not t:
                continue
            label = type_map.get(t, t)
            if d:
                label += f' ({degree_map.get(d, d)})'
            parts.append(label)
        return '، '.join(parts)

    def __str__(self):
        return f"{self.full_name} ({self.file_number})"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )

    def save(self, *args, **kwargs):
        if not self.file_number:
            with transaction.atomic():
                year = timezone.now().year
                prefix = f'RW-{year}-'
                max_fn = (
                    Student.objects
                    .select_for_update()
                    .filter(file_number__startswith=prefix)
                    .order_by('-file_number')
                    .values_list('file_number', flat=True)
                    .first()
                )
                if max_fn:
                    try:
                        num = int(max_fn[len(prefix):]) + 1
                    except (ValueError, IndexError):
                        num = 1
                else:
                    num = 1
                self.file_number = f"{prefix}{num:04d}"
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)


class Guardian(models.Model):
    class Relationship(models.TextChoices):
        FATHER      = 'father',      'أب'
        MOTHER      = 'mother',      'أم'
        BROTHER     = 'brother',     'أخ'
        SISTER      = 'sister',      'أخت'
        GRANDFATHER = 'grandfather', 'جد'
        GRANDMOTHER = 'grandmother', 'جدة'
        UNCLE       = 'uncle',       'عم / خال'
        AUNT        = 'aunt',        'عمة / خالة'
        OTHER       = 'other',       'أخرى'

    student            = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='guardians', verbose_name='المستفيد',
    )
    full_name          = models.CharField(max_length=200, verbose_name='اسم ولي الأمر')
    relationship       = models.CharField(
        max_length=20, choices=Relationship.choices, verbose_name='صلة القرابة'
    )
    national_id        = models.CharField(max_length=20, blank=True, verbose_name='رقم الهوية')
    phone              = models.CharField(max_length=20, verbose_name='رقم الجوال')
    phone_alt          = models.CharField(max_length=20, blank=True, verbose_name='رقم جوال إضافي')
    email              = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    address            = models.TextField(blank=True, verbose_name='العنوان')
    is_primary_contact = models.BooleanField(default=False, verbose_name='جهة التواصل الرئيسية')
    notes              = models.TextField(blank=True, verbose_name='ملاحظات')
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'ولي أمر'
        verbose_name_plural = 'أولياء الأمور'

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_display()}) — {self.student.full_name}"

    def save(self, *args, **kwargs):
        if self.is_primary_contact:
            Guardian.objects.filter(
                student=self.student, is_primary_contact=True
            ).exclude(pk=self.pk).update(is_primary_contact=False)
        super().save(*args, **kwargs)


class FamilyInfo(models.Model):
    class ParentsStatus(models.TextChoices):
        MARRIED         = 'married',         'متزوجان'
        DIVORCED        = 'divorced',         'مطلقان'
        FATHER_DECEASED = 'father_deceased',  'الأب متوفى'
        MOTHER_DECEASED = 'mother_deceased',  'الأم متوفاة'
        BOTH_DECEASED   = 'both_deceased',    'كلاهما متوفى'
        SEPARATED       = 'separated',        'منفصلان'

    class HousingType(models.TextChoices):
        OWNED      = 'owned',      'ملك'
        RENTED     = 'rented',     'إيجار'
        RELATIVE   = 'relative',   'مع الأقارب'
        GOVERNMENT = 'government', 'سكن حكومي'
        OTHER      = 'other',      'أخرى'

    class IncomeRange(models.TextChoices):
        VERY_LOW  = 'very_low',  'أقل من 3,000 ريال'
        LOW       = 'low',       '3,000 – 6,000 ريال'
        MEDIUM    = 'medium',    '6,000 – 10,000 ريال'
        HIGH      = 'high',      '10,000 – 20,000 ريال'
        VERY_HIGH = 'very_high', 'أكثر من 20,000 ريال'

    student        = models.OneToOneField(
        Student, on_delete=models.CASCADE,
        related_name='family_info', verbose_name='المستفيد',
    )
    family_size    = models.PositiveIntegerField(verbose_name='عدد أفراد الأسرة')
    sibling_order  = models.PositiveIntegerField(verbose_name='ترتيب المستفيد بين الإخوة')
    parents_status = models.CharField(
        max_length=20, choices=ParentsStatus.choices, verbose_name='حالة الوالدين'
    )
    income_range   = models.CharField(
        max_length=20, choices=IncomeRange.choices,
        blank=True, verbose_name='الدخل الشهري التقريبي',
    )
    monthly_income = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='الدخل الشهري (بالرقم)'
    )
    housing_type   = models.CharField(
        max_length=20, choices=HousingType.choices,
        blank=True, verbose_name='نوع السكن',
    )
    other_special_needs = models.BooleanField(
        default=False, verbose_name='يوجد أفراد آخرون بحاجات خاصة في الأسرة'
    )
    social_notes   = models.TextField(blank=True, verbose_name='ملاحظات اجتماعية')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'دراسة الحالة الاجتماعية'
        verbose_name_plural = 'دراسات الحالة الاجتماعية'

    def __str__(self):
        return f"أسرة {self.student.full_name}"


class StudentAttachment(models.Model):
    class AttachmentType(models.TextChoices):
        NATIONAL_ID          = 'national_id',          'صورة الهوية'
        BIRTH_CERTIFICATE    = 'birth_certificate',    'شهادة الميلاد'
        FAMILY_CARD          = 'family_card',          'كرت العائلة'
        MEDICAL_REPORT       = 'medical_report',       'تقرير طبي'
        PSYCHOLOGICAL_REPORT = 'psychological_report', 'تقرير نفسي'
        DISABILITY_CARD      = 'disability_card',      'بطاقة إعاقة'
        REFERRAL_LETTER      = 'referral_letter',      'خطاب إحالة'
        OTHER                = 'other',                'أخرى'

    student         = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='attachments', verbose_name='المستفيد',
    )
    attachment_type = models.CharField(
        max_length=30, choices=AttachmentType.choices, verbose_name='نوع المرفق'
    )
    file            = models.FileField(
        upload_to='students/attachments/%Y/%m/', verbose_name='الملف'
    )
    name            = models.CharField(max_length=200, verbose_name='اسم المرفق')
    uploaded_by     = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='رُفع بواسطة',
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'مرفق'
        verbose_name_plural = 'المرفقات'

    def __str__(self):
        return f"{self.name} — {self.student.full_name}"


class StudentAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT         = 'present',         'حاضر'
        ABSENT          = 'absent',          'غائب'
        LATE            = 'late',            'متأخر'
        EXCUSED_ABSENCE = 'excused_absence', 'غياب بعذر'
        EARLY_LEAVE     = 'early_leave',     'انصراف مبكر'

    student        = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='attendances', verbose_name='المستفيد',
    )
    branch         = models.ForeignKey(
        'core.Branch', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='attendances', verbose_name='الفرع',
    )
    attendance_date   = models.DateField(verbose_name='تاريخ الحضور')
    check_in_time     = models.TimeField(null=True, blank=True, verbose_name='وقت الحضور')
    check_out_time    = models.TimeField(null=True, blank=True, verbose_name='وقت الانصراف')
    status            = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PRESENT,
        verbose_name='الحالة',
    )
    absence_reason    = models.TextField(blank=True, verbose_name='سبب الغياب')
    late_reason       = models.TextField(blank=True, verbose_name='سبب التأخر')
    early_leave_reason= models.TextField(blank=True, verbose_name='سبب الانصراف المبكر')
    guardian_notified = models.BooleanField(default=False, verbose_name='تم إخطار ولي الأمر')
    notification_notes= models.TextField(blank=True, verbose_name='ملاحظات الإخطار')
    notes             = models.TextField(blank=True, verbose_name='ملاحظات')
    recorded_by       = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='recorded_attendances', verbose_name='سُجّل بواسطة',
    )
    updated_by        = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='updated_attendances', verbose_name='عُدِّل بواسطة',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'سجل حضور'
        verbose_name_plural = 'سجلات الحضور'
        ordering            = ['-attendance_date', '-created_at']
        unique_together     = ('student', 'attendance_date')

    def __str__(self):
        return f"{self.student.full_name} | {self.attendance_date} | {self.get_status_display()}"


# ── الجدول الدراسي الأسبوعي ──────────────────────────────────────────────────────

# فترات الجدول الثابتة: 8 حصص نصف ساعة، من 7:30 حتى 11:30
from datetime import time as _time  # noqa: E402
SCHEDULE_TIME_SLOTS = [
    _time(7, 30), _time(8, 0), _time(8, 30), _time(9, 0),
    _time(9, 30), _time(10, 0), _time(10, 30), _time(11, 0),
]


class StudentSchedule(models.Model):
    """حصة واحدة (خلية) في الجدول الدراسي الأسبوعي المتكرر لطالب معيّن."""

    class Day(models.TextChoices):
        SUNDAY    = 'sunday',    'الأحد'
        MONDAY    = 'monday',    'الاثنين'
        TUESDAY   = 'tuesday',   'الثلاثاء'
        WEDNESDAY = 'wednesday', 'الأربعاء'
        THURSDAY  = 'thursday',  'الخميس'

    student    = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='schedule_slots', verbose_name='المستفيد',
    )
    day        = models.CharField(max_length=10, choices=Day.choices, verbose_name='اليوم')
    start_time = models.TimeField(verbose_name='وقت البداية')
    subject    = models.CharField(max_length=100, verbose_name='المادة / الحصة')
    specialist = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='schedule_slots', verbose_name='الأخصائي المسؤول',
    )
    notes      = models.CharField(max_length=200, blank=True, verbose_name='ملاحظات')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'حصة'
        verbose_name_plural  = 'الجدول الدراسي'
        ordering             = ['day', 'start_time']
        unique_together      = ('student', 'day', 'start_time')

    def __str__(self):
        return f"{self.student.full_name} | {self.get_day_display()} {self.start_time} | {self.subject}"


# ── الملف الطبي ───────────────────────────────────────────────────────────────

class StudentMedicalProfile(models.Model):
    """بيانات طبية شبه ثابتة — تُعدَّل نادرًا، بخلاف التشيك إن اليومي."""
    student         = models.OneToOneField(
        Student, on_delete=models.CASCADE,
        related_name='medical_profile', verbose_name='المستفيد',
    )
    height_cm       = models.PositiveIntegerField(null=True, blank=True, verbose_name='الطول (سم)')
    weight_kg       = models.PositiveIntegerField(null=True, blank=True, verbose_name='الوزن (كجم)')
    chronic_disease = models.TextField(blank=True, verbose_name='الأمراض المزمنة')
    medical_allergy = models.TextField(blank=True, verbose_name='الحساسية الطبية')
    food_allergy    = models.TextField(blank=True, verbose_name='الحساسية الغذائية')
    has_seizures    = models.BooleanField(default=False, verbose_name='يعاني من تشنجات')
    uses_nebulizer  = models.BooleanField(default=False, verbose_name='يستخدم جهاز الاستنشاق')
    notes           = models.TextField(blank=True, verbose_name='ملاحظات إضافية')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'ملف طبي'
        verbose_name_plural  = 'الملفات الطبية'

    def __str__(self):
        return f'الملف الطبي — {self.student.full_name}'


class MedicalVisit(models.Model):
    """سجل زيارات التقييم الدورية (مستقر / غير مستقر)."""
    class Status(models.TextChoices):
        STABLE   = 'stable',   'مستقر'
        UNSTABLE = 'unstable', 'غير مستقر'

    student      = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='medical_visits', verbose_name='المستفيد',
    )
    visit_date   = models.DateField(verbose_name='تاريخ الزيارة')
    status       = models.CharField(max_length=10, choices=Status.choices, verbose_name='الحالة')
    notes        = models.TextField(blank=True, verbose_name='ملاحظات')
    evaluated_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='medical_visits', verbose_name='قُيِّم بواسطة',
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'زيارة تقييم طبي'
        verbose_name_plural  = 'زيارات التقييم الطبي'
        ordering             = ['-visit_date']

    def __str__(self):
        return f'{self.student.full_name} — {self.visit_date} — {self.get_status_display()}'


class Medication(models.Model):
    """قائمة الأدوية الثابتة لكل طالب — يُبنى عليها التشيك إن اليومي."""
    student    = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='medications', verbose_name='المستفيد',
    )
    name       = models.CharField(max_length=150, verbose_name='اسم الدواء')
    dose       = models.CharField(max_length=100, blank=True, verbose_name='الجرعة')
    frequency  = models.CharField(max_length=100, blank=True, verbose_name='عدد المرات باليوم')
    notes      = models.TextField(blank=True, verbose_name='ملاحظات')
    is_active  = models.BooleanField(default=True, verbose_name='نشط')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'دواء'
        verbose_name_plural  = 'الأدوية'
        ordering             = ['-is_active', 'name']

    def __str__(self):
        return f'{self.name} — {self.student.full_name}'


class DailyMedicalCheckIn(models.Model):
    """تشيك إن طبي واحد لكل طالب في اليوم — منفصل تمامًا عن حضور/غياب الطالب العام."""
    student    = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='medical_checkins', verbose_name='المستفيد',
    )
    check_date = models.DateField(verbose_name='التاريخ')
    check_time = models.TimeField(null=True, blank=True, verbose_name='وقت الوصول')
    # القياسات الأساسية — تُقاس مرة واحدة يوميًا مع الوصول
    blood_pressure_systolic  = models.PositiveIntegerField(null=True, blank=True, verbose_name='الضغط الانقباضي')
    blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True, verbose_name='الضغط الانبساطي')
    blood_sugar  = models.PositiveIntegerField(null=True, blank=True, verbose_name='سكر الدم')
    weight_kg    = models.PositiveIntegerField(null=True, blank=True, verbose_name='الوزن (كجم)')
    temperature  = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name='درجة الحرارة')
    pulse        = models.PositiveIntegerField(null=True, blank=True, verbose_name='النبض')
    notes      = models.TextField(blank=True, verbose_name='ملاحظات')
    checked_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='medical_checkins', verbose_name='سُجِّل بواسطة',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'تشيك إن طبي'
        verbose_name_plural  = 'التشيك إن الطبي'
        ordering             = ['-check_date']
        unique_together      = ('student', 'check_date')

    def __str__(self):
        return f'{self.student.full_name} — {self.check_date}'


class MedicationAdministration(models.Model):
    """هل أُعطي دواء معيّن ضمن تشيك إن يوم معيّن."""
    checkin    = models.ForeignKey(
        DailyMedicalCheckIn, on_delete=models.CASCADE,
        related_name='medication_records', verbose_name='التشيك إن',
    )
    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE,
        related_name='administrations', verbose_name='الدواء',
    )
    given      = models.BooleanField(default=False, verbose_name='أُعطي')
    given_at   = models.TimeField(null=True, blank=True, verbose_name='وقت الإعطاء')
    notes      = models.CharField(max_length=200, blank=True, verbose_name='ملاحظات')

    class Meta:
        verbose_name        = 'إعطاء دواء'
        verbose_name_plural  = 'سجلات إعطاء الأدوية'
        unique_together      = ('checkin', 'medication')

    def __str__(self):
        return f'{self.medication.name} — {"أُعطي" if self.given else "لم يُعطَ"}'


# ── Guardian Portal Auth Token ─────────────────────────────────────────────────

class GuardianAuthToken(models.Model):
    """One-row-per-session token issued to a guardian for the Flutter portal."""
    guardian   = models.ForeignKey(
        Guardian, on_delete=models.CASCADE,
        related_name='auth_tokens', verbose_name='ولي الأمر',
    )
    key        = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'رمز تحقق ولي الأمر'
        verbose_name_plural = 'رموز تحقق أولياء الأمور'

    def save(self, *args, **kwargs):
        if not self.key:
            import secrets
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Token for {self.guardian.full_name}"
