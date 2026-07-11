"""Turn a received MoMo SMS into a Transaction, with de-duplication."""
import hashlib
import re
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from categories.models import Category
from transactions.models import Transaction

from .models import MomoMessage, MomoPayment
from .parser import parse_momo_sms

# How long after starting a Pay-screen payment we'll still match its confirmation SMS.
RECONCILE_WINDOW = timedelta(hours=3)

# Map a parsed transaction kind to one of the user's default category names.
KIND_TO_CATEGORY = {
    'airtime': 'Airtime & Data',
}

KIND_DESCRIPTIONS = {
    'received': 'MoMo received',
    'sent': 'MoMo sent',
    'payment': 'MoMo payment',
    'airtime': 'MoMo airtime/data',
    'withdrawal': 'MoMo cash withdrawal',
    'deposit': 'MoMo deposit',
    'other': 'MoMo transaction',
}


def _dedup_key(parsed, text):
    if parsed and parsed.txid:
        return parsed.txid
    # No transaction id in the SMS — fall back to a hash of its normalised text.
    normalised = re.sub(r'\s+', ' ', text.strip()).lower()
    return 'h:' + hashlib.sha1(normalised.encode('utf-8')).hexdigest()


def _describe(parsed):
    base = KIND_DESCRIPTIONS.get(parsed.kind, KIND_DESCRIPTIONS['other'])
    if parsed.party:
        connector = 'from' if parsed.direction == 'in' else 'to'
        return f'{base} {connector} {parsed.party}'[:255]
    return base


def _pick_category(user, parsed):
    name = KIND_TO_CATEGORY.get(parsed.kind)
    if not name:
        return None
    return Category.objects.filter(user=user, name=name, type='expense').first()


def _find_pending_payment(user, parsed):
    """Match an outgoing SMS to a Pay-screen payment the user just started, so we
    reconcile instead of creating a second transaction for the same spend."""
    if parsed.direction != 'out':
        return None
    since = timezone.now() - RECONCILE_WINDOW
    return (
        MomoPayment.objects
        .filter(user=user, reconciled=False, amount=parsed.amount, created_at__gte=since,
                transaction__isnull=False)
        .order_by('-created_at')
        .first()
    )


def build_ussd(token, recipient, recipient_type, amount):
    template = token.pay_merchant_ussd if recipient_type == MomoPayment.MERCHANT else token.pay_send_ussd
    # MoMo dial strings want a plain number: 5000, not 5000.00.
    amount = Decimal(amount)
    amount_str = str(int(amount)) if amount == amount.to_integral_value() else str(amount.normalize())
    return template.replace('{recipient}', str(recipient).strip()).replace('{amount}', amount_str)


def ingest_sms(user, text):
    """Parse `text` and record it. Returns the created MomoMessage (its `status`
    tells you what happened: recorded / duplicate / ignored)."""
    text = (text or '').strip()
    parsed = parse_momo_sms(text)

    if parsed is None:
        return MomoMessage.objects.create(
            user=user, raw_text=text, dedup_key=_dedup_key(None, text), status=MomoMessage.IGNORED,
        )

    dedup_key = _dedup_key(parsed, text)
    already = MomoMessage.objects.filter(
        user=user, dedup_key=dedup_key, status=MomoMessage.RECORDED,
    ).exists()

    common = dict(
        user=user, raw_text=text, dedup_key=dedup_key,
        direction=parsed.direction, kind=parsed.kind, amount=parsed.amount,
        party=parsed.party, txid=parsed.txid,
    )

    if already:
        return MomoMessage.objects.create(status=MomoMessage.DUPLICATE, **common)

    # Did the user just start this payment from the Pay screen? Reconcile it
    # instead of recording a duplicate transaction.
    pending = _find_pending_payment(user, parsed)
    if pending is not None:
        message = MomoMessage.objects.create(
            status=MomoMessage.RECORDED, transaction=pending.transaction, **common,
        )
        # Stamp the real transaction id onto the optimistic transaction.
        txn = pending.transaction
        if parsed.txid:
            txn.description = f'{txn.description} (TxId {parsed.txid})'[:255]
            txn.save(update_fields=['description'])
        pending.reconciled = True
        pending.momo_message = message
        pending.save(update_fields=['reconciled', 'momo_message'])
        return message

    transaction = Transaction.objects.create(
        user=user,
        category=_pick_category(user, parsed),
        type=parsed.transaction_type,
        amount=parsed.amount,
        description=_describe(parsed),
        date=parsed.occurred_on,
    )
    return MomoMessage.objects.create(status=MomoMessage.RECORDED, transaction=transaction, **common)
