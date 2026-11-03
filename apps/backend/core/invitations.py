import hashlib,secrets
from datetime import timedelta
from django.utils import timezone
from django.db import transaction,IntegrityError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_protect
from .models import Invitation,Membership
from .views import WorkspacePermission

@api_view(['POST'])
@permission_classes([WorkspacePermission])
def invite(request):
    m=request.user.membership
    if m.role!='admin':return Response(status=403)
    role=request.data.get('role')
    if role not in ['admin','manager','technician','student']:return Response({'detail':'Invalid role'},status=400)
    token=secrets.token_urlsafe(32)
    invitation=Invitation.objects.create(organization=m.organization,digest=hashlib.sha256(token.encode()).hexdigest(),role=role,expires_at=timezone.now()+timedelta(hours=24))
    return Response({'token':token,'expires_at':invitation.expires_at},status=201)

@csrf_protect
@api_view(['POST'])
@permission_classes([AllowAny])
def accept(request):
    d=request.data
    if not all(isinstance(d.get(k),str) for k in ['token','username','name','password']):return Response({'detail':'Invalid fields'},status=400)
    if len(d['token'])>100 or len(d['password'])>128 or not d['name'].strip() or len(d['name'])>100:return Response(status=400)
    with transaction.atomic():
        invitation=Invitation.objects.select_for_update().filter(digest=hashlib.sha256(d['token'].encode()).hexdigest(),used=False,expires_at__gt=timezone.now()).first()
        if not invitation:return Response({'detail':'Invalid or expired invitation'},status=400)
        user=get_user_model()(username=d['username'],first_name=d['name'])
        try:
            user.full_clean(exclude=['password']);validate_password(d['password'],user)
        except ValidationError as e:return Response({'detail':e.messages},status=400)
        user.set_password(d['password']);user.save()
        Membership.objects.create(user=user,organization=invitation.organization,role=invitation.role,path=invitation.path,specialty=invitation.specialty)
        invitation.used=True;invitation.save(update_fields=['used'])
    return Response({'ok':True},status=201)

# Require CSRF on the anonymous invitation POST despite APIView's default exemption.
accept.csrf_exempt=False

