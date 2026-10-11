from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from categories.models import Category
from transactions.models import Transaction
from .models import Budget


from .services import spent_for, prev_month


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    spent = serializers.SerializerMethodField()
    rollover = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'category_icon',
            'amount', 'month', 'year', 'spent', 'rollover', 'available', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_spent(self, obj):
        maps = self.context.get('budget_maps')
        if maps and 'spent_map' in maps:
            return maps['spent_map'].get(obj.category_id, Decimal('0'))
        return spent_for(obj.user, obj.category, obj.month, obj.year)

    def get_rollover(self, obj):
        maps = self.context.get('budget_maps')
        if maps and 'rollover_map' in maps:
            return maps['rollover_map'].get(obj.category_id, Decimal('0'))
        pm, py = prev_month(obj.month, obj.year)
        prev = Budget.objects.filter(user=obj.user, category=obj.category, month=pm, year=py).first()
        if not prev:
            return Decimal('0')
        return prev.amount - spent_for(obj.user, obj.category, pm, py)

    def get_available(self, obj):
        return obj.amount + self.get_rollover(obj)

    def validate_category(self, category):
        request = self.context['request']
        if category.user_id != request.user.id:
            raise serializers.ValidationError('Invalid category.')
        return category

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and 'category' in self.fields:
            self.fields['category'].queryset = Category.objects.filter(user=request.user)
