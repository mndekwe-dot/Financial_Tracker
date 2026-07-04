from django.db.models import Sum
from rest_framework import serializers

from categories.models import Category
from transactions.models import Transaction
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    spent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'category_icon',
            'amount', 'month', 'year', 'spent', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_spent(self, obj):
        total = Transaction.objects.filter(
            user=obj.user,
            category=obj.category,
            type=Transaction.EXPENSE,
            date__year=obj.year,
            date__month=obj.month,
        ).aggregate(total=Sum('amount'))['total']
        return total or 0

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
