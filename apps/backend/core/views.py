from django.contrib.auth import authenticate, login, logout, get_user_model

from django.contrib.auth.password_validation import validate_password

from django.core.exceptions import ValidationError

from django.db import transaction

from django.http import JsonResponse

from django.middleware.csrf import get_token

from django.views.decorators.csrf import csrf_protect

from django.views.decorators.http import require_POST

import json, hashlib

from django.utils import timezone
from datetime import timedelta
from .models import LoginBucket,AuditEvent

from rest_framework import viewsets, permissions, status

from rest_framework.decorators import action

from rest_framework.exceptions import PermissionDenied

from rest_framework.response import Response

from .models import Job, Reading, Collaboration, Membership, Notification

from .serializers import JobSerializer, ReadingSerializer, CollaborationSerializer, MembershipSerializer, NotificationSerializer



def csrf(request):

    return JsonResponse({'csrfToken':get_token(request)})



@require_POST

@csrf_protect

def signin(request):

    try:

        data=json.loads(request.body)

        username=data.get('username','')

        password=data.get('password','')

        if not isinstance(username,str) or not isinstance(password,str) or len(username)>150 or len(password)>128:

            raise ValueError()

    except (ValueError,AttributeError):

        return JsonResponse({'detail':'Invalid request.'},status=400)

    now=timezone.now()
    for raw,limit in [(request.META.get('REMOTE_ADDR',''),50),(request.META.get('REMOTE_ADDR','')+':'+username.lower(),10)]:
        key=hashlib.sha256(raw.encode()).hexdigest()
        with transaction.atomic():
            bucket,_=LoginBucket.objects.get_or_create(key=key,defaults={'started_at':now})
            bucket=LoginBucket.objects.select_for_update().get(key=key)
            if bucket.started_at<now-timedelta(minutes=5):bucket.count=0;bucket.started_at=now
            if bucket.count>=limit:return JsonResponse({'detail':'Try later.'},status=429)
            bucket.count+=1;bucket.save()
    LoginBucket.objects.filter(started_at__lt=now-timedelta(days=1)).delete()
    user=authenticate(request,username=username,password=password)

    if user is None or not Membership.objects.filter(user=user).exists():

        return JsonResponse({'detail':'Invalid credentials.'},status=400)


    login(request,user)

    return JsonResponse({'id':user.id,'username':user.username,'name':user.first_name,'role':user.membership.role})



@require_POST

@csrf_protect

def signout(request):

    logout(request)

    return JsonResponse({'ok':True})



class WorkspacePermission(permissions.BasePermission):

    def has_permission(self,request,view):

        return request.user.is_authenticated and hasattr(request.user,'membership') and request.user.is_active



class ScopedViewSet(viewsets.ModelViewSet):

    permission_classes=[WorkspacePermission]

    def get_queryset(self):

        return self.queryset.filter(organization=self.request.user.membership.organization).order_by('id')

    def allowed_write(self):

        return self.request.user.membership.role in ['admin','manager']

    def perform_create(self,serializer):

        if not self.allowed_write(): raise PermissionDenied()

        serializer.save(organization=self.request.user.membership.organization)
        self.audit('create',serializer.instance)

    def perform_update(self,serializer):

        if not self.allowed_write(): raise PermissionDenied()

        serializer.save()

    def perform_destroy(self,instance):

        raise PermissionDenied('Deletion is disabled pending retention policy.')



    def audit(self,action,instance):
        AuditEvent.objects.create(organization=self.request.user.membership.organization,actor=self.request.user.username,action=action,resource=instance.__class__.__name__,object_id=str(instance.pk))

class JobViewSet(ScopedViewSet):

    queryset=Job.objects.all()

    serializer_class=JobSerializer

    def get_queryset(self):

        rows=super().get_queryset()

        m=self.request.user.membership

        if m.role=='technician': rows=rows.filter(technician=m)

        if m.role=='student': rows=rows.filter(students=m)

        return rows.distinct()

    def perform_create(self,serializer):

        with transaction.atomic():

            super().perform_create(serializer)

            job=serializer.instance

            if job.technician:

                Notification.objects.create(organization=job.organization,recipient=job.technician,message='New assignment: '+job.problem[:250])

    def perform_update(self,serializer):

        with transaction.atomic():

            job=Job.objects.select_for_update().get(pk=serializer.instance.pk)

            expected=self.request.data.get('expected_updated_at')

            if expected and expected!=job.updated_at.isoformat().replace('+00:00','Z'):

                from rest_framework.exceptions import APIException

                error=APIException('Record changed. Reload before saving.');error.status_code=409;raise error

            if self.request.user.membership.role=='technician':
                serializer.save();self.audit('update',serializer.instance)

            else: super().perform_update(serializer)

            updated=serializer.instance

            recipients=Membership.objects.filter(organization=updated.organization,role__in=['admin','manager'],user__is_active=True).exclude(user=self.request.user)

            for recipient in recipients:

                Notification.objects.create(organization=updated.organization,recipient=recipient,message='Updated: '+updated.problem[:250])

            if updated.technician and updated.technician_id!=job.technician_id:

                Notification.objects.create(organization=updated.organization,recipient=updated.technician,message='Assignment: '+updated.problem[:250])



def me(request):

    if not request.user.is_authenticated or not hasattr(request.user,'membership'):

        return JsonResponse({'detail':'Authentication required'},status=403)

    u=request.user

    return JsonResponse({'id':u.id,'username':u.username,'name':u.first_name,'role':u.membership.role})



