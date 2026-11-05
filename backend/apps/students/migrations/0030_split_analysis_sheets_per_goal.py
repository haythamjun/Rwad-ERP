from django.db import migrations


def split_per_goal(apps, schema_editor):
    """كل نموذج مجال قديم ← نموذج لكل هدف من أهداف المجال بنفس الشهر.
    تقييمات الهدف تنتقل لبند الهدف نفسه ("goal")، والوسائل والملاحظة تُنسخ لكل نموذج."""
    Sheet = apps.get_model('students', 'GoalAnalysisSheet')
    Goal = apps.get_model('students', 'IndividualPlanGoal')
    for old in Sheet.objects.filter(goal__isnull=True):
        ratings = old.ratings or {}
        for goal in Goal.objects.filter(plan_id=old.plan_id, domain=old.domain):
            days = ratings.get(str(goal.id))
            new = Sheet.objects.create(
                plan_id=old.plan_id,
                goal=goal,
                domain=old.domain,
                start_date=old.start_date,
                ratings={'goal': days} if days else {},
                teaching_aids=old.teaching_aids,
                teacher_note=old.teacher_note,
                created_by_id=old.created_by_id,
            )
            Sheet.objects.filter(pk=new.pk).update(created_at=old.created_at, updated_at=old.updated_at)
        old.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0029_individual_sub_goals'),
    ]

    operations = [
        migrations.RunPython(split_per_goal, migrations.RunPython.noop),
    ]
