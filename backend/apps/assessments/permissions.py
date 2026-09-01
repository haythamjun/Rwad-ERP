from rest_framework.permissions import BasePermission


class CanViewAssessments(BasePermission):
    message = 'ليس لديك صلاحية لعرض المقاييس والخطط الدراسية'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='assessments', can_view=True
        ).exists()


class CanEditAssessments(BasePermission):
    message = 'ليس لديك صلاحية لتعديل المقاييس والخطط الدراسية'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='assessments', can_edit=True
        ).exists()
