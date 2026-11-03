from pathlib import Path
import sqlite3,subprocess,os
from django.core.management.base import BaseCommand,CommandError
from django.conf import settings
class Command(BaseCommand):
    help='Create a local backup without overwriting existing files. Protect the output: it contains private data.'
    def add_arguments(self,p):p.add_argument('output')
    def handle(self,*args,**opts):
        target=Path(opts['output']).resolve()
        if target.exists():raise CommandError('Output already exists')
        db=settings.DATABASES['default']
        if db['ENGINE'].endswith('sqlite3'):
            with sqlite3.connect(str(db['NAME'])) as source, sqlite3.connect(str(target)) as dest:source.backup(dest)
        else:
            env=os.environ.copy();env['PGPASSWORD']=db.get('PASSWORD','')
            subprocess.run(['pg_dump','--format=custom','--host='+db['HOST'],'--port='+str(db.get('PORT') or 5432),'--username='+db['USER'],'--file='+str(target),db['NAME']],env=env,check=True)
        self.stdout.write('Backup created. Restrict file access and store outside the public web folder.')
