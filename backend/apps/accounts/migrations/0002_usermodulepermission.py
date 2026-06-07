from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserModulePermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module', models.CharField(
                    choices=[
                        ('students',   'ملفات الطلاب'),
                        ('reports',    'التقارير'),
                        ('audit_logs', 'سجل العمليات'),
                        ('users',      'المستخدمون'),
                        ('settings',   'الإعدادات'),
                    ],
                    max_length=20,
                    verbose_name='الوحدة',
                )),
                ('can_view', models.BooleanField(default=False, verbose_name='عرض')),
                ('can_edit', models.BooleanField(default=False, verbose_name='تعديل')),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='module_permissions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='المستخدم',
                )),
            ],
            options={
                'verbose_name': 'صلاحية وحدة',
                'verbose_name_plural': 'صلاحيات الوحدات',
                'unique_together': {('user', 'module')},
            },
        ),
    ]
