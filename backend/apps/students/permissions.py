from rest_framework.permissions import BasePermission


class CanWrite(BasePermission):
    message = 'ليس لديك صلاحية لإضافة أو تعديل البيانات'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_write


class CanDelete(BasePermission):
    message = 'ليس لديك صلاحية لحذف البيانات'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_delete


class CanExport(BasePermission):
    message = 'ليس لديك صلاحية لتصدير البيانات'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='students', can_export=True
        ).exists()


class CanImport(BasePermission):
    message = 'ليس لديك صلاحية لاستيراد البيانات'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='students', can_import=True
        ).exists()


class CanViewMedical(BasePermission):
    message = 'ليس لديك صلاحية لعرض الملف الطبي'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='medical_file', can_view=True
        ).exists()


class CanEditMedical(BasePermission):
    message = 'ليس لديك صلاحية لتعديل الملف الطبي'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.module_permissions.filter(
            module='medical_file', can_edit=True
        ).exists()
