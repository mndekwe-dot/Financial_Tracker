from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import LoanViewSet, loans_summary

router = DefaultRouter()
router.register(r'', LoanViewSet, basename='loan')

urlpatterns = [
    path('summary/', loans_summary, name='loans-summary'),
] + router.urls
