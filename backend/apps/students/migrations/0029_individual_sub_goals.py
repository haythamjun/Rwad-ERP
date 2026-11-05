from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """الأهداف الفرعية للخطة الفردية + ربط نموذج التحليل بالهدف (مؤقتًا nullable
    حتى تقسّم 0030 النماذج القديمة — نموذج لكل مجال — إلى نموذج لكل هدف)."""

    dependencies = [
        ('students', '0028_quarterly_sub_goals'),
    ]

    operations = [
        migrations.AddField(
            model_name='individualplangoal',
            name='post_evaluation_manual',
            field=models.BooleanField(default=False, verbose_name='تقييم يدوي'),
        ),
        migrations.CreateModel(
            name='IndividualPlanSubGoal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='الهدف الفرعي')),
                ('post_evaluation', models.CharField(blank=True, choices=[('achieved', 'تحقق'), ('partial', 'نوعًا ما'), ('not_achieved', 'لم يتحقق'), ('not_applicable', 'لم يطبق')], max_length=20, verbose_name='التقييم البعدي')),
                ('order', models.PositiveSmallIntegerField(default=1, verbose_name='الترتيب')),
                ('achieved_date', models.DateField(blank=True, null=True, verbose_name='تاريخ الإنجاز')),
                ('goal', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sub_goals', to='students.individualplangoal', verbose_name='الهدف')),
            ],
            options={
                'verbose_name': 'هدف فرعي لخطة فردية',
                'verbose_name_plural': 'الأهداف الفرعية للخطط الفردية',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='goalanalysissheet',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='goalanalysissheet',
            name='goal',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='analysis_sheets', to='students.individualplangoal', verbose_name='الهدف'),
        ),
    ]
