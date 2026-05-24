from django.contrib.contenttypes.models import ContentType


def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, obj=None, object_repr='', changes=None):
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
