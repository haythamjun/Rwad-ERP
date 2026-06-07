from django.db import migrations, models


def split_name(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    for student in Student.objects.all():
        parts = student.full_name.strip().split() if student.full_name else []
        n = len(parts)
        if n == 0:
            student.first_name = 'غير محدد'
            student.family_name = 'غير محدد'
        elif n == 1:
            student.first_name = parts[0]
            student.family_name = parts[0]
        elif n == 2:
            student.first_name = parts[0]
            student.family_name = parts[1]
        elif n == 3:
            student.first_name = parts[0]
            student.middle_name = parts[1]
            student.family_name = parts[2]
        else:
            student.first_name = parts[0]
            student.middle_name = parts[1]
            student.grandfather_name = parts[2]
            student.family_name = ' '.join(parts[3:])
        student.save(update_fields=['first_name', 'middle_name', 'grandfather_name', 'family_name'])


def merge_name(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    for student in Student.objects.all():
        parts = [student.first_name, student.middle_name, student.grandfather_name, student.family_name]
        student.full_name = ' '.join(p for p in parts if p)
        student.save(update_fields=['full_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_alter_familyinfo_options_alter_student_options_and_more'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='student',
            name='students_st_full_na_6ea9f7_idx',
        ),
        migrations.AddField(
            model_name='student',
            name='first_name',
            field=models.CharField(default='', max_length=50, verbose_name='الاسم الأول'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='student',
            name='middle_name',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='اسم الأب'),
        ),
        migrations.AddField(
            model_name='student',
            name='grandfather_name',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='اسم الجد'),
        ),
        migrations.AddField(
            model_name='student',
            name='family_name',
            field=models.CharField(default='', max_length=50, verbose_name='اسم العائلة'),
            preserve_default=False,
        ),
        migrations.RunPython(split_name, merge_name),
        migrations.RemoveField(
            model_name='student',
            name='full_name',
        ),
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['first_name'], name='students_st_first_n_idx'),
        ),
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['family_name'], name='students_st_family_n_idx'),
        ),
    ]
