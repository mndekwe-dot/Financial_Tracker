import calendar
from datetime import timedelta

from django.conf import settings
from django.db import models

from categories.models import Category


class RecurringTransaction(models.Model):
    INCOME = 'income'
    EXPENSE = 'expense'
    TYPE_CHOICES = [(INCOME, 'Income'), (EXPENSE, 'Expense')]

    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    YEARLY = 'yearly'
    FREQ_CHOICES = [(WEEKLY, 'Weekly'), (MONTHLY, 'Monthly'), (YEARLY, 'Yearly')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recurring')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=EXPENSE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    frequency = models.CharField(max_length=10, choices=FREQ_CHOICES, default=MONTHLY)
    next_date = models.DateField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['next_date']

    def __str__(self):
        return f'{self.description or self.type} {self.amount} ({self.frequency})'

    def advance(self):
        """Move next_date forward by one period, clamping the day for short months."""
        d = self.next_date
        if self.frequency == self.WEEKLY:
            self.next_date = d + timedelta(days=7)
        elif self.frequency == self.YEARLY:
            year = d.year + 1
            day = min(d.day, calendar.monthrange(year, d.month)[1])
            self.next_date = d.replace(year=year, day=day)
        else:  # monthly
            month = d.month + 1
            year = d.year + (1 if month > 12 else 0)
            month = month - 12 if month > 12 else month
            day = min(d.day, calendar.monthrange(year, month)[1])
            self.next_date = d.replace(year=year, month=month, day=day)
