"""Private example workspaces. Original account and real workspace are never moved."""
import secrets
from datetime import date,timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Membership,Organization,Job,Reading,Notification,Collaboration

class DemoWorkspaceMiddleware:
    def __init__(self,get_response):self.get_response=get_response
    def __call__(self,request):
        request.real_user=request.user
        if request.user.is_authenticated:
            member=Membership.objects.select_related('demo_profile__user').filter(user=request.user).first()
            # Authentication endpoints always operate on the original account.
            if member and member.onboarding_choice=='demo' and member.demo_profile and member.demo_profile.user.is_active and not request.path.startswith('/api/auth/'):
                request.user=member.demo_profile.user
        return self.get_response(request)

def make_demo(owner):
    org=Organization.objects.create(name='SmartOps 360 — Deutscher Demo-Arbeitsbereich')
    def member(name,role,path='employee',specialty=''):
        user=get_user_model()(username='example_'+secrets.token_hex(12),first_name=name)
        user.set_unusable_password();user.save()
        return Membership.objects.create(user=user,organization=org,role=role,path=path,specialty=specialty)
    active=member(owner.user.first_name or 'Demo-Nutzer',owner.role,owner.path,owner.specialty)
    tech=active if owner.role=='technician' else member('Lena Weber (Beispiel)','technician',specialty='hvac')
    student=active if owner.role=='student' else member('Emilia Hoffmann (Beispiel)','student','apprentice','hvac')
    if owner.role not in ['admin','manager']:member('Anna Berger (Beispiel)','manager')
    today=date.today()
    examples=[('Lindenhof Verwaltung GmbH — Büro Berlin (Beispiel)','Lüftungsanlage','Nächtlichen Lüftungsbetrieb prüfen', 'completed',today-timedelta(days=3),'Zeitschaltuhr eingestellt und Betrieb geprüft.',3,'65','80','20','500'),('Sonnenblick Immobilien GmbH — Wohnhaus Leipzig (Beispiel)','Heizungspumpe','Geräusche an der Heizung prüfen','progress',today,'Prüfung läuft. Befund wird dokumentiert.',1,'65','0','15','350'),('Lindenhof Verwaltung GmbH — Büro Berlin (Beispiel)','Luftfilter','Lüftungsfilter austauschen','scheduled',today+timedelta(days=2),'',0,'65','0','0','250')]
    for site,equipment,problem,status,day,repair,hours,rate,parts,travel,budget in examples:
        job=Job.objects.create(organization=org,site=site,equipment=equipment,problem=problem,date=day,status=status,technician=tech,specialty='hvac',repair=repair,hours=hours,rate=Decimal(rate),parts=Decimal(parts),travel=Decimal(travel),budget=Decimal(budget))
        job.students.add(student)
    for days,value in enumerate([142,137,151,145,139,143,140]):
        Reading.objects.create(organization=org,meter='Lindenhof Berlin — Stromzähler (Beispiel)',date=today-timedelta(days=6-days),value=value,kind='interval',unit='kWh')
    Notification.objects.create(organization=org,recipient=active,message='Fiktive Beispieldaten: Entdecken Sie Aufgaben, Kosten und PDF-Berichte.')
    from .collaboration_defaults import ensure_auma_collaboration
    ensure_auma_collaboration(org)
    owner.demo_profile=active
    return active

@api_view(['GET','POST'])
def welcome(request):
    real=getattr(request,'real_user',None)
    user=real if real and real.is_authenticated else request.user
    if not user.is_authenticated or not hasattr(user,'membership'):return Response(status=403)
    with transaction.atomic():
        owner=Membership.objects.select_for_update().get(user=user)
        if request.method=='POST':
            choice=request.data.get('choice')
            if choice not in ['demo','empty']:return Response({'detail':'Invalid choice'},status=400)
            if choice=='demo' and not owner.demo_profile_id:make_demo(owner)
            owner.onboarding_choice=choice
            owner.save(update_fields=['onboarding_choice','demo_profile'])
        return Response({'choice':owner.onboarding_choice,'mode':'demo' if owner.onboarding_choice=='demo' else 'live'})
