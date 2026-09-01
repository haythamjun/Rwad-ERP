from django.db.models import ProtectedError
from rest_framework import serializers

from .models import (
    Assessment, AssessmentSection, AssessmentQuestion,
    AssessmentScaleOption, StudentAssessment, StudentAssessmentAnswer,
)


# ── مكتبة المقاييس (بناء/تعديل) ──────────────────────────────────────────────

class AssessmentQuestionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model  = AssessmentQuestion
        fields = ['id', 'text', 'order']


class AssessmentSectionSerializer(serializers.ModelSerializer):
    id        = serializers.IntegerField(required=False)
    questions = AssessmentQuestionSerializer(many=True, required=False)

    class Meta:
        model  = AssessmentSection
        fields = ['id', 'name', 'order', 'questions']


class AssessmentScaleOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model  = AssessmentScaleOption
        fields = ['id', 'kind', 'label', 'order']


class AssessmentBuilderSerializer(serializers.ModelSerializer):
    """بناء/تعديل مقياس كامل بطلب واحد (أقسام ← أسئلة، وخيارات التقدير) — للمدير فقط."""
    created_by_name = serializers.SerializerMethodField()
    sections        = AssessmentSectionSerializer(many=True, required=False)
    questions       = AssessmentQuestionSerializer(many=True, required=False)  # أسئلة بلا قسم
    scale_options   = AssessmentScaleOptionSerializer(many=True, required=False)

    class Meta:
        model  = Assessment
        fields = [
            'id', 'name', 'description', 'is_active',
            'created_by', 'created_by_name', 'sections', 'questions',
            'scale_options', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    # ── upsert helpers ──────────────────────────────────────────────────────
    @staticmethod
    def _sync_questions(assessment, section, questions_data):
        qs = AssessmentQuestion.objects.filter(assessment=assessment, section=section)
        existing = {q.id: q for q in qs}
        seen = set()
        for q_data in questions_data:
            q_id = q_data.get('id')
            if q_id and q_id in existing:
                q = existing[q_id]
                q.text  = q_data.get('text', q.text)
                q.order = q_data.get('order', q.order)
                q.save()
            else:
                q = AssessmentQuestion.objects.create(
                    assessment=assessment, section=section,
                    text=q_data.get('text', ''), order=q_data.get('order', 0),
                )
            seen.add(q.id)
        for qid, q in existing.items():
            if qid not in seen:
                try:
                    q.delete()
                except ProtectedError:
                    raise serializers.ValidationError(
                        f'لا يمكن حذف السؤال "{q.text[:40]}" لوجود إجابات مسجّلة عليه لطلاب.'
                    )

    def _sync_sections(self, assessment, sections_data):
        existing = {s.id: s for s in assessment.sections.all()}
        seen = set()
        for sec_data in sections_data:
            questions_data = sec_data.pop('questions', [])
            sec_id = sec_data.get('id')
            if sec_id and sec_id in existing:
                section = existing[sec_id]
                section.name  = sec_data.get('name', section.name)
                section.order = sec_data.get('order', section.order)
                section.save()
            else:
                section = AssessmentSection.objects.create(
                    assessment=assessment,
                    name=sec_data.get('name', ''), order=sec_data.get('order', 0),
                )
            seen.add(section.id)
            self._sync_questions(assessment, section, questions_data)
        for sid, section in existing.items():
            if sid not in seen:
                self._sync_questions(assessment, section, [])  # يحذف كل أسئلته أولًا
                section.delete()

    @staticmethod
    def _sync_scale_options(assessment, options_data):
        existing = {o.id: o for o in assessment.scale_options.all()}
        seen = set()
        for o_data in options_data:
            o_id = o_data.get('id')
            if o_id and o_id in existing:
                o = existing[o_id]
                o.kind  = o_data.get('kind', o.kind)
                o.label = o_data.get('label', o.label)
                o.order = o_data.get('order', o.order)
                o.save()
            else:
                o = AssessmentScaleOption.objects.create(
                    assessment=assessment, kind=o_data.get('kind'),
                    label=o_data.get('label', ''), order=o_data.get('order', 0),
                )
            seen.add(o.id)
        for oid, o in existing.items():
            if oid not in seen:
                o.delete()

    def create(self, validated_data):
        sections_data      = validated_data.pop('sections', [])
        loose_questions     = validated_data.pop('questions', [])
        scale_options_data = validated_data.pop('scale_options', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        assessment = Assessment.objects.create(**validated_data)
        self._sync_sections(assessment, sections_data)
        self._sync_questions(assessment, None, loose_questions)
        self._sync_scale_options(assessment, scale_options_data)
        return assessment

    def update(self, instance, validated_data):
        sections_data       = validated_data.pop('sections', None)
        loose_questions      = validated_data.pop('questions', None)
        scale_options_data  = validated_data.pop('scale_options', None)
        instance = super().update(instance, validated_data)
        if sections_data is not None:
            self._sync_sections(instance, sections_data)
        if loose_questions is not None:
            self._sync_questions(instance, None, loose_questions)
        if scale_options_data is not None:
            self._sync_scale_options(instance, scale_options_data)
        return instance


class AssessmentListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    section_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Assessment
        fields = [
            'id', 'name', 'description', 'is_active',
            'section_count', 'question_count', 'created_at',
        ]

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_section_count(self, obj):
        return obj.sections.count()


class AssessmentDetailReadSerializer(serializers.ModelSerializer):
    """قراءة متداخلة كاملة — لعرض/تعبئة نموذج التقييم."""
    sections  = AssessmentSectionSerializer(many=True, read_only=True)
    questions = AssessmentQuestionSerializer(many=True, read_only=True)  # أسئلة بلا قسم
    pre_options  = serializers.SerializerMethodField()
    post_options = serializers.SerializerMethodField()

    class Meta:
        model  = Assessment
        fields = [
            'id', 'name', 'description', 'is_active',
            'sections', 'questions', 'pre_options', 'post_options',
        ]

    def get_pre_options(self, obj):
        return AssessmentScaleOptionSerializer(
            obj.scale_options.filter(kind=AssessmentScaleOption.Kind.PRE), many=True
        ).data

    def get_post_options(self, obj):
        return AssessmentScaleOptionSerializer(
            obj.scale_options.filter(kind=AssessmentScaleOption.Kind.POST), many=True
        ).data


# ── تقييمات الطلاب ────────────────────────────────────────────────────────────

class StudentAssessmentAnswerSerializer(serializers.ModelSerializer):
    question_text    = serializers.CharField(source='question.text', read_only=True)
    # ملاحظة: SerializerMethodField متعمَّد هنا وليس CharField(source=..., default=None) —
    # في طلبات PATCH (partial=True) يتجاهل DRF قيمة default عند فشل السلسلة المنقطة
    # (source='post_rating.label' والقيمة None) ويحذف الحقل من الاستجابة بدل إرجاع null.
    pre_rating_label  = serializers.SerializerMethodField()
    post_rating_label = serializers.SerializerMethodField()

    class Meta:
        model  = StudentAssessmentAnswer
        fields = [
            'id', 'question', 'question_text', 'pre_rating', 'pre_rating_label',
            'plan_text', 'post_rating', 'post_rating_label', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def get_pre_rating_label(self, obj):
        return obj.pre_rating.label if obj.pre_rating_id else None

    def get_post_rating_label(self, obj):
        return obj.post_rating.label if obj.post_rating_id else None


class StudentAssessmentSerializer(serializers.ModelSerializer):
    student_name      = serializers.CharField(source='student.full_name', read_only=True)
    assessment_name   = serializers.CharField(source='assessment.name', read_only=True)
    started_by_name   = serializers.SerializerMethodField()
    answers           = StudentAssessmentAnswerSerializer(many=True, required=False)

    class Meta:
        model  = StudentAssessment
        fields = [
            'id', 'student', 'student_name', 'assessment', 'assessment_name',
            'started_by', 'started_by_name', 'started_at', 'notes',
            'answers', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'started_by', 'created_at', 'updated_at']
        # نفس حيلة الحضور/الجدول/الطبي — الطالب يُملأ من الـ URL لا الـ body
        extra_kwargs = {'student': {'required': False}}
        validators = []

    def get_started_by_name(self, obj):
        if obj.started_by:
            return obj.started_by.get_full_name() or obj.started_by.username
        return None

    def _validate_ratings(self, assessment, rec):
        pre  = rec.get('pre_rating')
        post = rec.get('post_rating')
        if pre and (pre.assessment_id != assessment.id or pre.kind != AssessmentScaleOption.Kind.PRE):
            raise serializers.ValidationError('التقدير القبلي المُختار لا ينتمي لهذا المقياس.')
        if post and (post.assessment_id != assessment.id or post.kind != AssessmentScaleOption.Kind.POST):
            raise serializers.ValidationError('التقدير البعدي المُختار لا ينتمي لهذا المقياس.')

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['started_by'] = request.user
        student_assessment = StudentAssessment.objects.create(**validated_data)
        for rec in answers_data:
            self._validate_ratings(student_assessment.assessment, rec)
            StudentAssessmentAnswer.objects.create(student_assessment=student_assessment, **rec)
        return student_assessment

    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)
        instance = super().update(instance, validated_data)
        if answers_data is not None:
            existing = {a.question_id: a for a in instance.answers.all()}
            for rec in answers_data:
                self._validate_ratings(instance.assessment, rec)
                question = rec.get('question')
                if question and question.id in existing:
                    row = existing[question.id]
                    row.pre_rating  = rec.get('pre_rating', row.pre_rating)
                    row.plan_text   = rec.get('plan_text', row.plan_text)
                    row.post_rating = rec.get('post_rating', row.post_rating)
                    row.save()
                elif question:
                    StudentAssessmentAnswer.objects.create(student_assessment=instance, **rec)
        return instance
