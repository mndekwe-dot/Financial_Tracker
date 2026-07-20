from rest_framework import serializers

from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    account_name = serializers.CharField(source='account.name', read_only=True, default=None)
    lend_transaction_type = serializers.CharField(source='lend_transaction.type', read_only=True, default=None)
    repay_transaction_type = serializers.CharField(source='repay_transaction.type', read_only=True, default=None)

    class Meta:
        model = Loan
        fields = [
            'id', 'user', 'person', 'amount', 'direction', 'date', 'note', 'settled',
            'account', 'account_name',
            'lend_transaction', 'lend_transaction_type',
            'repay_transaction', 'repay_transaction_type',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'lend_transaction', 'repay_transaction']

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return amount

    def validate_account(self, account):
        request = self.context.get('request')
        if account is not None and request and account.user_id != request.user.id:
            raise serializers.ValidationError('Invalid account.')
        return account

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and 'account' in self.fields:
            from moneyaccounts.models import Account
            self.fields['account'].queryset = Account.objects.filter(user=request.user)
