from django.urls import path

from .views import MomoInboxView, MomoSettingsView, MomoTestView, MomoMessagesView, MomoPayView

urlpatterns = [
    path('inbox/', MomoInboxView.as_view(), name='momo-inbox'),
    path('settings/', MomoSettingsView.as_view(), name='momo-settings'),
    path('pay/', MomoPayView.as_view(), name='momo-pay'),
    path('test/', MomoTestView.as_view(), name='momo-test'),
    path('messages/', MomoMessagesView.as_view(), name='momo-messages'),
]
