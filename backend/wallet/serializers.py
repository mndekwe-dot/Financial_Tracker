from rest_framework import serializers

from .models import Wallet


class WalletSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()
    remaining_with_loans = serializers.SerializerMethodField()
    total_income = serializers.SerializerMethodField()
    total_expense = serializers.SerializerMethodField()
    owed_to_me = serializers.SerializerMethodField()
    i_owe = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = [
            'starting_balance', 'total_income', 'total_expense',
            'owed_to_me', 'i_owe', 'remaining', 'remaining_with_loans', 'updated_at',
        ]
        read_only_fields = ['updated_at']

    def _totals(self, obj):
        if not hasattr(self, '_cache'):
            from django.db.models import Sum
            from transactions.models import Transaction
            from loans.models import Loan

            income = Transaction.objects.filter(user=obj.user, type=Transaction.INCOME).aggregate(t=Sum('amount'))['t'] or 0
            expense = Transaction.objects.filter(user=obj.user, type=Transaction.EXPENSE).aggregate(t=Sum('amount'))['t'] or 0
            owed_to_me = Loan.objects.filter(user=obj.user, direction=Loan.OWED_TO_ME, settled=False).aggregate(t=Sum('amount'))['t'] or 0
            i_owe = Loan.objects.filter(user=obj.user, direction=Loan.I_OWE, settled=False).aggregate(t=Sum('amount'))['t'] or 0
            self._cache = {'income': income, 'expense': expense, 'owed_to_me': owed_to_me, 'i_owe': i_owe}
        return self._cache

    def get_total_income(self, obj):
        return self._totals(obj)['income']

    def get_total_expense(self, obj):
        return self._totals(obj)['expense']

    def get_owed_to_me(self, obj):
        return self._totals(obj)['owed_to_me']

    def get_i_owe(self, obj):
        return self._totals(obj)['i_owe']

    def get_remaining(self, obj):
        t = self._totals(obj)
        return obj.starting_balance + t['income'] - t['expense']

    def get_remaining_with_loans(self, obj):
        return self.get_remaining(obj) + self._totals(obj)['owed_to_me'] - self._totals(obj)['i_owe']
