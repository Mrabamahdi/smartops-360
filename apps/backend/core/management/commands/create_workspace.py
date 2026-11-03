from getpass import getpass

from django.core.management.base import BaseCommand,CommandError

from django.contrib.auth import get_user_model

from django.contrib.auth.password_validation import validate_password

from django.db import transaction

from core.models import Organization,Membership

class Command(BaseCommand):

    help='Create an independent workspace and its first administrator. Password is prompted, never passed on the command line.'

    def add_arguments(self,parser):

        parser.add_argument('--organization',required=True)

        parser.add_argument('--username',required=True)

        parser.add_argument('--name',required=True)

    def handle(self,*args,**opts):

        password=getpass('Password: ')

        if password!=getpass('Confirm password: '): raise CommandError('Passwords differ')

        user=get_user_model()(username=opts['username'],first_name=opts['name'])

        user.full_clean(exclude=['password'])

        validate_password(password,user)

        with transaction.atomic():

            org=Organization.objects.create(name=opts['organization'])
            from core.collaboration_defaults import ensure_auma_collaboration
            ensure_auma_collaboration(org)

            user.set_password(password)

            user.save()

            Membership.objects.create(user=user,organization=org,role='admin')

        self.stdout.write(self.style.SUCCESS('Workspace created. No demo users or data were added.'))

