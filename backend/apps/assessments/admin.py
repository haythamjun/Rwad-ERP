from django.contrib import admin
from .models import (
    Assessment, AssessmentSection, AssessmentQuestion,
    AssessmentScaleOption, StudentAssessment, StudentAssessmentAnswer,
)


class AssessmentSectionInline(admin.TabularInline):
    model = AssessmentSection
    extra = 0


class AssessmentScaleOptionInline(admin.TabularInline):
    model = AssessmentScaleOption
    extra = 0


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'is_active', 'created_by', 'created_at']
    list_filter   = ['is_active']
    search_fields = ['name']
    inlines       = [AssessmentSectionInline, AssessmentScaleOptionInline]


@admin.register(AssessmentQuestion)
class AssessmentQuestionAdmin(admin.ModelAdmin):
    list_display  = ['text', 'assessment', 'section', 'order']
    list_filter   = ['assessment', 'section']
    search_fields = ['text']


class StudentAssessmentAnswerInline(admin.TabularInline):
    model = StudentAssessmentAnswer
    extra = 0


@admin.register(StudentAssessment)
class StudentAssessmentAdmin(admin.ModelAdmin):
    list_display  = ['student', 'assessment', 'started_at', 'started_by']
    list_filter   = ['assessment']
    search_fields = ['student__first_name', 'student__family_name']
    inlines       = [StudentAssessmentAnswerInline]
