from django.test import TestCase,Client

from django.contrib.auth import get_user_model

from rest_framework.test import APIClient

from .models import Organization,Membership,Job,Reading,Notification



class AccessTests(TestCase):

    def setUp(self):

        self.a=Organization.objects.create(name='A')

        self.b=Organization.objects.create(name='B')

        self.users={}

        for role in ['admin','manager','technician','student']:

            u=get_user_model().objects.create_user(username=role,password='A-long-test-password-81')

            Membership.objects.create(user=u,organization=self.a,role=role)

            self.users[role]=u

        self.job=Job.objects.create(organization=self.a,site='A',equipment='Pump',problem='Leak',date='2026-11-01',technician=self.users['technician'].membership)

        self.other=Job.objects.create(organization=self.b,site='B',equipment='Pump',problem='Secret',date='2026-11-01')

        self.c=APIClient()

    def as_role(self,role): self.c.force_authenticate(self.users[role])

    def test_anonymous_denied(self): self.assertEqual(self.c.get('/api/jobs/').status_code,403)

    def test_workspace_list_isolation(self):

        self.as_role('admin')

        self.assertEqual([j['id'] for j in self.c.get('/api/jobs/').data['results']],[self.job.id])

    def test_other_workspace_detail_hidden(self):

        self.as_role('admin')

        self.assertEqual(self.c.get(f'/api/jobs/{self.other.id}/').status_code,404)

        self.assertEqual(self.c.patch(f'/api/jobs/{self.other.id}/',{'repair':'hack'}).status_code,404)

    def test_technician_update(self):

        self.as_role('technician')

        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'repair':'Fixed','status':'completed'}).status_code,200)

    def test_technician_cannot_change_budget(self):

        self.as_role('technician')

        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'budget':100}).status_code,400)

    def test_unassigned_technician_hidden(self):

        self.job.technician=None;self.job.save()

        self.as_role('technician')

        self.assertEqual(self.c.get('/api/jobs/').data['count'],0)

    def test_student_explicit_assignment(self):

        self.as_role('student')

        self.assertEqual(self.c.get('/api/jobs/').data['count'],0)

        self.job.students.add(self.users['student'].membership)

        self.assertEqual(self.c.get('/api/jobs/').data['count'],1)

        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'repair':'x'}).status_code,403)

    def test_negative_cost_rejected(self):

        self.as_role('manager')

        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'parts':-1}).status_code,400)

    def test_member_cannot_create_admin(self):

        self.as_role('manager')

        self.assertEqual(self.c.post('/api/team/create_account/',{}).status_code,403)

    def test_cross_workspace_assignment_rejected(self):

        u=get_user_model().objects.create_user(username='outsider')

        m=Membership.objects.create(user=u,organization=self.b,role='technician')

        self.as_role('admin')

        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'technician':m.id}).status_code,400)

    def test_notifications_private(self):

        Notification.objects.create(organization=self.a,recipient=self.users['manager'].membership,message='Private')

        self.as_role('technician')

        self.assertEqual(self.c.get('/api/notifications/').data['count'],0)

    def test_login_requires_csrf(self):

        c=Client(enforce_csrf_checks=True)

        self.assertEqual(c.post('/api/auth/login/',{'username':'admin','password':'x'},content_type='application/json').status_code,403)

    def test_real_login_and_logout(self):

        c=Client(enforce_csrf_checks=True)

        token=c.get('/api/auth/csrf/').json()['csrfToken']

        self.assertEqual(c.post('/api/auth/login/',{'username':'admin','password':'A-long-test-password-81'},content_type='application/json',HTTP_X_CSRFTOKEN=token).status_code,200)

        self.assertEqual(c.get('/api/jobs/').status_code,200)

        token=c.get('/api/auth/csrf/').json()['csrfToken']

        self.assertEqual(c.post('/api/auth/logout/',HTTP_X_CSRFTOKEN=token).status_code,200)

        self.assertEqual(c.get('/api/jobs/').status_code,403)

    def test_deactivated_session_revoked(self):

        c=Client();c.force_login(self.users['technician'])

        self.users['technician'].is_active=False;self.users['technician'].save()

        self.assertEqual(c.get('/api/jobs/').status_code,403)


    def test_invitation_single_use_and_server_role(self):
        self.as_role('admin')
        response=self.c.post('/api/invitations/',{'role':'student'},format='json')
        self.assertEqual(response.status_code,201)
        token=response.data['token']
        c=Client(enforce_csrf_checks=True)
        csrf=c.get('/api/auth/csrf/').json()['csrfToken']
        payload={'token':token,'username':'newstudent','name':'New Student','password':'Unique-invited-password-827','role':'admin'}
        self.assertEqual(c.post('/api/invitations/accept/',payload,content_type='application/json',HTTP_X_CSRFTOKEN=csrf).status_code,201)
        self.assertEqual(get_user_model().objects.get(username='newstudent').membership.role,'student')
        self.assertEqual(c.post('/api/invitations/accept/',payload,content_type='application/json',HTTP_X_CSRFTOKEN=csrf).status_code,400)
    def test_invitation_accept_requires_csrf(self):
        self.assertEqual(Client(enforce_csrf_checks=True).post('/api/invitations/accept/',{},content_type='application/json').status_code,403)
    def test_batch_import_rolls_back_invalid_input(self):
        self.as_role('manager')
        rows=[{'meter':'M','date':'2026-11-01','value':12,'unit':'kWh','kind':'interval'},{'meter':'M','date':'2026-11-02','value':-1,'unit':'kWh','kind':'interval'}]
        self.assertEqual(self.c.post('/api/readings/import_batch/',{'readings':rows},format='json').status_code,400)
        self.assertEqual(Reading.objects.count(),0)
    def test_duplicate_batch_is_atomic(self):
        self.as_role('manager')
        row={'meter':'M','date':'2026-11-01','value':12,'unit':'kWh','kind':'interval'}
        self.assertEqual(self.c.post('/api/readings/import_batch/',{'readings':[row,row]},format='json').status_code,400)
        self.assertEqual(Reading.objects.count(),0)
    def test_stale_edit_is_rejected(self):
        self.as_role('manager')
        self.assertEqual(self.c.patch(f'/api/jobs/{self.job.id}/',{'repair':'Stale','expected_updated_at':'2000-01-01T00:00:00Z'}).status_code,409)
        self.job.refresh_from_db();self.assertEqual(self.job.repair,'')
    def test_financial_fields_not_exposed_to_technician(self):
        self.as_role('technician')
        result=self.c.get(f'/api/jobs/{self.job.id}/').data
        self.assertNotIn('rate',result);self.assertNotIn('budget',result)
    def test_password_reset_revokes_session(self):
        c=Client();c.force_login(self.users['technician'])
        self.as_role('admin')
        response=self.c.post(f"/api/team/{self.users['technician'].membership.id}/reset_password/",{'password':'Another-safe-password-781'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(c.get('/api/jobs/').status_code,403)


class WelcomeTests(TestCase):
    def setUp(self):
        self.org=Organization.objects.create(name='Private real workspace')
        self.user=get_user_model().objects.create_user(username='welcome-owner',password='Welcome-test-password-851',first_name='Owner')
        self.member=Membership.objects.create(user=self.user,organization=self.org,role='admin')
        self.job=Job.objects.create(organization=self.org,site='Real private site',equipment='Real pump',problem='Real request',date='2026-11-01')
        self.c=Client();self.c.force_login(self.user)
    def choose(self,choice):return self.c.post('/api/onboarding/',{'choice':choice},content_type='application/json')
    def test_initial_choice_and_empty_keeps_records(self):
        self.assertEqual(self.c.get('/api/onboarding/').json()['choice'],'')
        self.assertEqual(self.choose('empty').status_code,200)
        self.assertTrue(Job.objects.filter(pk=self.job.pk).exists())
        self.assertEqual(self.c.get('/api/onboarding/').json()['choice'],'empty')
    def test_demo_is_private_idempotent_and_returns_without_login(self):
        original_session=self.c.session.session_key
        self.assertEqual(self.choose('demo').status_code,200)
        self.member.refresh_from_db()
        demo_org=self.member.demo_profile.organization
        self.assertNotEqual(demo_org.pk,self.org.pk)
        self.assertEqual(Job.objects.filter(organization=demo_org).count(),3)
        self.assertFalse(self.member.demo_profile.user.has_usable_password())
        from .models import Collaboration
        self.assertTrue(Collaboration.objects.filter(organization=demo_org,name='AUMA-TEC',visible=True).exists())
        self.assertFalse(Collaboration.objects.filter(organization=self.org).exists())
        self.assertEqual(self.c.get('/api/jobs/').json()['count'],3)
        self.assertEqual(self.c.get('/api/auth/me/').json()['username'],self.user.username)
        self.choose('demo')
        self.assertEqual(Job.objects.filter(organization=demo_org).count(),3)
        self.choose('empty')
        self.assertEqual(self.c.get('/api/jobs/').json()['results'][0]['problem'],'Real request')
        self.assertEqual(self.c.session.session_key,original_session)
    def test_other_user_cannot_access_my_examples(self):
        self.choose('demo');self.member.refresh_from_db()
        example=Job.objects.filter(organization=self.member.demo_profile.organization).first()
        other=get_user_model().objects.create_user(username='other-welcome')
        Membership.objects.create(user=other,organization=self.org,role='admin')
        c=Client();c.force_login(other)
        self.assertEqual(c.get(f'/api/jobs/{example.pk}/').status_code,404)
    def test_technician_demo_preserves_permissions(self):
        self.member.role='technician';self.member.save()
        self.choose('demo')
        result=self.c.get('/api/jobs/').json()
        self.assertEqual(result['count'],3)
        self.assertNotIn('budget',result['results'][0])
        self.assertEqual(self.c.get('/api/team/').status_code,403)
    def test_choice_requires_authentication_and_csrf(self):
        self.assertEqual(Client().get('/api/onboarding/').status_code,403)
        secure=Client(enforce_csrf_checks=True);secure.force_login(self.user)
        self.assertEqual(secure.post('/api/onboarding/',{'choice':'demo'},content_type='application/json').status_code,403)


class CollaborationDefaultsTests(TestCase):
    def test_real_and_demo_workspace_default_is_idempotent(self):
        from .collaboration_defaults import ensure_auma_collaboration
        from .models import Collaboration
        for name in ['Own workspace','Example workspace']:
            org=Organization.objects.create(name=name)
            first=ensure_auma_collaboration(org)
            second=ensure_auma_collaboration(org)
            self.assertEqual(first.pk,second.pk)
            self.assertNotIn('Example collaboration',first.description)
            self.assertNotIn('Beispiel',first.description_de)
            self.assertTrue(first.visible)
            self.assertTrue(first.logo.startswith('data:image/png;base64,'))
            self.assertEqual(Collaboration.objects.filter(organization=org).count(),1)
    def test_previous_generated_description_is_updated(self):
        from .collaboration_defaults import ensure_auma_collaboration
        from .models import Collaboration
        org=Organization.objects.create(name='Existing')
        company=Collaboration.objects.create(organization=org,name='AUMA-TEC',description='Example collaboration for building maintenance.')
        updated=ensure_auma_collaboration(org)
        self.assertEqual(updated.pk,company.pk)
        self.assertEqual(updated.description,'Collaboration in building technology and maintenance.')


class GermanDemoTests(TestCase):
    def test_prepare_is_repeatable_and_preserves_user_changes(self):
        from django.core.management import call_command
        org=Organization.objects.create(name='Original workspace')
        user=get_user_model().objects.create_user(username='german-demo-owner')
        member=Membership.objects.create(user=user,organization=org,role='admin')
        original=Job.objects.create(organization=org,site='Original',equipment='Pump',problem='Keep original',date='2026-11-02')
        call_command('prepare_german_demo',username=user.username)
        member.refresh_from_db()
        demo_org=member.demo_profile.organization
        self.assertEqual(Job.objects.filter(organization=demo_org).count(),3)
        self.assertTrue(Job.objects.filter(organization=demo_org,equipment='Lüftungsanlage').exists())
        edited=Job.objects.filter(organization=demo_org).first()
        edited.problem='Eigene Ergänzung';edited.save(update_fields=['problem'])
        call_command('prepare_german_demo',username=user.username)
        edited.refresh_from_db();original.refresh_from_db()
        self.assertEqual(edited.problem,'Eigene Ergänzung')
        self.assertEqual(original.problem,'Keep original')
        self.assertEqual(Job.objects.filter(organization=demo_org).count(),3)
