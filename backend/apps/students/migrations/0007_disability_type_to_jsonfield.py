import json as json_lib
from django.db import migrations, models


def convert_disability_type_to_list(apps, schema_editor):
    """Convert single-string disability_type values to JSON array strings.
    Must run BEFORE AlterField so the existing varchar values become valid JSON
    that Postgres can CAST to jsonb.
    """
    db = schema_editor.connection
    with db.cursor() as cursor:
        if db.vendor == 'postgresql':
            cursor.execute("""
                UPDATE students_student
                SET disability_type =
                    CASE
                        WHEN disability_type IS NULL OR disability_type = ''
                            THEN '[]'
                        ELSE json_build_array(disability_type)::text
                    END
            """)
        else:
            # SQLite (local dev)
            cursor.execute("SELECT id, disability_type FROM students_student")
            rows = cursor.fetchall()
            for row_id, dt in rows:
                new_val = json_lib.dumps([dt] if dt else [])
                cursor.execute(
                    "UPDATE students_student SET disability_type = ? WHERE id = ?",
                    [new_val, row_id],
                )


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0006_add_family_card_attachment_type'),
    ]

    operations = [
        migrations.RunPython(convert_disability_type_to_list, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='student',
            name='disability_type',
            field=models.JSONField(default=list, verbose_name='نوع الإعاقة'),
        ),
    ]
