from decimal import Decimal
from django.db.models import Sum
from transactions.models import Transaction
from .models import Transfer


def compute_account_balances(user):
    """
    Computes balances for all accounts owned by `user` in 3 grouped queries total,
    avoiding the N+1 problem where each account would otherwise fire 4 individual SQL queries.
    Returns lookup maps for income, expense, and in/out transfers.
    """
    # 1. Grouped transactions by (account_id, type)
    txn_totals = (
        Transaction.objects.filter(user=user, account__isnull=False)
        .values('account_id', 'type')
        .annotate(total=Sum('amount'))
    )
    income_by_acc = {}
    expense_by_acc = {}
    for row in txn_totals:
        acc_id = row['account_id']
        if row['type'] == Transaction.INCOME:
            income_by_acc[acc_id] = row['total'] or Decimal('0')
        elif row['type'] == Transaction.EXPENSE:
            expense_by_acc[acc_id] = row['total'] or Decimal('0')

    # 2. Transfers out grouped by from_account
    out_totals = (
        Transfer.objects.filter(user=user)
        .values('from_account_id')
        .annotate(total=Sum('amount'))
    )
    out_by_acc = {r['from_account_id']: (r['total'] or Decimal('0')) for r in out_totals}

    # 3. Transfers in grouped by to_account
    in_totals = (
        Transfer.objects.filter(user=user)
        .values('to_account_id')
        .annotate(total=Sum('amount'))
    )
    in_by_acc = {r['to_account_id']: (r['total'] or Decimal('0')) for r in in_totals}

    return {
        'income': income_by_acc,
        'expense': expense_by_acc,
        'transfers_out': out_by_acc,
        'transfers_in': in_by_acc,
    }


def single_account_balance(account):
    """Fallback single-account balance calculation for isolated instances."""
    txns = Transaction.objects.filter(account=account)
    income = txns.filter(type=Transaction.INCOME).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    expense = txns.filter(type=Transaction.EXPENSE).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    moved_out = account.transfers_out.aggregate(t=Sum('amount'))['t'] or Decimal('0')
    moved_in = account.transfers_in.aggregate(t=Sum('amount'))['t'] or Decimal('0')
    return account.opening_balance + income - expense + moved_in - moved_out

