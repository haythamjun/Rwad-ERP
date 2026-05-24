from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    message = 'هذه العملية تتطلب صلاحيات مدير النظام'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsManagerOrAbove(BasePermission):
    message = 'هذه العملية تتطلب صلاحيات مدير'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_manager_or_above
