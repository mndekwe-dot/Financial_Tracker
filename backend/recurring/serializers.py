from rest_framework import serializers

from categories.models import Category
from .models import RecurringTransaction


class RecurringTransactionSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_color = serializers.CharField(source='category.color', read_only=True, default=None)
    category_icon = serializers.CharField(source='category.icon', read_only=True, default=None)

    class Meta:
        model = RecurringTransaction
        fields = [
            'id', 'user', 'category', 'category_name', 'category_color', 'category_icon',
            'type', 'amount', 'description', 'frequency', 'next_date', 'active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_category(self, category):
        request = self.context.get('request')
        if category is not None and request and category.user_id != request.user.id:
            raise serializers.ValidationError('Invalid category.')
        return category

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and 'category' in self.fields:
            self.fields['category'].queryset = Category.objects.filter(user=request.user)
