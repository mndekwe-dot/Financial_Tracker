from django.contrib import admin

from .models import ShoppingList, ShoppingItem


class ShoppingItemInline(admin.TabularInline):
    model = ShoppingItem
    extra = 0


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'created_at']
    inlines = [ShoppingItemInline]
