from django.contrib import admin
from .models import Student, Guardian, FamilyInfo, StudentAttachment


class GuardianInline(admin.TabularInline):
    model  = Guardian
    extra  = 1
    fields = ['full_name', 'relationship', 'phone', 'is_primary_contact']


class FamilyInfoInline(admin.StackedInline):
    model = FamilyInfo
    extra = 0


class AttachmentInline(admin.TabularInline):
    model  = StudentAttachment
    extra  = 0
    fields = ['attachment_type', 'name', 'file']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ['file_number', 'first_name', 'family_name', 'national_id', 'disability_type', 'gender', 'status', 'registration_date']
    list_filter   = ['status', 'gender', 'nationality', 'educational_level', 'referral_source']
    search_fields = ['first_name', 'middle_name', 'grandfather_name', 'family_name', 'national_id', 'file_number', 'diagnosis']
    readonly_fields = ['file_number', 'created_by', 'created_at', 'updated_at']
    inlines       = [GuardianInline, FamilyInfoInline, AttachmentInline]
    ordering      = ['-created_at']

    fieldsets = (
        ('بيانات التعريف', {
            'fields': ('file_number', 'registration_date', 'status'),
        }),
        ('البيانات الشخصية', {
            'fields': ('first_name', 'middle_name', 'grandfather_name', 'family_name', 'national_id', 'date_of_birth', 'gender', 'nationality', 'photo'),
        }),
        ('الإعاقة والتشخيص', {
            'fields': ('disability_type', 'diagnosis', 'iq_score'),
        }),
        ('المعلومات التعليمية', {
            'fields': ('educational_level', 'school_name', 'grade'),
            'classes': ('collapse',),
        }),
        ('جهة الإحالة', {
            'fields': ('referral_source', 'referral_source_detail'),
            'classes': ('collapse',),
        }),
        ('ملاحظات', {
            'fields': ('notes',),
        }),
        ('معلومات النظام', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'relationship', 'phone', 'student', 'is_primary_contact']
    list_filter   = ['relationship', 'is_primary_contact']
    search_fields = ['full_name', 'phone', 'student__first_name', 'student__family_name']


@admin.register(FamilyInfo)
class FamilyInfoAdmin(admin.ModelAdmin):
    list_display  = ['student', 'family_size', 'parents_status', 'income_range', 'monthly_income']
    search_fields = ['student__first_name', 'student__family_name']


@admin.register(StudentAttachment)
class StudentAttachmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'attachment_type', 'student', 'uploaded_by', 'created_at']
    list_filter   = ['attachment_type']
    search_fields = ['name', 'student__first_name', 'student__family_name']
