from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core',     '0002_branch'),
        ('students', '0003_split_student_name_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='branch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='students',
                to='core.branch',
                verbose_name='الفرع',
            ),
        ),
    ]
