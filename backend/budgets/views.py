from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user)
        params = self.request.query_params
        if month := params.get('month'):
            qs = qs.filter(month=month)
        if year := params.get('year'):
            qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['post'])
    def copy(self, request):
        """Copy every budget from one month into another, skipping categories
        that already have a budget in the target month."""
        try:
            fm, fy = int(request.data['from_month']), int(request.data['from_year'])
            tm, ty = int(request.data['to_month']), int(request.data['to_year'])
        except (KeyError, ValueError, TypeError):
            return Response({'detail': 'from/to month and year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        existing = set(
            Budget.objects.filter(user=user, month=tm, year=ty).values_list('category_id', flat=True)
        )
        created = 0
        for b in Budget.objects.filter(user=user, month=fm, year=fy):
            if b.category_id in existing:
                continue
            Budget.objects.create(user=user, category=b.category, amount=b.amount, month=tm, year=ty)
            created += 1

        budgets = Budget.objects.filter(user=user, month=tm, year=ty)
        serializer = BudgetSerializer(budgets, many=True, context={'request': request})
        return Response({'created': created, 'budgets': serializer.data})
