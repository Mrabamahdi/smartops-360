"""Workspace collaboration requested by the project owner."""
import base64
from pathlib import Path
from django.conf import settings
from .models import Collaboration

def auma_logo():
    frontend=Path(settings.BASE_DIR).parent/'frontend'
    for folder in ['public','dist']:
        path=frontend/folder/'assets'/'auma-tec-logo.png'
        if path.exists():return 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
    return ''

def ensure_auma_collaboration(organization):
    values={'description':'Collaboration in building technology and maintenance.','description_de':'Zusammenarbeit im Bereich Gebäudetechnik und Wartung.','website':'https://auma-tec.com/','visible':True,'logo':auma_logo()}
    company=Collaboration.objects.filter(organization=organization,name__iexact='AUMA-TEC').first()
    if company is None:return Collaboration.objects.create(organization=organization,name='AUMA-TEC',**values)
    # Replace the previous generated illustrative description, preserving custom content.
    if company.description.startswith('Example collaboration') or not company.description:
        for key,value in values.items():setattr(company,key,value)
        company.save(update_fields=list(values))
    return company
