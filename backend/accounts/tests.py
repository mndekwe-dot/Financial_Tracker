from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

User = get_user_model()


class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='oldpassword123',
        )

    def test_password_reset_request_sends_email(self):
        response = self.client.post('/api/auth/password-reset/', {'email': 'alice@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Password Reset Request', mail.outbox[0].subject)
        self.assertIn('/reset-password?uid=', mail.outbox[0].body)

    def test_password_reset_request_nonexistent_email_does_not_leak(self):
        response = self.client.post('/api/auth/password-reset/', {'email': 'nonexistent@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_confirm_success(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword999!',
        })
        self.assertEqual(response.status_code, 200)

        # Verify login works with new password
        login_res = self.client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'BrandNewPassword999!',
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertIn('access', login_res.data)

    def test_password_reset_confirm_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': uid,
            'token': 'invalid-token',
            'new_password': 'BrandNewPassword999!',
        })
        self.assertEqual(response.status_code, 400)
