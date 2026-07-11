from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from transactions.models import Transaction

from .models import MomoInboxToken, MomoMessage, MomoPayment
from .parser import parse_momo_sms
from .serializers import MomoMessageSerializer
from .services import build_ussd, ingest_sms

TEXT_KEYS = ('text', 'message', 'sms', 'body', 'content', 'msg')


def _extract_text(request):
    """Pull the SMS body out of whatever shape the forwarder app sent
    (JSON field, form field, or a raw text/plain body)."""
    data = request.data
    if isinstance(data, dict):
        for key in TEXT_KEYS:
            value = data.get(key)
            if value:
                return str(value)
    if isinstance(data, str) and data.strip():
        return data
    try:
        return request.body.decode('utf-8', errors='ignore').strip()
    except Exception:
        return ''


class MomoInboxView(APIView):
    """Public webhook the phone forwarder POSTs each MoMo SMS to.
    Authenticated by the per-user inbox token, not a login session."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_value = (
            request.headers.get('X-Inbox-Token')
            or request.query_params.get('token')
            or (request.data.get('token') if isinstance(request.data, dict) else None)
        )
        if not token_value:
            return Response({'detail': 'Missing token.'}, status=status.HTTP_401_UNAUTHORIZED)

        token = MomoInboxToken.objects.filter(token=token_value, enabled=True).select_related('user').first()
        if token is None:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_401_UNAUTHORIZED)

        text = _extract_text(request)
        if not text:
            return Response({'detail': 'No message text.'}, status=status.HTTP_400_BAD_REQUEST)

        message = ingest_sms(token.user, text)
        # Always 200 for a valid token so the forwarder doesn't retry endlessly.
        return Response({
            'status': message.status,
            'transaction_id': message.transaction_id,
            'amount': message.amount,
            'direction': message.direction,
        })


class MomoSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _payload(self, request, token):
        counts = {
            'recorded': MomoMessage.objects.filter(user=request.user, status=MomoMessage.RECORDED).count(),
            'duplicate': MomoMessage.objects.filter(user=request.user, status=MomoMessage.DUPLICATE).count(),
            'ignored': MomoMessage.objects.filter(user=request.user, status=MomoMessage.IGNORED).count(),
        }
        return {
            'enabled': token.enabled,
            'token': token.token,
            'inbox_path': '/api/momo/inbox/',
            'webhook_url': request.build_absolute_uri(f'/api/momo/inbox/?token={token.token}'),
            'pay_send_ussd': token.pay_send_ussd,
            'pay_merchant_ussd': token.pay_merchant_ussd,
            'counts': counts,
        }

    def get(self, request):
        token, _ = MomoInboxToken.objects.get_or_create(user=request.user)
        return Response(self._payload(request, token))

    def patch(self, request):
        """Update the editable USSD payment templates."""
        token, _ = MomoInboxToken.objects.get_or_create(user=request.user)
        fields = []
        for field in ('pay_send_ussd', 'pay_merchant_ussd'):
            value = request.data.get(field)
            if value:
                if '{amount}' not in value:
                    return Response(
                        {'detail': f'{field} must contain the {{amount}} placeholder.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                setattr(token, field, value.strip())
                fields.append(field)
        if fields:
            token.save(update_fields=fields)
        return Response(self._payload(request, token))

    def post(self, request):
        """Rotate the token (invalidates the old webhook URL)."""
        token, _ = MomoInboxToken.objects.get_or_create(user=request.user)
        token.regenerate()
        return Response(self._payload(request, token))


class MomoPayView(APIView):
    """Start a payment from the app: builds the USSD dial string and records the
    expense immediately (reconciled later by the confirmation SMS)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        recipient = str(request.data.get('recipient', '')).strip()
        recipient_type = request.data.get('recipient_type', MomoPayment.PHONE)
        category_id = request.data.get('category') or None

        if not recipient:
            return Response({'detail': 'Enter a phone number or merchant code.'}, status=status.HTTP_400_BAD_REQUEST)
        if recipient_type not in (MomoPayment.PHONE, MomoPayment.MERCHANT):
            recipient_type = MomoPayment.PHONE
        try:
            amount = Decimal(str(request.data.get('amount')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Enter a valid amount.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = Category.objects.filter(id=category_id, user=request.user, type='expense').first()
            if category is None:
                return Response({'detail': 'Invalid category.'}, status=status.HTTP_400_BAD_REQUEST)

        token, _ = MomoInboxToken.objects.get_or_create(user=request.user)
        ussd = build_ussd(token, recipient, recipient_type, amount)

        label = 'merchant' if recipient_type == MomoPayment.MERCHANT else 'number'
        transaction = Transaction.objects.create(
            user=request.user,
            category=category,
            type=Transaction.EXPENSE,
            amount=amount,
            description=f'MoMo payment to {recipient} ({label})'[:255],
            date=timezone.localdate(),
        )
        payment = MomoPayment.objects.create(
            user=request.user, transaction=transaction, recipient=recipient,
            recipient_type=recipient_type, amount=amount, ussd=ussd,
        )
        return Response({
            'ussd': ussd,
            'payment_id': payment.id,
            'transaction_id': transaction.id,
        }, status=status.HTTP_201_CREATED)


class MomoTestView(APIView):
    """Preview how a pasted SMS would be parsed, without saving anything."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        text = _extract_text(request)
        parsed = parse_momo_sms(text)
        if parsed is None:
            return Response({'parsed': False})
        return Response({
            'parsed': True,
            'direction': parsed.direction,
            'transaction_type': parsed.transaction_type,
            'kind': parsed.kind,
            'amount': parsed.amount,
            'party': parsed.party,
            'txid': parsed.txid,
            'date': parsed.occurred_on,
        })


class MomoMessagesView(ListAPIView):
    serializer_class = MomoMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MomoMessage.objects.filter(user=self.request.user)[:50]
