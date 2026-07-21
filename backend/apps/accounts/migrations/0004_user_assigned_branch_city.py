import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_usermodulepermission_can_export_can_import'),
        ('core', '0003_branch_city'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='assigned_branch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_users',
                to='core.branch',
                verbose_name='الفرع المعيّن',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='assigned_city',
            field=models.CharField(blank=True, max_length=100, verbose_name='المدينة المعيّنة'),
        ),
    ]
