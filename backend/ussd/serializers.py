from rest_framework import serializers

from .models import UssdCode


class UssdCodeSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = UssdCode
        fields = ['id', 'user', 'service', 'label', 'code', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Enter a USSD code.')
        return value

    def validate_service(self, value):
        value = value.strip()
        return value or 'Other'
