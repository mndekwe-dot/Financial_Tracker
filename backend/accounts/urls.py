from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ChangePasswordView,
    MeView,
    PassphraseResetView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    SetPassphraseView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('set-passphrase/', SetPassphraseView.as_view(), name='set-passphrase'),
    path('passphrase-reset/', PassphraseResetView.as_view(), name='passphrase-reset'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
