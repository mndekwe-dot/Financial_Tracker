from decimal import Decimal

from rest_framework import serializers

from .models import ShoppingList, ShoppingItem


class ShoppingItemSerializer(serializers.ModelSerializer):
    planned_total = serializers.SerializerMethodField()
    actual_total = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingItem
        fields = [
            'id', 'shopping_list', 'name', 'category',
            'planned_unit_price', 'planned_quantity', 'planned_total',
            'bought', 'actual_unit_price', 'actual_quantity', 'actual_total',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_planned_total(self, obj):
        return obj.planned_total

    def get_actual_total(self, obj):
        return obj.actual_total

    def validate_shopping_list(self, shopping_list):
        request = self.context['request']
        if shopping_list.user_id != request.user.id:
            raise serializers.ValidationError('Invalid shopping list.')
        return shopping_list

    def validate_planned_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def validate_planned_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value


class ShoppingListSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    items = ShoppingItemSerializer(many=True, read_only=True)
    planned_grand_total = serializers.SerializerMethodField()
    actual_grand_total = serializers.SerializerMethodField()
    planned_bought_total = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = [
            'id', 'user', 'name', 'items',
            'planned_grand_total', 'actual_grand_total', 'planned_bought_total', 'change',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_planned_grand_total(self, obj):
        return sum((i.planned_total for i in obj.items.all()), Decimal('0'))

    def get_actual_grand_total(self, obj):
        return sum((i.actual_total for i in obj.items.all() if i.bought), Decimal('0'))

    def get_planned_bought_total(self, obj):
        return sum((i.planned_total for i in obj.items.all() if i.bought), Decimal('0'))

    def get_change(self, obj):
        # How the grand total moved between planning and shopping,
        # comparing only the items actually bought so far.
        return self.get_actual_grand_total(obj) - self.get_planned_bought_total(obj)
