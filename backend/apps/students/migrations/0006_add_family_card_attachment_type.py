from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0005_studentattendance'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studentattachment',
            name='attachment_type',
            field=models.CharField(
                choices=[
                    ('national_id',          'صورة الهوية'),
                    ('birth_certificate',    'شهادة الميلاد'),
                    ('family_card',          'كرت الأسرة'),
                    ('medical_report',       'تقرير طبي'),
                    ('psychological_report', 'تقرير نفسي'),
                    ('disability_card',      'بطاقة إعاقة'),
                    ('referral_letter',      'خطاب إحالة'),
                    ('other',                'أخرى'),
                ],
                max_length=30,
                verbose_name='نوع المرفق',
            ),
        ),
    ]
