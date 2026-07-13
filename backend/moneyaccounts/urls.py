from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, TransferViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'transfers', TransferViewSet, basename='transfer')

urlpatterns = router.urls
