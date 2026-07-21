from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from .models import AuditLog, Branch
from apps.accounts.permissions import IsManagerOrAbove, IsAdmin


# ── Audit Log ──────────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'action_display',
                  'object_repr', 'changes', 'ip_address', 'timestamp']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class AuditLogListView(generics.ListAPIView):
    queryset           = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class   = AuditLogSerializer
    permission_classes = [IsManagerOrAbove]
    filterset_fields   = ['action']
    search_fields      = ['object_repr', 'user__username']


# ── Branch ─────────────────────────────────────────────────────────────────────

class BranchSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Branch
        fields = ['id', 'name', 'city', 'location', 'phone', 'is_active', 'created_at', 'student_count']
        read_only_fields = ['id', 'created_at']


class BranchListCreateView(generics.ListCreateAPIView):
    serializer_class   = BranchSerializer
    pagination_class   = None          # branches are a small list; no pagination needed

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Branch.objects.annotate(student_count=Count('students')).order_by('name')


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BranchSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Branch.objects.annotate(student_count=Count('students'))


# ── Dashboard stats ────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.students.models import Student

        user = request.user
        qs = Student.objects.all()
        branches_qs = Branch.objects.filter(is_active=True)

        if not user.is_admin:
            if user.assigned_branch_id:
                qs = qs.filter(branch_id=user.assigned_branch_id)
                branches_qs = branches_qs.filter(id=user.assigned_branch_id)
            elif user.assigned_city:
                qs = qs.filter(branch__city=user.assigned_city)
                branches_qs = branches_qs.filter(city=user.assigned_city)

        total = qs.count()
        by_status = dict(
            qs.values_list('status').annotate(n=Count('id')).values_list('status', 'n')
        )

        branches = (
            branches_qs
            .annotate(student_count=Count('students'))
            .values('id', 'name', 'location', 'student_count')
            .order_by('name')
        )

        return Response({
            'total':     total,
            'by_status': by_status,
            'branches':  list(branches),
        })
