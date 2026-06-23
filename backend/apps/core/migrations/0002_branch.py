from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Branch',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name',       models.CharField(max_length=100, unique=True, verbose_name='اسم الفرع')),
                ('location',   models.CharField(max_length=200, blank=True, verbose_name='الموقع')),
                ('phone',      models.CharField(max_length=20,  blank=True, verbose_name='هاتف الفرع')),
                ('is_active',  models.BooleanField(default=True, verbose_name='نشط')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name':        'فرع',
                'verbose_name_plural': 'الفروع',
                'ordering':            ['name'],
            },
        ),
    ]
