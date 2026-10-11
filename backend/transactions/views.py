import calendar
from datetime import date, timedelta

from django.db.models import Count, Sum
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user)
        params = self.request.query_params
        if t := params.get('type'):
            qs = qs.filter(type=t)
        if category_id := params.get('category'):
            qs = qs.filter(category_id=category_id)
        if start_date := params.get('start_date'):
            qs = qs.filter(date__gte=start_date)
        if end_date := params.get('end_date'):
            qs = qs.filter(date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def summary(request):
    from .selectors import get_transaction_summary
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    data = get_transaction_summary(request.user, month, year)
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def weekly_breakdown(request):
    from .selectors import get_weekly_breakdown
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    data = get_weekly_breakdown(request.user, month, year)
    return Response(data)

