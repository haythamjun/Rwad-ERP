from rest_framework import serializers
from .models import Student, Guardian, FamilyInfo, StudentAttachment, StudentAttendance
from datetime import date


class GuardianSerializer(serializers.ModelSerializer):
    relationship_display = serializers.CharField(
        source='get_relationship_display', read_only=True
    )

    class Meta:
        model  = Guardian
        fields = [
            'id', 'student', 'full_name', 'relationship', 'relationship_display',
            'national_id', 'phone', 'phone_alt', 'email', 'address',
            'is_primary_contact', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'student', 'created_at', 'updated_at']

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError('رقم الجوال يجب أن يكون 10 أرقام.')
        return value

    def validate_phone_alt(self, value):
        if value and (not value.isdigit() or len(value) != 10):
            raise serializers.ValidationError('رقم الجوال الإضافي يجب أن يكون 10 أرقام.')
        return value


class FamilyInfoSerializer(serializers.ModelSerializer):
    parents_status_display = serializers.CharField(
        source='get_parents_status_display', read_only=True
    )
    income_range_display = serializers.CharField(
        source='get_income_range_display', read_only=True
    )
    housing_type_display = serializers.CharField(
        source='get_housing_type_display', read_only=True
    )

    class Meta:
        model  = FamilyInfo
        fields = [
            'id', 'student',
            'family_size', 'sibling_order',
            'parents_status', 'parents_status_display',
            'income_range', 'income_range_display',
            'monthly_income',
            'housing_type', 'housing_type_display',
            'other_special_needs',
            'social_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'student', 'created_at', 'updated_at']

    def validate(self, attrs):
        family_size   = attrs.get('family_size',   getattr(self.instance, 'family_size',   None))
        sibling_order = attrs.get('sibling_order', getattr(self.instance, 'sibling_order', None))
        if family_size is not None and sibling_order is not None:
            if sibling_order > family_size:
                raise serializers.ValidationError(
                    {'sibling_order': 'ترتيب المستفيد لا يمكن أن يكون أكبر من عدد أفراد الأسرة.'}
                )
        return attrs


class StudentAttachmentSerializer(serializers.ModelSerializer):
    attachment_type_display = serializers.CharField(
        source='get_attachment_type_display', read_only=True
    )
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', read_only=True
    )

    class Meta:
        model  = StudentAttachment
        fields = [
            'id', 'student', 'attachment_type', 'attachment_type_display',
            'file', 'name', 'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'student', 'uploaded_by', 'created_at']


class StudentListSerializer(serializers.ModelSerializer):
    full_name                = serializers.CharField(read_only=True)
    status_display           = serializers.CharField(source='get_status_display',           read_only=True)
    gender_display           = serializers.CharField(source='get_gender_display',           read_only=True)
    disability_type_display  = serializers.CharField(source='get_disability_type_display',  read_only=True)
    disability_degree_display= serializers.CharField(source='get_disability_degree_display',read_only=True)
    age                      = serializers.IntegerField(read_only=True)
    primary_guardian         = serializers.SerializerMethodField()
    branch_name              = serializers.CharField(source='branch.name', read_only=True, default=None)

    class Meta:
        model  = Student
        fields = [
            'id', 'file_number',
            'first_name', 'middle_name', 'grandfather_name', 'family_name', 'full_name',
            'national_id',
            'date_of_birth', 'age', 'gender', 'gender_display',
            'nationality', 'status', 'status_display',
            'disability_type', 'disability_type_display',
            'disability_degree', 'disability_degree_display',
            'registration_date', 'photo',
            'branch', 'branch_name',
            'primary_guardian', 'created_at',
        ]

    def get_primary_guardian(self, obj):
        guardian = (
            obj.guardians.filter(is_primary_contact=True).first()
            or obj.guardians.first()
        )
        if guardian:
            return {'name': guardian.full_name, 'phone': guardian.phone}
        return None


class StudentDetailSerializer(serializers.ModelSerializer):
    full_name                = serializers.CharField(read_only=True)
    guardians                = GuardianSerializer(many=True, read_only=True)
    family_info              = FamilyInfoSerializer(read_only=True)
    attachments              = StudentAttachmentSerializer(many=True, read_only=True)
    status_display           = serializers.CharField(source='get_status_display',            read_only=True)
    gender_display           = serializers.CharField(source='get_gender_display',            read_only=True)
    disability_type_display  = serializers.CharField(source='get_disability_type_display',   read_only=True)
    disability_degree_display= serializers.CharField(source='get_disability_degree_display', read_only=True)
    educational_level_display= serializers.CharField(source='get_educational_level_display', read_only=True)
    referral_source_display  = serializers.CharField(source='get_referral_source_display',   read_only=True)
    age                      = serializers.IntegerField(read_only=True)
    created_by_name          = serializers.SerializerMethodField()
    branch_name              = serializers.CharField(source='branch.name', read_only=True, default=None)

    class Meta:
        model  = Student
        fields = [
            'id', 'file_number',
            'first_name', 'middle_name', 'grandfather_name', 'family_name', 'full_name',
            'national_id',
            'date_of_birth', 'age', 'gender', 'gender_display',
            'nationality', 'photo',
            'branch', 'branch_name',
            # إعاقة
            'disability_type', 'disability_type_display',
            'disability_degree', 'disability_degree_display',
            'diagnosis',
            # تعليم
            'educational_level', 'educational_level_display',
            'school_name', 'grade',
            # إحالة
            'referral_source', 'referral_source_display',
            'referral_source_detail',
            # حالة
            'status', 'status_display',
            'registration_date', 'notes',
            # علاقات
            'guardians', 'family_info', 'attachments',
            # نظام
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'file_number', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class StudentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Student
        fields = [
            'first_name', 'middle_name', 'grandfather_name', 'family_name',
            'national_id', 'date_of_birth', 'gender', 'nationality',
            'photo',
            # إعاقة
            'disability_type', 'disability_degree', 'diagnosis',
            # تعليم
            'educational_level', 'school_name', 'grade',
            # إحالة
            'referral_source', 'referral_source_detail',
            # حالة
            'status', 'registration_date', 'notes',
            'branch',
        ]

    def validate_national_id(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError('رقم الهوية يجب أن يكون 10 أرقام.')
        return value

    def validate_date_of_birth(self, value):
        today = date.today()
        if value > today:
            raise serializers.ValidationError('تاريخ الميلاد لا يمكن أن يكون في المستقبل.')
        min_date = today.replace(year=today.year - 100)
        if value < min_date:
            raise serializers.ValidationError('تاريخ الميلاد غير صحيح (أكثر من 100 سنة).')
        return value

    def validate_registration_date(self, value):
        today = date.today()
        if value > today:
            raise serializers.ValidationError('تاريخ التسجيل لا يمكن أن يكون في المستقبل.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ── Attendance ─────────────────────────────────────────────────────────────────

class StudentAttendanceSerializer(serializers.ModelSerializer):
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    student_name     = serializers.CharField(source='student.full_name',  read_only=True)
    branch_name      = serializers.CharField(source='branch.name',        read_only=True, default=None)
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = StudentAttendance
        fields = [
            'id', 'student', 'student_name',
            'branch', 'branch_name',
            'attendance_date',
            'check_in_time', 'check_out_time',
            'status', 'status_display',
            'absence_reason', 'late_reason', 'early_leave_reason',
            'guardian_notified', 'notification_notes',
            'notes',
            'recorded_by', 'recorded_by_name', 'updated_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'recorded_by', 'updated_by', 'created_at', 'updated_at']
        extra_kwargs = {'student': {'required': False}}
        # UniqueTogetherValidator for (student, attendance_date) forces student to be
        # required in the request body, but student is always set by the view from the
        # URL parameter. Remove it here and enforce the constraint in perform_create.
        validators = []

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.username
        return None

    def validate(self, attrs):
        status         = attrs.get('status', getattr(self.instance, 'status', None))
        check_in_time  = attrs.get('check_in_time',  getattr(self.instance, 'check_in_time',  None))
        check_out_time = attrs.get('check_out_time', getattr(self.instance, 'check_out_time', None))
        absence_reason = attrs.get('absence_reason', getattr(self.instance, 'absence_reason', ''))
        early_leave_r  = attrs.get('early_leave_reason', getattr(self.instance, 'early_leave_reason', ''))

        # check_out must be after check_in
        if check_in_time and check_out_time and check_out_time <= check_in_time:
            raise serializers.ValidationError(
                {'check_out_time': 'وقت الانصراف يجب أن يكون بعد وقت الحضور.'}
            )

        # early_leave requires check_out_time
        if status == 'early_leave' and not check_out_time:
            raise serializers.ValidationError(
                {'check_out_time': 'وقت الانصراف مطلوب عند تسجيل انصراف مبكر.'}
            )

        # excused_absence requires absence_reason
        if status == 'excused_absence' and not (absence_reason or '').strip():
            raise serializers.ValidationError(
                {'absence_reason': 'سبب الغياب مطلوب عند تسجيل غياب بعذر.'}
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['recorded_by'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)
