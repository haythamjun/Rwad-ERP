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


class CanWriteBuses(BasePermission):
    """كتابة بيانات الباصات — كانت مقفولة على المدير فقط بلا أي مسار دور؛
    الآن يقدر المدير يمنحها صراحة لمستخدم آخر عبر صلاحية موديول 'buses'،
    بدون أي دور يمنحها افتراضيًا (اتساقًا مع الوضع السابق)."""
    message = 'ليس لديك صلاحية لتعديل بيانات الباصات'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='buses', can_edit=True
        ).exists()
