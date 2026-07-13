from django.conf import settings
from django.db import models


class Account(models.Model):
    CASH = 'cash'
    BANK = 'bank'
    MOBILE_MONEY = 'mobile_money'
    SAVINGS = 'savings'
    OTHER = 'other'
    TYPE_CHOICES = [
        (CASH, 'Cash'),
        (BANK, 'Bank'),
        (MOBILE_MONEY, 'Mobile money'),
        (SAVINGS, 'Savings'),
        (OTHER, 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='money_accounts')
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=CASH)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    color = models.CharField(max_length=7, default='#6366f1')
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.name


class Transfer(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transfers')
    from_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transfers_out')
    to_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transfers_in')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.from_account} → {self.to_account}: {self.amount}'
