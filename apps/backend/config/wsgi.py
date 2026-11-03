import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
from django.core.wsgi import get_wsgi_application
application=get_wsgi_application()

from pathlib import Path
from whitenoise import WhiteNoise
application=WhiteNoise(application,root=Path(__file__).resolve().parents[2]/'frontend'/'dist',index_file=True)
