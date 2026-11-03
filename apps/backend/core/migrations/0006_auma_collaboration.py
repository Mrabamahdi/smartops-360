import base64
from pathlib import Path
from django.conf import settings
from django.db import migrations

def add_collaboration(apps,schema_editor):
    Organization=apps.get_model('core','Organization')
    Collaboration=apps.get_model('core','Collaboration')
    logo=''
    for folder in ['public','dist']:
        path=Path(settings.BASE_DIR).parent/'frontend'/folder/'assets'/'auma-tec-logo.png'
        if path.exists():logo='data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode();break
    values={'description':'Collaboration in building technology and maintenance.','description_de':'Zusammenarbeit im Bereich Gebäudetechnik und Wartung.','website':'https://auma-tec.com/','visible':True,'logo':logo}
    for org in Organization.objects.all().iterator():
        company=Collaboration.objects.filter(organization=org,name__iexact='AUMA-TEC').first()
        if company is None:Collaboration.objects.create(organization=org,name='AUMA-TEC',**values)
        elif company.description.startswith('Example collaboration') or not company.description:
            Collaboration.objects.filter(pk=company.pk).update(**values)

class Migration(migrations.Migration):
    dependencies=[('core','0005_membership_demo_profile_membership_onboarding_choice')]
    operations=[migrations.RunPython(add_collaboration,migrations.RunPython.noop)]
