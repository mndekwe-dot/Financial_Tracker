from django.conf import settings
from django.db import models


class UssdCode(models.Model):
    """A saved USSD shortcut (e.g. buy an airtime pack, top up a transport
    card, check a balance), grouped by the service it belongs to."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ussd_codes')
    service = models.CharField(max_length=60)
    label = models.CharField(max_length=60)
    code = models.CharField(max_length=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['service', 'label', 'created_at']

    def __str__(self):
        return f'{self.service} · {self.label}: {self.code}'
