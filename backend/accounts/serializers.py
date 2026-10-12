from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from categories.defaults import create_default_categories

from .models import UserSecurity

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    has_passphrase = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'has_passphrase']

    def get_has_passphrase(self, obj):
        return hasattr(obj, 'security') and obj.security.has_passphrase()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

    def validate_username(self, value):
        if User.objects.filter(username=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('That username is taken.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class SetPassphraseSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    passphrase = serializers.CharField(write_only=True, min_length=6)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        sec, _ = UserSecurity.objects.get_or_create(user=user)
        sec.set_passphrase(self.validated_data['passphrase'])
        sec.save()
        return sec


class PassphraseResetSerializer(serializers.Serializer):
    username = serializers.CharField()
    passphrase = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    passphrase = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'passphrase']

    def create(self, validated_data):
        passphrase = validated_data.pop('passphrase', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        if passphrase and passphrase.strip():
            sec, _ = UserSecurity.objects.get_or_create(user=user)
            sec.set_passphrase(passphrase)
            sec.save()
        create_default_categories(user)
        return user
