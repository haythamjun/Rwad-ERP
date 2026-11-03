from django.contrib import admin

from .models import SessionAttendance, SessionRecording, VirtualSession


class SessionRecordingInline(admin.TabularInline):
    model = SessionRecording
    extra = 0
    readonly_fields = ['zoho_recording_id', 'file', 'size_bytes', 'recorded_at', 'status', 'error', 'attempts', 'archived_at']
    can_delete = False


@admin.register(VirtualSession)
class VirtualSessionAdmin(admin.ModelAdmin):
    list_display  = ['title', 'classroom', 'starts_at', 'duration_minutes', 'status', 'zoho_meeting_key']
    list_filter   = ['status', 'classroom__branch']
    search_fields = ['title', 'classroom__name', 'zoho_meeting_key']
    inlines       = [SessionRecordingInline]


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    list_display  = ['session', 'student', 'first_joined_at', 'join_count']
    search_fields = ['student__full_name', 'student__file_number']
