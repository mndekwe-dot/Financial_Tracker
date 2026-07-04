from django.conf import settings
from django.db import models


class Loan(models.Model):
    OWED_TO_ME = 'owed_to_me'
    I_OWE = 'i_owe'
    DIRECTION_CHOICES = [
        (OWED_TO_ME, 'Owed to me'),
        (I_OWE, 'I owe'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    person = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    direction = models.CharField(max_length=12, choices=DIRECTION_CHOICES, default=OWED_TO_ME)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.person} {self.direction} {self.amount}'
