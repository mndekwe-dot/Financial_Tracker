from rest_framework.routers import DefaultRouter

from .views import UssdCodeViewSet

router = DefaultRouter()
router.register(r'', UssdCodeViewSet, basename='ussd')

urlpatterns = router.urls
