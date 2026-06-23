import sys
import traceback

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from django.contrib.contenttypes.models import ContentType


def custom_exception_handler(exc, context):
    """
    Catch ALL exceptions (not just APIException) and return JSON.
    Prevents Django from returning HTML 500 pages for the API.
    Logs the full traceback to stderr so Railway logs show the real error.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        # DRF didn't handle it — log and return JSON 500
        view = context.get('view', '')
        print(
            f'UNHANDLED EXCEPTION in {view.__class__.__name__ if view else "unknown"}: '
            f'{type(exc).__name__}: {exc}',
            file=sys.stderr,
        )
        traceback.print_exc(file=sys.stderr)

        return Response(
            {
                'error': f'{type(exc).__name__}: {exc}',
                'detail': 'حدث خطأ داخلي في الخادم. تم تسجيل التفاصيل.',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, obj=None, object_repr='', changes=None):
    try:
        from apps.core.models import AuditLog

        user = None
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user

        ip = get_client_ip(request)

        content_type = None
        object_id = None
        if obj and hasattr(obj, 'pk') and obj.pk:
            try:
                content_type = ContentType.objects.get_for_model(obj)
                object_id = obj.pk
            except Exception:
                pass

        AuditLog.objects.create(
            user=user,
            action=action,
            content_type=content_type,
            object_id=object_id,
            object_repr=str(object_repr)[:200],
            changes=changes or {},
            ip_address=ip,
        )
    except Exception as exc:
        print(f'[log_action] failed silently: {exc}', file=sys.stderr)
