from rest_framework.routers import DefaultRouter

from .views import RecurringTransactionViewSet

router = DefaultRouter()
router.register(r'', RecurringTransactionViewSet, basename='recurring')

urlpatterns = router.urls
