from django.db import models
from django.utils import timezone


class Student(models.Model):
    class Status(models.TextChoices):
        PENDING     = 'pending',     'في انتظار القبول'
        ACTIVE      = 'active',      'نشط'
        INACTIVE    = 'inactive',    'غير نشط'
        GRADUATED   = 'graduated',   'خرّيج'
        SUSPENDED   = 'suspended',   'موقوف'
        TRANSFERRED = 'transferred', 'محوّل'

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
    disability_type = models.CharField(
        max_length=30, choices=DisabilityType.choices,
        blank=True, verbose_name='نوع الإعاقة',
    )
    disability_degree = models.CharField(
        max_length=20, choices=DisabilityDegree.choices,
        blank=True, verbose_name='درجة الإعاقة',
    )
    diagnosis = models.TextField(blank=True, verbose_name='التشخيص التفصيلي')

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
            models.Index(fields=['disability_type']),
        ]

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.grandfather_name, self.family_name]
        return ' '.join(p for p in parts if p)

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
            year = timezone.now().year
            count = Student.objects.filter(
                file_number__startswith=f'RW-{year}-'
            ).count() + 1
            self.file_number = f"RW-{year}-{count:04d}"
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
