from rest_framework import serializers

from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Loan
        fields = ['id', 'user', 'person', 'amount', 'direction', 'date', 'note', 'settled', 'created_at']
        read_only_fields = ['id', 'created_at']
