from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0007_disability_type_to_jsonfield'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='rejection_reason',
            field=models.TextField(blank=True, verbose_name='سبب الرفض'),
        ),
    ]
