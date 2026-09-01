from django.db import models


class Assessment(models.Model):
    """مقياس/اختبار — قالب عام يُنشئه المستخدم (اسم بورتيج، تيتش، ...الخ)."""
    name        = models.CharField(max_length=200, unique=True, verbose_name='اسم المقياس')
    description = models.TextField(blank=True, verbose_name='وصف')
    is_active   = models.BooleanField(default=True, verbose_name='نشط')
    created_by  = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_assessments', verbose_name='أُنشئ بواسطة',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'مقياس'
        verbose_name_plural  = 'المقاييس'
        ordering             = ['name']

    def __str__(self):
        return self.name


class AssessmentSection(models.Model):
    """قسم اختياري داخل المقياس (فئة عمرية مثلًا)."""
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE,
        related_name='sections', verbose_name='المقياس',
    )
    name  = models.CharField(max_length=200, verbose_name='اسم القسم')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        verbose_name        = 'قسم المقياس'
        verbose_name_plural  = 'أقسام المقياس'
        ordering             = ['order']

    def __str__(self):
        return f'{self.assessment.name} — {self.name}'


class AssessmentQuestion(models.Model):
    """مهارة/سؤال واحد ضمن المقياس، وقد ينتمي لقسم."""
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE,
        related_name='questions', verbose_name='المقياس',
    )
    section = models.ForeignKey(
        AssessmentSection, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='questions', verbose_name='القسم',
    )
    text  = models.TextField(verbose_name='نص المهارة/السؤال')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        verbose_name        = 'سؤال المقياس'
        verbose_name_plural  = 'أسئلة المقياس'
        ordering             = ['order']

    def __str__(self):
        return self.text[:60]


class AssessmentScaleOption(models.Model):
    """خيار إجابة (قبلي أو بعدي) — يُشارَك بين كل أسئلة المقياس."""
    class Kind(models.TextChoices):
        PRE  = 'pre',  'قبلي'
        POST = 'post', 'بعدي'

    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE,
        related_name='scale_options', verbose_name='المقياس',
    )
    kind  = models.CharField(max_length=4, choices=Kind.choices, verbose_name='النوع')
    label = models.CharField(max_length=100, verbose_name='التسمية')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        verbose_name        = 'خيار تقدير'
        verbose_name_plural  = 'خيارات التقدير'
        ordering             = ['kind', 'order']

    def __str__(self):
        return f'{self.assessment.name} — {self.get_kind_display()} — {self.label}'


class StudentAssessment(models.Model):
    """تطبيق مقياس على طالب معيّن — بداية تقييم بتاريخ محدد (يمكن تكراره لاحقًا لإعادة التقييم)."""
    student = models.ForeignKey(
        'students.Student', on_delete=models.CASCADE,
        related_name='assessments', verbose_name='المستفيد',
    )
    assessment = models.ForeignKey(
        Assessment, on_delete=models.PROTECT,
        related_name='student_assessments', verbose_name='المقياس',
    )
    started_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='started_assessments', verbose_name='بدأه',
    )
    started_at = models.DateField(verbose_name='تاريخ البدء')
    notes      = models.TextField(blank=True, verbose_name='ملاحظات عامة')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'تقييم طالب'
        verbose_name_plural  = 'تقييمات الطلاب'
        ordering             = ['-started_at']

    def __str__(self):
        return f'{self.student.full_name} — {self.assessment.name} — {self.started_at}'


class StudentAssessmentAnswer(models.Model):
    """إجابة سؤال واحد ضمن تقييم طالب: تقدير قبلي + خطة تطبيق + تقدير بعدي."""
    student_assessment = models.ForeignKey(
        StudentAssessment, on_delete=models.CASCADE,
        related_name='answers', verbose_name='التقييم',
    )
    question = models.ForeignKey(
        AssessmentQuestion, on_delete=models.PROTECT,
        related_name='answers', verbose_name='السؤال',
    )
    pre_rating = models.ForeignKey(
        AssessmentScaleOption, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pre_answers', verbose_name='التقدير القبلي',
    )
    plan_text = models.TextField(blank=True, verbose_name='خطة التطبيق')
    post_rating = models.ForeignKey(
        AssessmentScaleOption, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='post_answers', verbose_name='التقدير البعدي',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'إجابة'
        verbose_name_plural  = 'الإجابات'
        unique_together      = ('student_assessment', 'question')

    def __str__(self):
        return f'{self.student_assessment} — {self.question_id}'
