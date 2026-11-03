from django.urls import path,include
from rest_framework.routers import DefaultRouter
from core import views, invitations, onboarding
router=DefaultRouter()
for name,view in [('audit',views.AuditViewSet),('students',views.StudentViewSet),('technicians',views.TechnicianViewSet),('jobs',views.JobViewSet),('readings',views.ReadingViewSet),('collaborations',views.CollaborationViewSet),('team',views.TeamViewSet),('notifications',views.NotificationViewSet)]:
    router.register(name,view,basename=name)
urlpatterns=[path('api/onboarding/',onboarding.welcome),path('api/invitations/',invitations.invite),path('api/invitations/accept/',invitations.accept),path('api/auth/me/',views.me),path('api/auth/csrf/',views.csrf),path('api/auth/login/',views.signin),path('api/auth/logout/',views.signout),path('api/',include(router.urls))]
