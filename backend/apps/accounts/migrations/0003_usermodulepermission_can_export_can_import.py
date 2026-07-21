from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_usermodulepermission'),
    ]

    operations = [
        migrations.AddField(
            model_name='usermodulepermission',
            name='can_export',
            field=models.BooleanField(default=False, verbose_name='تصدير'),
        ),
        migrations.AddField(
            model_name='usermodulepermission',
            name='can_import',
            field=models.BooleanField(default=False, verbose_name='استيراد'),
        ),
    ]
