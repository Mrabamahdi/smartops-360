import os
from pathlib import Path
import dj_database_url
BASE_DIR=Path(__file__).resolve().parent.parent
DEBUG=os.getenv('SMARTOPS_DEBUG','1')=='1'
SECRET_KEY=os.getenv('SECRET_KEY','local-development-only-not-for-deployment')
if not DEBUG and (not os.getenv('SECRET_KEY') or not os.getenv('DATABASE_URL')):
    raise RuntimeError('Production requires SECRET_KEY and DATABASE_URL')
ALLOWED_HOSTS=os.getenv('ALLOWED_HOSTS','127.0.0.1,localhost,testserver').split(',')
INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.staticfiles','rest_framework','core']
MIDDLEWARE=['django.middleware.security.SecurityMiddleware','whitenoise.middleware.WhiteNoiseMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','core.onboarding.DemoWorkspaceMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF='config.urls'
WSGI_APPLICATION='config.wsgi.application'
DATABASES={'default':dj_database_url.parse(os.environ['DATABASE_URL'],conn_max_age=60,ssl_require=not DEBUG) if os.getenv('DATABASE_URL') else {'ENGINE':'django.db.backends.sqlite3','NAME':BASE_DIR/'db.sqlite3'}}
AUTH_PASSWORD_VALIDATORS=[{'NAME':'django.contrib.auth.password_validation.'+v} for v in ['UserAttributeSimilarityValidator','MinimumLengthValidator','CommonPasswordValidator','NumericPasswordValidator']]
REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework.authentication.SessionAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated'],'DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.PageNumberPagination','PAGE_SIZE':50,'DEFAULT_THROTTLE_CLASSES':['rest_framework.throttling.AnonRateThrottle','rest_framework.throttling.UserRateThrottle'],'DEFAULT_THROTTLE_RATES':{'anon':'30/minute','user':'300/minute'}}
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SECURE=not DEBUG
CSRF_COOKIE_SECURE=not DEBUG
CSRF_TRUSTED_ORIGINS=os.getenv('CSRF_TRUSTED_ORIGINS','').split(',') if os.getenv('CSRF_TRUSTED_ORIGINS') else []
SECURE_SSL_REDIRECT=not DEBUG
SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO","https") if not DEBUG else None
SECURE_HSTS_SECONDS=31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS=not DEBUG
SECURE_HSTS_PRELOAD=False
TIME_ZONE='UTC'
USE_TZ=True
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
STATIC_URL='/static/'
STATIC_ROOT=BASE_DIR/'staticfiles'
