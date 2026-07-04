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
    today = date.today()
    month = int(request.query_params.get('month', today.month))
    year = int(request.query_params.get('year', today.year))

    qs = Transaction.objects.filter(user=request.user, date__year=year, date__month=month)

    total_income = qs.filter(type=Transaction.INCOME).aggregate(total=Sum('amount'))['total'] or 0
    total_expense = qs.filter(type=Transaction.EXPENSE).aggregate(total=Sum('amount'))['total'] or 0

    by_category = (
        qs.filter(type=Transaction.EXPENSE)
        .values('category__id', 'category__name', 'category__color', 'category__icon')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )
    by_category = list(by_category)

    if year == today.year and month == today.month:
        days_elapsed = today.day
    else:
        days_elapsed = calendar.monthrange(year, month)[1]
    avg_daily_expense = round(total_expense / days_elapsed, 2) if days_elapsed else 0

    top_category = by_category[0] if by_category else None

    busiest = (
        qs.filter(type=Transaction.EXPENSE)
        .values('date')
        .annotate(count=Count('id'))
        .order_by('-count', '-date')
        .first()
    )
    busiest_day = None
    if busiest:
        busiest_day = {
            'date': busiest['date'],
            'weekday': busiest['date'].strftime('%A'),
            'count': busiest['count'],
        }

    monthly_trend = []
    for i in range(5, -1, -1):
        m = month - i
        y = year
        while m <= 0:
            m += 12
            y -= 1
        month_qs = Transaction.objects.filter(user=request.user, date__year=y, date__month=m)
        income = month_qs.filter(type=Transaction.INCOME).aggregate(total=Sum('amount'))['total'] or 0
        expense = month_qs.filter(type=Transaction.EXPENSE).aggregate(total=Sum('amount'))['total'] or 0
        monthly_trend.append({
            'month': f'{y}-{m:02d}',
            'income': income,
            'expense': expense,
        })

    return Response({
        'month': month,
        'year': year,
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': total_income - total_expense,
        'by_category': by_category,
        'monthly_trend': monthly_trend,
        'avg_daily_expense': avg_daily_expense,
        'top_category': top_category,
        'busiest_day': busiest_day,
    })


WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def weekly_breakdown(request):
    today = date.today()
    month = int(request.query_params.get('month', today.month))
    year = int(request.query_params.get('year', today.year))

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    first_monday = first_day - timedelta(days=first_day.weekday())
    last_monday = last_day - timedelta(days=last_day.weekday())

    expenses = Transaction.objects.filter(
        user=request.user,
        type=Transaction.EXPENSE,
        date__gte=first_monday,
        date__lte=last_monday + timedelta(days=4),
    ).values('date').annotate(total=Sum('amount'))
    totals_by_date = {row['date']: row['total'] for row in expenses}

    weeks = []
    monday = first_monday
    while monday <= last_monday:
        friday = monday + timedelta(days=4)
        days = []
        week_total = 0
        for i, weekday_name in enumerate(WEEKDAY_NAMES):
            d = monday + timedelta(days=i)
            total = totals_by_date.get(d, 0)
            week_total += total
            days.append({'weekday': weekday_name, 'date': d, 'total': total})

        if monday.month == friday.month:
            label = f'{monday.day:02d}-{friday.day:02d}/{monday.month:02d}'
        else:
            label = f'{monday.day:02d}-{friday.day:02d}/{monday.month:02d}-{friday.month:02d}'

        weeks.append({
            'label': label,
            'start': monday,
            'end': friday,
            'days': days,
            'total': week_total,
        })
        monday += timedelta(days=7)

    return Response({'month': month, 'year': year, 'weeks': weeks})
