from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = 'نظام Roya - رؤية'
admin.site.site_title = 'Roya - رؤية'
admin.site.index_title = 'لوحة التحكم'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.students.urls')),
    path('api/', include('apps.core.urls')),
    path('api/', include('apps.assessments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
