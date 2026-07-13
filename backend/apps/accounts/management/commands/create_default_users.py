import os
import secrets
import sys
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default system users (passwords read from environment variables)'

    def handle(self, *args, **options):
        users = [
            {
                'username':    'admin',
                'env_key':     'DEFAULT_ADMIN_PASSWORD',
                'first_name':  'Admin',
                'last_name':   'System',
                'email':       'admin@roya-erp.com',
                'role':        'admin',
                'is_staff':    True,
                'is_superuser': True,
            },
            {
                'username':   'manager',
                'env_key':    'DEFAULT_MANAGER_PASSWORD',
                'first_name': 'Manager',
                'last_name':  'User',
                'email':      'manager@roya-erp.com',
                'role':       'manager',
            },
            {
                'username':   'specialist',
                'env_key':    'DEFAULT_SPECIALIST_PASSWORD',
                'first_name': 'Specialist',
                'last_name':  'User',
                'email':      'specialist@roya-erp.com',
                'role':       'specialist',
            },
            {
                'username':   'reception',
                'env_key':    'DEFAULT_RECEPTION_PASSWORD',
                'first_name': 'Reception',
                'last_name':  'User',
                'email':      'reception@roya-erp.com',
                'role':       'reception',
            },
        ]

        for user_data in users:
            username = user_data['username']
            env_key  = user_data.pop('env_key')

            if User.objects.filter(username=username).exists():
                print(f'[EXISTS]  {username}')
                continue

            password = os.environ.get(env_key)
            generated = False
            if not password:
                password  = secrets.token_urlsafe(20)
                generated = True

            user_fields = {k: v for k, v in user_data.items() if k != 'username'}
            user = User(username=username, **user_fields)
            user.set_password(password)
            user.save()

            if generated:
                print(
                    f'[CREATED] {username} — auto-generated password: {password}'
                    f'  (set {env_key} env var to control this)',
                    file=sys.stderr,
                )
            else:
                print(f'[CREATED] {username}')

        print('Done.')
