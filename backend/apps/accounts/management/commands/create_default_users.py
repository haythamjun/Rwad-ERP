import sys
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default system users'

    def handle(self, *args, **options):
        users = [
            {
                'username': 'admin',
                'password': 'Admin@1234',
                'first_name': 'Admin',
                'last_name': 'System',
                'email': 'admin@rwad-erp.com',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'manager',
                'password': 'Manager@1234',
                'first_name': 'Manager',
                'last_name': 'User',
                'email': 'manager@rwad-erp.com',
                'role': 'manager',
            },
            {
                'username': 'specialist',
                'password': 'Specialist@1234',
                'first_name': 'Specialist',
                'last_name': 'User',
                'email': 'specialist@rwad-erp.com',
                'role': 'specialist',
            },
            {
                'username': 'reception',
                'password': 'Reception@1234',
                'first_name': 'Reception',
                'last_name': 'User',
                'email': 'reception@rwad-erp.com',
                'role': 'reception',
            },
        ]

        for user_data in users:
            username = user_data['username']
            if not User.objects.filter(username=username).exists():
                password = user_data.pop('password')
                user = User(**user_data)
                user.set_password(password)
                user.save()
                print(f'[CREATED] {username}')
            else:
                print(f'[EXISTS]  {username}')

        print('Done.')
