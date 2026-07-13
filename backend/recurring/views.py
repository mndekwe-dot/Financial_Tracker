from datetime import date

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from transactions.models import Transaction
from .models import RecurringTransaction
from .serializers import RecurringTransactionSerializer


class RecurringTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RecurringTransaction.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def run_due(self, request):
        """Post real transactions for any recurrences that have come due,
        catching up if several periods were missed."""
        today = date.today()
        created = 0
        due = RecurringTransaction.objects.filter(user=request.user, active=True, next_date__lte=today)
        for r in due:
            guard = 0
            while r.next_date <= today and guard < 60:
                Transaction.objects.create(
                    user=request.user,
                    category=r.category,
                    type=r.type,
                    amount=r.amount,
                    description=r.description,
                    date=r.next_date,
                )
                r.advance()
                created += 1
                guard += 1
            r.save()
        return Response({'created': created})
