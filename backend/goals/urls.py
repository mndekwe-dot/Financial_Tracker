from rest_framework.routers import DefaultRouter

from .views import SavingsGoalViewSet

router = DefaultRouter()
router.register(r'', SavingsGoalViewSet, basename='savingsgoal')

urlpatterns = router.urls
