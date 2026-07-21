from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_branch'),
    ]

    operations = [
        migrations.AddField(
            model_name='branch',
            name='city',
            field=models.CharField(blank=True, max_length=100, verbose_name='المدينة'),
        ),
    ]
