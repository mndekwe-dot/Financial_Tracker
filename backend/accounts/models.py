from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class UserSecurity(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='security',
    )
    passphrase_hash = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_passphrase(self, raw_passphrase):
        normalized = ' '.join(raw_passphrase.strip().lower().split())
        self.passphrase_hash = make_password(normalized)

    def check_passphrase(self, raw_passphrase):
        if not self.passphrase_hash:
            return False
        normalized = ' '.join(raw_passphrase.strip().lower().split())
        return check_password(normalized, self.passphrase_hash)

    def has_passphrase(self):
        return bool(self.passphrase_hash)

    def __str__(self):
        return f'Security for {self.user.username}'
