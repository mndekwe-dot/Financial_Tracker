from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TransactionViewSet, summary, weekly_breakdown

router = DefaultRouter()
router.register(r'', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('summary/', summary, name='transaction-summary'),
    path('weekly/', weekly_breakdown, name='transaction-weekly'),
] + router.urls
