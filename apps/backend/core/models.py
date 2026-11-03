from django.db import models

from django.conf import settings

from django.core.validators import MinValueValidator



class Organization(models.Model):

    name=models.CharField(max_length=160)



class Membership(models.Model):
    onboarding_choice=models.CharField(max_length=10,blank=True,choices=[('demo','demo'),('empty','empty')])
    demo_profile=models.ForeignKey('self',null=True,blank=True,on_delete=models.SET_NULL,related_name='demo_owner')


    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE)

    organization=models.ForeignKey(Organization,on_delete=models.PROTECT)

    role=models.CharField(max_length=16,choices=[(r,r) for r in ['admin','manager','technician','student']])

    path=models.CharField(max_length=16,choices=[(r,r) for r in ['employee','apprentice','dual']],default='employee')

    specialty=models.CharField(max_length=80,blank=True)



class Scoped(models.Model):

    organization=models.ForeignKey(Organization,on_delete=models.PROTECT)

    created_at=models.DateTimeField(auto_now_add=True)

    updated_at=models.DateTimeField(auto_now=True)

    class Meta:

        abstract=True



class Job(Scoped):

    site=models.CharField(max_length=160)

    equipment=models.CharField(max_length=160)

    problem=models.TextField(max_length=4000)

    date=models.DateField()

    status=models.CharField(max_length=16,choices=[(s,s) for s in ['open','scheduled','progress','completed']],default='open')

    technician=models.ForeignKey(Membership,null=True,blank=True,on_delete=models.PROTECT,related_name='jobs')

    students=models.ManyToManyField(Membership,blank=True,related_name='learning_jobs')

    specialty=models.CharField(max_length=80,blank=True)

    repair=models.TextField(max_length=4000,blank=True)

    hours=models.DecimalField(max_digits=8,decimal_places=2,default=0,validators=[MinValueValidator(0)])

    rate=models.DecimalField(max_digits=10,decimal_places=2,default=0,validators=[MinValueValidator(0)])

    parts=models.DecimalField(max_digits=12,decimal_places=2,default=0,validators=[MinValueValidator(0)])

    travel=models.DecimalField(max_digits=12,decimal_places=2,default=0,validators=[MinValueValidator(0)])

    budget=models.DecimalField(max_digits=12,decimal_places=2,default=0,validators=[MinValueValidator(0)])



class Reading(Scoped):

    meter=models.CharField(max_length=120)

    date=models.DateField()

    value=models.DecimalField(max_digits=16,decimal_places=3,validators=[MinValueValidator(0)])

    kind=models.CharField(max_length=16,choices=[('interval','interval'),('cumulative','cumulative')])

    unit=models.CharField(max_length=12,default='kWh')

    class Meta:

        constraints=[models.UniqueConstraint(fields=['organization','meter','date','kind'],name='unique_meter_reading')]



class Collaboration(Scoped):

    name=models.CharField(max_length=160)

    description=models.CharField(max_length=600,blank=True)

    logo=models.TextField(blank=True)
    description_de=models.CharField(max_length=600,blank=True)

    website=models.URLField(blank=True)

    visible=models.BooleanField(default=False)



class Notification(Scoped):

    recipient=models.ForeignKey(Membership,on_delete=models.CASCADE)

    message=models.CharField(max_length=300)

    read=models.BooleanField(default=False)


class Invitation(Scoped):
    digest=models.CharField(max_length=64,unique=True)
    role=models.CharField(max_length=16)
    path=models.CharField(max_length=16,default='employee')
    specialty=models.CharField(max_length=80,blank=True)
    expires_at=models.DateTimeField()
    used=models.BooleanField(default=False)

class LoginBucket(models.Model):
    key=models.CharField(max_length=64,primary_key=True)
    count=models.PositiveIntegerField(default=0)
    started_at=models.DateTimeField()

class AuditEvent(Scoped):
    actor=models.CharField(max_length=150)
    action=models.CharField(max_length=40)
    resource=models.CharField(max_length=40)
    object_id=models.CharField(max_length=40)
