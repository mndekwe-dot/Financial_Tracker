from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Category
        fields = ['id', 'user', 'name', 'type', 'color', 'icon', 'created_at']
        read_only_fields = ['id', 'created_at']
