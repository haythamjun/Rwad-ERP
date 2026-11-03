from django.utils import timezone
from rest_framework import serializers

from .models import SessionAttendance, SessionRecording, VirtualSession


class SessionRecordingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = SessionRecording
        fields = [
            'id', 'status', 'status_display', 'size_bytes',
            'recorded_at', 'archived_at', 'error', 'attempts',
        ]


class VirtualSessionSerializer(serializers.ModelSerializer):
    classroom_name   = serializers.CharField(source='classroom.name', read_only=True)
    branch_name      = serializers.CharField(source='classroom.branch.name', read_only=True)
    teacher_name     = serializers.SerializerMethodField()
    created_by_name  = serializers.SerializerMethodField()
    ends_at          = serializers.DateTimeField(read_only=True)
    live_state       = serializers.CharField(read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    recordings       = SessionRecordingSerializer(many=True, read_only=True)
    attendance_count = serializers.SerializerMethodField()
    student_count    = serializers.SerializerMethodField()

    class Meta:
        model  = VirtualSession
        fields = [
            'id', 'classroom', 'classroom_name', 'branch_name', 'teacher_name',
            'title', 'starts_at', 'ends_at', 'duration_minutes',
            'status', 'status_display', 'live_state',
            'zoho_meeting_key', 'zoho_join_url', 'zoho_password',
            'recordings', 'recordings_checked_at',
            'attendance_count', 'student_count',
            'created_by_name', 'created_at',
        ]
        read_only_fields = [
            'id', 'status', 'zoho_meeting_key', 'zoho_join_url', 'zoho_password',
            'recordings_checked_at', 'created_at',
        ]

    def get_teacher_name(self, obj):
        t = obj.classroom.teacher
        return (t.get_full_name() or t.username) if t else None

    def get_created_by_name(self, obj):
        u = obj.created_by
        return (u.get_full_name() or u.username) if u else None

    def get_attendance_count(self, obj):
        return obj.attendances.count()

    def get_student_count(self, obj):
        return obj.classroom.students.count()

    def validate_duration_minutes(self, v):
        if not 5 <= v <= 240:
            raise serializers.ValidationError('المدة بين 5 و 240 دقيقة')
        return v

    def validate_starts_at(self, v):
        changed = self.instance is None or v != self.instance.starts_at
        if changed and v < timezone.now() - timezone.timedelta(minutes=5):
            raise serializers.ValidationError('لا يمكن جدولة حصة في وقت مضى')
        return v

    def validate_classroom(self, v):
        if self.instance and v != self.instance.classroom:
            raise serializers.ValidationError('لا يمكن نقل الحصة لفصل آخر — ألغها وأنشئ حصة جديدة')
        return v


class SessionAttendanceSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    file_number   = serializers.CharField(source='student.file_number', read_only=True)
    guardian_name = serializers.CharField(source='guardian.full_name', read_only=True, default=None)

    class Meta:
        model  = SessionAttendance
        fields = [
            'id', 'student', 'student_name', 'file_number', 'guardian_name',
            'first_joined_at', 'last_joined_at', 'join_count',
        ]
