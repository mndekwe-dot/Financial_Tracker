from rest_framework import viewsets, permissions

from .models import Account, Transfer
from .serializers import AccountSerializer, TransferSerializer


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request and self.request.user and self.request.user.is_authenticated:
            from .services import compute_account_balances
            context['balance_maps'] = compute_account_balances(self.request.user)
        return context


class TransferViewSet(viewsets.ModelViewSet):
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transfer.objects.filter(user=self.request.user)
