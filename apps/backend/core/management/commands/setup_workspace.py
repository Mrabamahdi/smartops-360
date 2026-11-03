from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Membership
class Command(BaseCommand):
    help='Interactive local first-account setup; no action if accounts already exist.'
    def handle(self,*args,**opts):
        if Membership.objects.exists():return
        self.stdout.write('First-time SmartOps setup. Create your workspace administrator.')
        organization=input('Workspace name: ').strip()
        username=input('Your username: ').strip()
        name=input('Your full name: ').strip()
        if not all([organization,username,name]):raise ValueError('All fields are required')
        call_command('create_workspace',organization=organization,username=username,name=name)
