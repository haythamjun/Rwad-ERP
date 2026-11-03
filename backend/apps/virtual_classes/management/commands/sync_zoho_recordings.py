"""
أرشفة تسجيلات الحصص المنتهية من Zoho.
يُشغَّل دوريًا (Railway Cron كل 10 دقائق مثلًا):
    python manage.py sync_zoho_recordings
"""
from django.core.management.base import BaseCommand

from apps.virtual_classes import services, zoho


class Command(BaseCommand):
    help = 'Archive recordings of ended virtual sessions from Zoho Meeting'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=7, help='Look back this many days')

    def handle(self, *args, days, **options):
        if not zoho.is_configured():
            self.stderr.write('Zoho is not configured (ZOHO_* settings missing)')
            return
        sessions = services.sessions_due_for_sync(days=days)
        self.stdout.write(f'{len(sessions)} session(s) to check')
        for s in sessions:
            try:
                archived, pending = services.sync_session(s)
                self.stdout.write(f'  session {s.pk}: archived={archived} pending={pending}')
            except zoho.ZohoError as e:
                self.stderr.write(f'  session {s.pk}: {e}')
