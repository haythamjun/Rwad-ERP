from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0008_student_rejection'),
    ]

    operations = [
        migrations.CreateModel(
            name='GuardianAuthToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(db_index=True, max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('guardian', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='auth_tokens',
                    to='students.guardian',
                    verbose_name='ولي الأمر',
                )),
            ],
            options={
                'verbose_name': 'رمز تحقق ولي الأمر',
                'verbose_name_plural': 'رموز تحقق أولياء الأمور',
            },
        ),
    ]
