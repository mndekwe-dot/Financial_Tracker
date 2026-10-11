import calendar
from datetime import date, timedelta
from django.db.models import Count, Sum
from .models import Transaction

WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def get_transaction_summary(user, month=None, year=None):
    """
    Computes monthly financial statistics, category breakdown,
    daily average, busiest day, and 6-month historical trend.
    """
    today = date.today()
    month = int(month or today.month)
    year = int(year or today.year)

    qs = Transaction.objects.filter(user=user, date__year=year, date__month=month)

    total_income = qs.filter(type=Transaction.INCOME).aggregate(total=Sum('amount'))['total'] or 0
    total_expense = qs.filter(type=Transaction.EXPENSE).aggregate(total=Sum('amount'))['total'] or 0

    by_category = list(
        qs.filter(type=Transaction.EXPENSE)
        .values('category__id', 'category__name', 'category__color', 'category__icon')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )

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
        month_qs = Transaction.objects.filter(user=user, date__year=y, date__month=m)
        income = month_qs.filter(type=Transaction.INCOME).aggregate(total=Sum('amount'))['total'] or 0
        expense = month_qs.filter(type=Transaction.EXPENSE).aggregate(total=Sum('amount'))['total'] or 0
        monthly_trend.append({
            'month': f'{y}-{m:02d}',
            'income': income,
            'expense': expense,
        })

    return {
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
    }


def get_weekly_breakdown(user, month=None, year=None):
    """
    Computes 7-day (Monday to Sunday) weekly expense breakdowns
    spanning the entire calendar month.
    """
    today = date.today()
    month = int(month or today.month)
    year = int(year or today.year)

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    first_monday = first_day - timedelta(days=first_day.weekday())
    last_monday = last_day - timedelta(days=last_day.weekday())

    expenses = Transaction.objects.filter(
        user=user,
        type=Transaction.EXPENSE,
        date__gte=first_monday,
        date__lte=last_monday + timedelta(days=6),
    ).values('date').annotate(total=Sum('amount'))
    totals_by_date = {row['date']: row['total'] for row in expenses}

    weeks = []
    monday = first_monday
    while monday <= last_monday:
        sunday = monday + timedelta(days=6)
        days = []
        week_total = 0
        for i, weekday_name in enumerate(WEEKDAY_NAMES):
            d = monday + timedelta(days=i)
            total = totals_by_date.get(d, 0)
            week_total += total
            days.append({'weekday': weekday_name, 'date': d, 'total': total})

        if monday.month == sunday.month:
            label = f'{monday.day:02d}-{sunday.day:02d}/{monday.month:02d}'
        else:
            label = f'{monday.day:02d}-{sunday.day:02d}/{monday.month:02d}-{sunday.month:02d}'

        weeks.append({
            'label': label,
            'start': monday,
            'end': sunday,
            'days': days,
            'total': week_total,
        })
        monday += timedelta(days=7)

    return {'month': month, 'year': year, 'weeks': weeks}

