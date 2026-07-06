from django.conf import settings
from django.db import models


class ShoppingList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shopping_lists')
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ShoppingItem(models.Model):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=120)
    planned_unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    planned_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    bought = models.BooleanField(default=False)
    # Filled in while shopping; fall back to the planned values when unset
    actual_unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.name

    @property
    def planned_total(self):
        return self.planned_unit_price * self.planned_quantity

    @property
    def actual_total(self):
        if not self.bought:
            return None
        price = self.actual_unit_price if self.actual_unit_price is not None else self.planned_unit_price
        qty = self.actual_quantity if self.actual_quantity is not None else self.planned_quantity
        return price * qty
