from rest_framework import serializers

from .models import Job, Reading, Collaboration, Membership, Notification



class JobSerializer(serializers.ModelSerializer):

    technician_name=serializers.CharField(source='technician.user.first_name',read_only=True,default='')

    expected_updated_at=serializers.CharField(write_only=True,required=False)

    total=serializers.SerializerMethodField()

    class Meta:

        model=Job

        exclude=['organization']

        read_only_fields=['created_at','updated_at']

    def to_representation(self,instance):

        data=super().to_representation(instance)

        if self.context['request'].user.membership.role in ['technician','student']:

            for key in ['rate','parts','travel','budget','total']: data.pop(key,None)

        return data

    def get_total(self,obj):

        return str(obj.hours*obj.rate+obj.parts+obj.travel)

    def validate(self,attrs):

        attrs.pop('expected_updated_at',None)

        member=self.context['request'].user.membership

        tech=attrs.get('technician')

        if tech and (tech.organization_id!=member.organization_id or tech.role!='technician' or not tech.user.is_active):

            raise serializers.ValidationError('Select an active technician in your workspace.')

        for student in attrs.get('students',[]):

            if student.organization_id!=member.organization_id or student.role!='student' or not student.user.is_active:

                raise serializers.ValidationError('Invalid learning assignment.')

        if member.role=='technician':

            if set(attrs)-{'repair','hours','status'}:

                raise serializers.ValidationError('Technicians may update repair, hours and status only.')

            if attrs.get('status', 'progress') not in ['progress','completed']:

                raise serializers.ValidationError('Invalid technician status.')

        return attrs



class ReadingSerializer(serializers.ModelSerializer):

    class Meta:

        model=Reading

        exclude=['organization']



    def validate(self,attrs):

        member=self.context['request'].user.membership

        values={k:attrs.get(k,getattr(self.instance,k,None)) for k in ['meter','date','kind']}

        rows=Reading.objects.filter(organization=member.organization,**values)

        if self.instance: rows=rows.exclude(pk=self.instance.pk)

        if rows.exists(): raise serializers.ValidationError('Reading already exists.')

        return attrs



class CollaborationSerializer(serializers.ModelSerializer):
    def validate_logo(self,value):
        if not value:return value
        import base64,re
        match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)',value)
        if not match or len(value)>700000:raise serializers.ValidationError('Invalid image')
        try:data=base64.b64decode(match.group(2),validate=True)
        except ValueError:raise serializers.ValidationError('Invalid image')
        kind=match.group(1)
        valid=(kind=='png' and data.startswith(b'\x89PNG\r\n\x1a\n')) or (kind=='jpeg' and data.startswith(b'\xff\xd8\xff')) or (kind=='webp' and data.startswith(b'RIFF') and data[8:12]==b'WEBP')
        if not valid or len(data)>500000:raise serializers.ValidationError('Invalid image')
        return value


    class Meta:

        model=Collaboration

        exclude=['organization']



class MembershipSerializer(serializers.ModelSerializer):

    name=serializers.CharField(source='user.first_name',read_only=True)

    username=serializers.CharField(source='user.username',read_only=True)

    active=serializers.BooleanField(source='user.is_active',read_only=True)

    class Meta:

        model=Membership

        fields=['id','name','username','role','path','specialty','active']



class NotificationSerializer(serializers.ModelSerializer):

    class Meta:

        model=Notification

        fields=['id','message','read','created_at']

        read_only_fields=['message','created_at']


class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import AuditEvent
        model=AuditEvent
        exclude=['organization']
