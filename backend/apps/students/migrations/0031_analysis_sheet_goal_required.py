from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0030_split_analysis_sheets_per_goal'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='goalanalysissheet',
            name='domain',
        ),
        migrations.AlterField(
            model_name='goalanalysissheet',
            name='goal',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analysis_sheets', to='students.individualplangoal', verbose_name='الهدف'),
        ),
        migrations.AlterUniqueTogether(
            name='goalanalysissheet',
            unique_together={('goal', 'start_date')},
        ),
        migrations.AlterModelOptions(
            name='goalanalysissheet',
            options={'ordering': ['goal__domain', 'goal__order', 'start_date'], 'verbose_name': 'نموذج تحليل أهداف', 'verbose_name_plural': 'نماذج تحليل الأهداف'},
        ),
    ]
