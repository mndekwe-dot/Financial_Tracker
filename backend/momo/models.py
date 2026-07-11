import secrets

from django.conf import settings
from django.db import models

from transactions.models import Transaction


def generate_token():
    # URL-safe secret the Android forwarder uses to authenticate its POSTs.
    return secrets.token_urlsafe(32)


# USSD payment templates. {recipient} and {amount} are filled in at pay time.
# Defaults follow MTN Rwanda (*182#) — editable per user so they match whatever
# code you normally dial in your country.
DEFAULT_SEND_USSD = '*182*1*1*{recipient}*{amount}#'
DEFAULT_MERCHANT_USSD = '*182*8*1*{recipient}*{amount}#'


class MomoInboxToken(models.Model):
    """Per-user secret that lets a phone forwarder post SMS to the webhook
    without a full login. Rotatable if it ever leaks. Also holds the user's
    USSD payment templates."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='momo_token')
    token = models.CharField(max_length=64, unique=True, default=generate_token)
    enabled = models.BooleanField(default=True)
    pay_send_ussd = models.CharField(max_length=80, default=DEFAULT_SEND_USSD)
    pay_merchant_ussd = models.CharField(max_length=80, default=DEFAULT_MERCHANT_USSD)
    created_at = models.DateTimeField(auto_now_add=True)

    def regenerate(self):
        self.token = generate_token()
        self.save(update_fields=['token'])
        return self.token

    def __str__(self):
        return f'MoMo token for {self.user}'


class MomoMessage(models.Model):
    """Audit log of every SMS the webhook received — parsed or not — plus the
    transaction it produced. Also backs duplicate detection via dedup_key."""
    RECORDED = 'recorded'
    DUPLICATE = 'duplicate'
    IGNORED = 'ignored'
    STATUS_CHOICES = [
        (RECORDED, 'Recorded'),
        (DUPLICATE, 'Duplicate'),
        (IGNORED, 'Ignored'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='momo_messages')
    raw_text = models.TextField()
    dedup_key = models.CharField(max_length=128, db_index=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES)
    # Parsed fields (blank when the message couldn't be understood)
    direction = models.CharField(max_length=3, blank=True)  # 'in' | 'out'
    kind = models.CharField(max_length=20, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    party = models.CharField(max_length=160, blank=True)
    txid = models.CharField(max_length=80, blank=True)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='momo_source'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.status} {self.direction} {self.amount} ({self.user_id})'


class MomoPayment(models.Model):
    """A payment the user started from the app's Pay screen. The transaction is
    recorded immediately (optimistically); when the matching MoMo confirmation
    SMS arrives it reconciles here so nothing is double-counted."""
    PHONE = 'phone'
    MERCHANT = 'merchant'
    RECIPIENT_CHOICES = [(PHONE, 'Phone number'), (MERCHANT, 'Merchant code')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='momo_payments')
    transaction = models.OneToOneField(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='momo_payment'
    )
    recipient = models.CharField(max_length=60)
    recipient_type = models.CharField(max_length=10, choices=RECIPIENT_CHOICES, default=PHONE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    ussd = models.CharField(max_length=120)
    reconciled = models.BooleanField(default=False)
    momo_message = models.ForeignKey(MomoMessage, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Pay {self.amount} to {self.recipient} ({self.user_id})'
