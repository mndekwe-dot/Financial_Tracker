from decimal import Decimal
from django.db.models import Sum
from transactions.models import Transaction
from .models import Budget


def prev_month(month, year):
    return (12, year - 1) if month == 1 else (month - 1, year)


def spent_for(user, category, month, year):
    """Fallback single category expense for a given month."""
    total = Transaction.objects.filter(
        user=user, category=category, type=Transaction.EXPENSE,
        date__year=year, date__month=month,
    ).aggregate(total=Sum('amount'))['total']
    return total or Decimal('0')


def compute_budget_context_maps(user, month=None, year=None):
    """
    Computes spent and rollover lookup maps for budgets in bulk queries,
    avoiding repeated N+1 queries per serialized budget row.
    """
    if not month or not year:
        return {}

    pm, py = prev_month(month, year)

    # 1. Current month expenses per category
    current_spent = (
        Transaction.objects.filter(
            user=user,
            type=Transaction.EXPENSE,
            date__year=year,
            date__month=month,
            category__isnull=False,
        )
        .values('category_id')
        .annotate(total=Sum('amount'))
    )
    spent_map = {row['category_id']: (row['total'] or Decimal('0')) for row in current_spent}

    # 2. Previous month expenses per category
    prev_spent = (
        Transaction.objects.filter(
            user=user,
            type=Transaction.EXPENSE,
            date__year=py,
            date__month=pm,
            category__isnull=False,
        )
        .values('category_id')
        .annotate(total=Sum('amount'))
    )
    prev_spent_map = {row['category_id']: (row['total'] or Decimal('0')) for row in prev_spent}

    # 3. Previous month budgets per category
    prev_budgets = (
        Budget.objects.filter(
            user=user,
            month=pm,
            year=py,
        )
        .values('category_id', 'amount')
    )
    prev_budget_map = {row['category_id']: row['amount'] for row in prev_budgets}

    # Precalculate rollover per category
    rollover_map = {}
    for cat_id, prev_amt in prev_budget_map.items():
        ps = prev_spent_map.get(cat_id, Decimal('0'))
        rollover_map[cat_id] = prev_amt - ps

    return {
        'spent_map': spent_map,
        'rollover_map': rollover_map,
    }
