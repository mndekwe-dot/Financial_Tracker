"""Full-account data-export endpoint.

Gathers all of the authenticated user's data across every app and returns it
as a single downloadable JSON document.
"""

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from budgets.models import Budget
from categories.models import Category
from goals.models import SavingsGoal
from loans.models import Loan
from moneyaccounts.models import Account, Transfer
from recurring.models import RecurringTransaction
from shopping.models import ShoppingList
from transactions.models import Transaction
from ussd.models import UssdCode
from wallet.models import Wallet


def _dec(value):
    """Serialize a value: Decimals -> str, dates/datetimes -> isoformat str."""
    if value is None:
        return None
    return str(value)


def _serialize_category(c):
    return {
        'id': c.id,
        'name': c.name,
        'type': c.type,
        'color': c.color,
        'icon': c.icon,
        'created_at': _dec(c.created_at),
    }


def _serialize_transaction(t):
    return {
        'id': t.id,
        'category_id': t.category_id,
        'account_id': t.account_id,
        'type': t.type,
        'amount': _dec(t.amount),
        'description': t.description,
        'tags': t.tags,
        'date': _dec(t.date),
        'created_at': _dec(t.created_at),
    }


def _serialize_account(a):
    return {
        'id': a.id,
        'name': a.name,
        'type': a.type,
        'opening_balance': _dec(a.opening_balance),
        'color': a.color,
        'archived': a.archived,
        'created_at': _dec(a.created_at),
    }


def _serialize_transfer(t):
    return {
        'id': t.id,
        'from_account_id': t.from_account_id,
        'to_account_id': t.to_account_id,
        'amount': _dec(t.amount),
        'date': _dec(t.date),
        'note': t.note,
        'created_at': _dec(t.created_at),
    }


def _serialize_budget(b):
    return {
        'id': b.id,
        'category_id': b.category_id,
        'amount': _dec(b.amount),
        'month': b.month,
        'year': b.year,
        'created_at': _dec(b.created_at),
    }


def _serialize_loan(l):
    return {
        'id': l.id,
        'person': l.person,
        'amount': _dec(l.amount),
        'direction': l.direction,
        'date': _dec(l.date),
        'note': l.note,
        'settled': l.settled,
        'created_at': _dec(l.created_at),
    }


def _serialize_shopping_item(i):
    return {
        'id': i.id,
        'shopping_list_id': i.shopping_list_id,
        'name': i.name,
        'category': i.category,
        'planned_unit_price': _dec(i.planned_unit_price),
        'planned_quantity': _dec(i.planned_quantity),
        'bought': i.bought,
        'actual_unit_price': _dec(i.actual_unit_price),
        'actual_quantity': _dec(i.actual_quantity),
        'created_at': _dec(i.created_at),
    }


def _serialize_shopping_list(sl):
    return {
        'id': sl.id,
        'name': sl.name,
        'created_at': _dec(sl.created_at),
        'items': [_serialize_shopping_item(i) for i in sl.items.all()],
    }


def _serialize_goal(g):
    return {
        'id': g.id,
        'name': g.name,
        'target_amount': _dec(g.target_amount),
        'saved_amount': _dec(g.saved_amount),
        'color': g.color,
        'target_date': _dec(g.target_date),
        'created_at': _dec(g.created_at),
    }


def _serialize_recurring(r):
    return {
        'id': r.id,
        'category_id': r.category_id,
        'type': r.type,
        'amount': _dec(r.amount),
        'description': r.description,
        'frequency': r.frequency,
        'next_date': _dec(r.next_date),
        'active': r.active,
        'created_at': _dec(r.created_at),
    }


def _serialize_wallet(w):
    if w is None:
        return None
    return {
        'id': w.id,
        'starting_balance': _dec(w.starting_balance),
        'updated_at': _dec(w.updated_at),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Return every piece of the current user's data as a downloadable JSON file."""
    user = request.user

    wallet = Wallet.objects.filter(user=user).first()

    payload = {
        'exported_at': timezone.now().isoformat(),
        'username': user.get_username(),
        'categories': [
            _serialize_category(c)
            for c in Category.objects.filter(user=user)
        ],
        'transactions': [
            _serialize_transaction(t)
            for t in Transaction.objects.filter(user=user)
        ],
        'budgets': [
            _serialize_budget(b)
            for b in Budget.objects.filter(user=user)
        ],
        'loans': [
            _serialize_loan(l)
            for l in Loan.objects.filter(user=user)
        ],
        'shopping_lists': [
            _serialize_shopping_list(sl)
            for sl in ShoppingList.objects.filter(user=user).prefetch_related('items')
        ],
        'goals': [
            _serialize_goal(g)
            for g in SavingsGoal.objects.filter(user=user)
        ],
        'recurring': [
            _serialize_recurring(r)
            for r in RecurringTransaction.objects.filter(user=user)
        ],
        'accounts': [
            _serialize_account(a)
            for a in Account.objects.filter(user=user)
        ],
        'transfers': [
            _serialize_transfer(t)
            for t in Transfer.objects.filter(user=user)
        ],
        'ussd_codes': [
            {'id': u.id, 'service': u.service, 'label': u.label, 'code': u.code, 'created_at': _dec(u.created_at)}
            for u in UssdCode.objects.filter(user=user)
        ],
        'wallet': _serialize_wallet(wallet),
    }

    response = Response(payload)
    response['Content-Disposition'] = 'attachment; filename="financial-tracker-export.json"'
    return response
