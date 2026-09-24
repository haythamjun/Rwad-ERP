from rest_framework.permissions import BasePermission


class CanWrite(BasePermission):
    """صلاحية الكتابة (إضافة/تعديل) — دور المستخدم يمنحها افتراضيًا (كما كان)،
    ويقدر المدير أيضًا يمنحها صراحة لمستخدم دوره لا يمنحها افتراضيًا عبر صلاحية
    موديول محدّدة (بلا تغيير بسلوك من يملكها أصلًا عبر دوره).

    الـ View المُستخدَم فيه يقدر يحدد `module_permission_key` (افتراضيًا
    'students') لتحديد أي موديول تُفحص صلاحيته — مثلًا 'attendance'/'schedule'."""
    message = 'ليس لديك صلاحية لإضافة أو تعديل البيانات'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        if request.user.can_write:
            return True
        module = getattr(view, 'module_permission_key', 'students')
        return request.user.module_permissions.filter(module=module, can_edit=True).exists()


class CanDelete(BasePermission):
    """نفس مبدأ CanWrite — دور المستخدم يمنحها افتراضيًا، أو صلاحية موديول صريحة."""
    message = 'ليس لديك صلاحية لحذف البيانات'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        if request.user.can_delete:
            return True
        module = getattr(view, 'module_permission_key', 'students')
        return request.user.module_permissions.filter(module=module, can_edit=True).exists()


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
