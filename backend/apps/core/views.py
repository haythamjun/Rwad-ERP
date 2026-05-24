from rest_framework import generics, serializers
from .models import AuditLog
from apps.accounts.permissions import IsManagerOrAbove


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'action_display',
                  'object_repr', 'changes', 'ip_address', 'timestamp']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsManagerOrAbove]
    filterset_fields = ['action']
    search_fields = ['object_repr', 'user__username']
