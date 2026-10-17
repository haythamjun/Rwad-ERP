from django.db import migrations

# تحويل أكواد المجالات الإنجليزية القديمة (قبل التحول لنص حر) لنفس أسمائها
# العربية المعروضة سابقًا — حتى تبقى الخطط الحالية بنفس الشكل بالضبط.
CODE_TO_LABEL = {
    'cognitive':     'الإدراكي',
    'fine_motor':    'الحركي الدقيق',
    'gross_motor':   'الحركي الكبير',
    'social':        'الاجتماعي',
    'independence':  'الاستقلالي',
    'attention':     'الانتباه والتركيز',
    'communication': 'التخاطب',
}


def forwards(apps, schema_editor):
    IndividualPlanGoal = apps.get_model('students', 'IndividualPlanGoal')
    for code, label in CODE_TO_LABEL.items():
        IndividualPlanGoal.objects.filter(domain=code).update(domain=label)


def backwards(apps, schema_editor):
    IndividualPlanGoal = apps.get_model('students', 'IndividualPlanGoal')
    for code, label in CODE_TO_LABEL.items():
        IndividualPlanGoal.objects.filter(domain=label).update(domain=code)


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0023_alter_individualplangoal_domain'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