class ReadingViewSet(ScopedViewSet):

    queryset=Reading.objects.all()

    serializer_class=ReadingSerializer

    @action(detail=False,methods=['post'])

    def import_batch(self,request):

        if not self.allowed_write():raise PermissionDenied()

        values=request.data.get('readings')

        if not isinstance(values,list) or not values or len(values)>5000:return Response({'detail':'Provide 1–5000 readings'},status=400)

        with transaction.atomic():

            keys=set()

            for value in values:

                serializer=self.get_serializer(data=value);serializer.is_valid(raise_exception=True)

                key=tuple(str(serializer.validated_data[k]) for k in ['meter','date','kind'])

                if key in keys:return Response({'detail':'Duplicate reading in batch'},status=400)

                keys.add(key)

            for value in values:

                serializer=self.get_serializer(data=value);serializer.is_valid(raise_exception=True);serializer.save(organization=request.user.membership.organization)

        return Response({'created':len(values)},status=201)

    def get_queryset(self):

        if self.request.user.membership.role not in ['admin','manager']: return self.queryset.none()

        return super().get_queryset()



class CollaborationViewSet(ScopedViewSet):

    queryset=Collaboration.objects.all()

    serializer_class=CollaborationSerializer

    def allowed_write(self): return self.request.user.membership.role=='admin'

    def get_queryset(self):

        rows=super().get_queryset()

        return rows if self.request.user.membership.role=='admin' else rows.filter(visible=True)



    def perform_destroy(self,instance):

        if not self.allowed_write(): raise PermissionDenied()

        self.audit('delete',instance)
        instance.delete()



class TeamViewSet(viewsets.ReadOnlyModelViewSet):

    permission_classes=[WorkspacePermission]

    serializer_class=MembershipSerializer

    def get_queryset(self):

        m=self.request.user.membership

        if m.role!='admin': raise PermissionDenied()

        return Membership.objects.filter(organization=m.organization).select_related('user').order_by('id')

    @action(detail=False,methods=['post'])

    def create_account(self,request):

        self.get_queryset()

        d=request.data

        if d.get('role') not in ['admin','manager','technician','student']: return Response({'detail':'Invalid role'},status=400)

        if d.get('path','employee') not in ['employee','apprentice','dual']: return Response({'detail':'Invalid path'},status=400)

        username=d.get('username','')

        name=d.get('name','')

        password=d.get('password','')

        if not all(isinstance(v,str) for v in [username,name,password]) or not username or len(username)>150 or not name or len(name)>100:

            return Response({'detail':'Invalid account fields'},status=400)

        User=get_user_model()

        user=User(username=username,first_name=name)

        try:

            user.full_clean(exclude=['password'])

            validate_password(password,user)

        except ValidationError as e: return Response({'detail':e.messages},status=400)

        with transaction.atomic():

            user.set_password(password)

            user.save()

            m=Membership.objects.create(user=user,organization=request.user.membership.organization,role=d['role'],path=d.get('path','employee'),specialty=str(d.get('specialty',''))[:80])

        return Response(MembershipSerializer(m).data,status=201)

    @action(detail=True,methods=['post'])

    def deactivate(self,request,pk=None):

        m=self.get_object()

        if m.user_id==request.user.id: return Response({'detail':'Cannot deactivate yourself'},status=400)

        m.user.is_active=False

        m.user.save(update_fields=['is_active'])

        return Response({'ok':True})



    @action(detail=True,methods=['post'])

    def activate(self,request,pk=None):

        m=self.get_object()

        m.user.is_active=True

        m.user.save(update_fields=['is_active'])

        return Response({'ok':True})



    @action(detail=True,methods=['post'])

    def reset_password(self,request,pk=None):

        m=self.get_object()

        password=request.data.get('password')

        if not isinstance(password,str) or len(password)>128:return Response({'detail':'Invalid password'},status=400)

        try: validate_password(password,m.user)

        except ValidationError as e:return Response({'detail':e.messages},status=400)

        m.user.set_password(password);m.user.save(update_fields=['password'])

        return Response({'ok':True})



class TechnicianViewSet(viewsets.ReadOnlyModelViewSet):

    permission_classes=[WorkspacePermission]

    serializer_class=MembershipSerializer

    def get_queryset(self):

        m=self.request.user.membership

        if m.role not in ['admin','manager']: raise PermissionDenied()

        return Membership.objects.filter(organization=m.organization,role='technician',user__is_active=True).select_related('user').order_by('id')



class NotificationViewSet(ScopedViewSet):

    queryset=Notification.objects.all()

    serializer_class=NotificationSerializer

    http_method_names=['get','patch','head','options']

    def get_queryset(self): return super().get_queryset().filter(recipient=self.request.user.membership)

    def allowed_write(self): return True


class StudentViewSet(TechnicianViewSet):
    def get_queryset(self):
        m=self.request.user.membership
        if m.role not in ['admin','manager']:raise PermissionDenied()
        return Membership.objects.filter(organization=m.organization,role='student',user__is_active=True).select_related('user').order_by('id')

class AuditViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[WorkspacePermission]
    def get_serializer_class(self):
        from .serializers import AuditSerializer
        return AuditSerializer
    def get_queryset(self):
        m=self.request.user.membership
        if m.role not in ['admin','manager']:raise PermissionDenied()
        return AuditEvent.objects.filter(organization=m.organization).order_by('-id')
