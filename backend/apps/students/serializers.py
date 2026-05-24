from rest_framework import serializers
from .models import Student, Guardian, FamilyInfo, StudentAttachment


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
    status_display           = serializers.CharField(source='get_status_display',           read_only=True)
    gender_display           = serializers.CharField(source='get_gender_display',           read_only=True)
    disability_type_display  = serializers.CharField(source='get_disability_type_display',  read_only=True)
    disability_degree_display= serializers.CharField(source='get_disability_degree_display',read_only=True)
    age                      = serializers.IntegerField(read_only=True)
    primary_guardian         = serializers.SerializerMethodField()

    class Meta:
        model  = Student
        fields = [
            'id', 'file_number', 'full_name', 'national_id',
            'date_of_birth', 'age', 'gender', 'gender_display',
            'nationality', 'status', 'status_display',
            'disability_type', 'disability_type_display',
            'disability_degree', 'disability_degree_display',
            'registration_date', 'photo',
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

    class Meta:
        model  = Student
        fields = [
            'id', 'file_number', 'full_name', 'national_id',
            'date_of_birth', 'age', 'gender', 'gender_display',
            'nationality', 'photo',
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
            'full_name', 'national_id', 'date_of_birth', 'gender', 'nationality',
            'photo',
            # إعاقة
            'disability_type', 'disability_degree', 'diagnosis',
            # تعليم
            'educational_level', 'school_name', 'grade',
            # إحالة
            'referral_source', 'referral_source_detail',
            # حالة
            'status', 'registration_date', 'notes',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)
