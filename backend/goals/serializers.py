from decimal import Decimal

from rest_framework import serializers

from .models import SavingsGoal


class SavingsGoalSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    progress = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            'id', 'user', 'name', 'target_amount', 'saved_amount', 'color',
            'target_date', 'progress', 'remaining', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_progress(self, obj):
        if obj.target_amount and obj.target_amount > 0:
            return round(min(100.0, float(obj.saved_amount) / float(obj.target_amount) * 100), 1)
        return 0

    def get_remaining(self, obj):
        return max(obj.target_amount - obj.saved_amount, Decimal('0'))

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Target must be greater than zero.')
        return value
