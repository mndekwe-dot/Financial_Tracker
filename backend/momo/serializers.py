from rest_framework import serializers

from .models import MomoMessage


class MomoMessageSerializer(serializers.ModelSerializer):
    transaction_type = serializers.SerializerMethodField()

    class Meta:
        model = MomoMessage
        fields = [
            'id', 'status', 'direction', 'kind', 'amount', 'party', 'txid',
            'transaction', 'transaction_type', 'raw_text', 'created_at',
        ]

    def get_transaction_type(self, obj):
        return 'income' if obj.direction == 'in' else 'expense' if obj.direction == 'out' else None
