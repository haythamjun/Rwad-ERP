from rest_framework.permissions import BasePermission


class CanViewReports(BasePermission):
    message = 'ليس لديك صلاحية لعرض التقارير'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='reports', can_view=True
        ).exists()
