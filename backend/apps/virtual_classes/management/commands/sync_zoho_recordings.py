"""
أرشفة تسجيلات الحصص المنتهية من Zoho.
يُشغَّل دوريًا (خدمة Cron على Railway — backend/railway.cron.json):
    python manage.py sync_zoho_recordings

    --repair  يعيد تحميل أي تسجيل «مؤرشف» ملفه مفقود من التخزين (كل الحصص، بلا حد أيام)
"""
from django.core.management.base import BaseCommand

from apps.virtual_classes import services, zoho


class Command(BaseCommand):
    help = 'Archive recordings of ended virtual sessions from Zoho Meeting'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=7, help='Look back this many days')
        parser.add_argument('--repair', action='store_true', help='Re-archive recordings whose file is missing')

    def handle(self, *args, days, repair, **options):
        if not zoho.is_configured():
            self.stderr.write('Zoho is not configured (ZOHO_* settings missing)')
            return
        sessions = services.sessions_due_for_sync(days=days)
        if repair:
            repaired = services.repair_missing_files()
            self.stdout.write(f'{len(repaired)} session(s) with missing files reset for re-archive')
            known = {s.pk for s in sessions}
            sessions += [s for s in repaired if s.pk not in known]
        self.stdout.write(f'{len(sessions)} session(s) to check')
        for s in sessions:
            try:
                archived, pending = services.sync_session(s)
                self.stdout.write(f'  session {s.pk}: archived={archived} pending={pending}')
            except zoho.ZohoError as e:
                self.stderr.write(f'  session {s.pk}: {e}')
