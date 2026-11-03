from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from core.models import Membership, Job, Reading, Notification
from core.onboarding import make_demo


class Command(BaseCommand):
    help = "Prepare a private German example workspace; keep the user's real workspace and additions."

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        owner = Membership.objects.select_for_update().filter(user__username=options['username']).first()
        if owner is None:
            raise CommandError('Account with workspace membership not found.')
        if not owner.demo_profile_id:
            make_demo(owner)
        organization = owner.demo_profile.organization
        # Translate only exact original example values, never user-edited content.
        translations = {'SmartOps 360 — fictional example': 'SmartOps 360 — Deutscher Demo-Arbeitsbereich', "'Example user'": "'Demo-Nutzer'", "'Lena Weber (example)'": "'Lena Weber (Beispiel)'", "'Emilia Hoffmann (example)'": "'Emilia Hoffmann (Beispiel)'", "'Anna Berger (example)'": "'Anna Berger (Beispiel)'", 'Riverside Office — example': 'Lindenhof Verwaltung GmbH — Büro Berlin (Beispiel)', 'Garden House — example': 'Sonnenblick Immobilien GmbH — Wohnhaus Leipzig (Beispiel)', 'Riverside Office — example meter': 'Lindenhof Berlin — Stromzähler (Beispiel)', 'Ventilation unit': 'Lüftungsanlage', 'Inspect overnight ventilation': 'Nächtlichen Lüftungsbetrieb prüfen', 'Adjusted the timer and checked operation.': 'Zeitschaltuhr eingestellt und Betrieb geprüft.', 'Heating pump': 'Heizungspumpe', 'Inspect heating noise': 'Geräusche an der Heizung prüfen', 'Inspection in progress.': 'Prüfung läuft. Befund wird dokumentiert.', 'Air filter': 'Luftfilter', 'Replace ventilation filter': 'Lüftungsfilter austauschen', 'Fictional example: explore assignments, costs and PDF reports.': 'Fiktive Beispieldaten: Entdecken Sie Aufgaben, Kosten und PDF-Berichte.'}
        for job in Job.objects.filter(organization=organization):
            changed=[]
            for field in ('site','equipment','problem','repair'):
                value=getattr(job,field)
                if value in translations:
                    setattr(job,field,translations[value]);changed.append(field)
            if changed:job.save(update_fields=changed)
        for old,new in translations.items():
            Reading.objects.filter(organization=organization,meter=old).update(meter=new)
            Notification.objects.filter(organization=organization,message=old).update(message=new)
        for member in Membership.objects.filter(organization=organization).select_related('user'):
            if member.user.first_name.endswith(' (example)'):
                member.user.first_name=member.user.first_name.replace(' (example)',' (Beispiel)')
                member.user.save(update_fields=['first_name'])
        organization.name='SmartOps 360 — Deutscher Demo-Arbeitsbereich'
        organization.save(update_fields=['name'])
        owner.onboarding_choice='demo'
        owner.save(update_fields=['demo_profile','onboarding_choice'])
        self.stdout.write(self.style.SUCCESS('German demo ready. Existing real data and demo additions were kept.'))
