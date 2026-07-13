from rest_framework import serializers

from categories.models import Category
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_color = serializers.CharField(source='category.color', read_only=True, default=None)
    category_icon = serializers.CharField(source='category.icon', read_only=True, default=None)
    account_name = serializers.CharField(source='account.name', read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = [
            'id', 'category', 'category_name', 'category_color', 'category_icon',
            'account', 'account_name',
            'type', 'amount', 'description', 'tags', 'date', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_category(self, category):
        request = self.context['request']
        if category is not None and category.user_id != request.user.id:
            raise serializers.ValidationError('Invalid category.')
        return category

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return amount

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and 'category' in self.fields:
            self.fields['category'].queryset = Category.objects.filter(user=request.user)
        if request and 'account' in self.fields:
            from moneyaccounts.models import Account
            self.fields['account'].queryset = Account.objects.filter(user=request.user)
