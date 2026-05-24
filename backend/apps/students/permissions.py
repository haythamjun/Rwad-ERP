from rest_framework.permissions import BasePermission


class CanWrite(BasePermission):
    message = 'ليس لديك صلاحية لإضافة أو تعديل البيانات'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_write


class CanDelete(BasePermission):
    message = 'ليس لديك صلاحية لحذف البيانات'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_delete
