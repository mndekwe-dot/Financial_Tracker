from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from transactions.models import Transaction
from .models import Account, Transfer


def account_balance(account):
    """Opening balance adjusted by this account's transactions and transfers."""
    txns = Transaction.objects.filter(account=account)
    income = txns.filter(type=Transaction.INCOME).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    expense = txns.filter(type=Transaction.EXPENSE).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    moved_out = account.transfers_out.aggregate(t=Sum('amount'))['t'] or Decimal('0')
    moved_in = account.transfers_in.aggregate(t=Sum('amount'))['t'] or Decimal('0')
    return account.opening_balance + income - expense + moved_in - moved_out


class AccountSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ['id', 'user', 'name', 'type', 'opening_balance', 'color', 'archived', 'balance', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_balance(self, obj):
        return account_balance(obj)


class TransferSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    from_account_name = serializers.CharField(source='from_account.name', read_only=True)
    to_account_name = serializers.CharField(source='to_account.name', read_only=True)

    class Meta:
        model = Transfer
        fields = [
            'id', 'user', 'from_account', 'from_account_name',
            'to_account', 'to_account_name', 'amount', 'date', 'note', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        for field in ('from_account', 'to_account'):
            acc = attrs.get(field)
            if acc is not None and request and acc.user_id != request.user.id:
                raise serializers.ValidationError('Invalid account.')
        if attrs.get('from_account') and attrs.get('from_account') == attrs.get('to_account'):
            raise serializers.ValidationError('Choose two different accounts.')
        return attrs

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            qs = Account.objects.filter(user=request.user)
            for field in ('from_account', 'to_account'):
                if field in self.fields:
                    self.fields[field].queryset = qs
