from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core',     '0002_branch'),
        ('students', '0004_student_branch'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StudentAttendance',
            fields=[
                ('id',                  models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attendance_date',     models.DateField(verbose_name='تاريخ الحضور')),
                ('check_in_time',       models.TimeField(blank=True, null=True, verbose_name='وقت الحضور')),
                ('check_out_time',      models.TimeField(blank=True, null=True, verbose_name='وقت الانصراف')),
                ('status',              models.CharField(
                    choices=[
                        ('present',         'حاضر'),
                        ('absent',          'غائب'),
                        ('late',            'متأخر'),
                        ('excused_absence', 'غياب بعذر'),
                        ('early_leave',     'انصراف مبكر'),
                    ],
                    default='present', max_length=20, verbose_name='الحالة',
                )),
                ('absence_reason',      models.TextField(blank=True, verbose_name='سبب الغياب')),
                ('late_reason',         models.TextField(blank=True, verbose_name='سبب التأخر')),
                ('early_leave_reason',  models.TextField(blank=True, verbose_name='سبب الانصراف المبكر')),
                ('guardian_notified',   models.BooleanField(default=False, verbose_name='تم إخطار ولي الأمر')),
                ('notification_notes',  models.TextField(blank=True, verbose_name='ملاحظات الإخطار')),
                ('notes',               models.TextField(blank=True, verbose_name='ملاحظات')),
                ('created_at',          models.DateTimeField(auto_now_add=True)),
                ('updated_at',          models.DateTimeField(auto_now=True)),
                ('branch', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='attendances', to='core.branch',
                    verbose_name='الفرع',
                )),
                ('recorded_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='recorded_attendances',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='سُجّل بواسطة',
                )),
                ('student', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attendances', to='students.student',
                    verbose_name='المستفيد',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='updated_attendances',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='عُدِّل بواسطة',
                )),
            ],
            options={
                'verbose_name':        'سجل حضور',
                'verbose_name_plural': 'سجلات الحضور',
                'ordering':            ['-attendance_date', '-created_at'],
                'unique_together':     {('student', 'attendance_date')},
            },
        ),
    ]
