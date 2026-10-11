"""Full-account data-import endpoint.

Takes a previously exported JSON backup file and restores/merges the user's data
safely inside a database transaction.
"""

from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from django.db import transaction as db_transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from categories.models import Category
from moneyaccounts.models import Account, Transfer
from transactions.models import Transaction
from budgets.models import Budget
from loans.models import Loan
from shopping.models import ShoppingList, ShoppingItem
from goals.models import SavingsGoal
from recurring.models import RecurringTransaction
from ussd.models import UssdCode
from wallet.models import Wallet


def _to_dec(val, default='0'):
    if val is None:
        return Decimal(default)
    try:
        return Decimal(str(val))
    except (InvalidOperation, TypeError):
        return Decimal(default)


def _to_date(val):
    if not val:
        return date.today()
    if isinstance(val, (datetime, date)):
        return val
    try:
        return datetime.fromisoformat(str(val).split('T')[0]).date()
    except Exception:
        return date.today()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_data(request):
    """Import user data from a previously exported JSON backup payload."""
    payload = request.data
    if not isinstance(payload, dict):
        return Response({'detail': 'Invalid JSON format. Expected an object.'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    stats = {
        'categories': 0,
        'accounts': 0,
        'transactions': 0,
        'budgets': 0,
        'loans': 0,
        'goals': 0,
        'shopping_lists': 0,
        'recurring': 0,
        'ussd_codes': 0,
    }

    try:
        with db_transaction.atomic():
            # 1. Categories (ID map: old_id -> new Category instance)
            cat_map = {}
            for item in payload.get('categories', []):
                old_id = item.get('id')
                name = item.get('name', '').strip()
                cat_type = item.get('type', 'expense')
                if not name:
                    continue
                cat, created = Category.objects.get_or_create(
                    user=user,
                    name=name,
                    type=cat_type,
                    defaults={
                        'color': item.get('color', '#6366f1'),
                        'icon': item.get('icon', 'Wallet'),
                    }
                )
                if created:
                    stats['categories'] += 1
                if old_id is not None:
                    cat_map[old_id] = cat

            # 2. Money Accounts (ID map: old_id -> new Account instance)
            acc_map = {}
            for item in payload.get('accounts', []):
                old_id = item.get('id')
                name = item.get('name', '').strip()
                if not name:
                    continue
                acc, created = Account.objects.get_or_create(
                    user=user,
                    name=name,
                    defaults={
                        'type': item.get('type', 'cash'),
                        'opening_balance': _to_dec(item.get('opening_balance')),
                        'color': item.get('color', '#0ea5e9'),
                        'archived': bool(item.get('archived', False)),
                    }
                )
                if created:
                    stats['accounts'] += 1
                if old_id is not None:
                    acc_map[old_id] = acc

            # 3. Transactions
            for item in payload.get('transactions', []):
                amt = _to_dec(item.get('amount'))
                if amt <= 0:
                    continue
                category = cat_map.get(item.get('category_id'))
                account = acc_map.get(item.get('account_id'))
                Transaction.objects.create(
                    user=user,
                    category=category,
                    account=account,
                    type=item.get('type', 'expense'),
                    amount=amt,
                    description=item.get('description', '')[:255],
                    tags=item.get('tags', '')[:255],
                    date=_to_date(item.get('date')),
                )
                stats['transactions'] += 1

            # 4. Budgets
            for item in payload.get('budgets', []):
                cat = cat_map.get(item.get('category_id'))
                if not cat:
                    continue
                month = int(item.get('month', 1))
                year = int(item.get('year', 2026))
                Budget.objects.update_or_create(
                    user=user,
                    category=cat,
                    month=month,
                    year=year,
                    defaults={'amount': _to_dec(item.get('amount'))}
                )
                stats['budgets'] += 1

            # 5. Loans
            for item in payload.get('loans', []):
                person = item.get('person', '').strip()
                if not person:
                    continue
                Loan.objects.create(
                    user=user,
                    person=person,
                    amount=_to_dec(item.get('amount')),
                    direction=item.get('direction', Loan.OWED_TO_ME),
                    date=_to_date(item.get('date')),
                    note=item.get('note', '')[:255],
                    settled=bool(item.get('settled', False)),
                )
                stats['loans'] += 1

            # 6. Savings Goals
            for item in payload.get('goals', []):
                name = item.get('name', '').strip()
                if not name:
                    continue
                SavingsGoal.objects.create(
                    user=user,
                    name=name,
                    target_amount=_to_dec(item.get('target_amount')),
                    saved_amount=_to_dec(item.get('saved_amount')),
                    color=item.get('color', '#3b82f6'),
                    target_date=_to_date(item.get('target_date')) if item.get('target_date') else None,
                )
                stats['goals'] += 1

            # 7. Shopping Lists & Items
            for sl in payload.get('shopping_lists', []):
                name = sl.get('name', '').strip()
                if not name:
                    continue
                list_obj = ShoppingList.objects.create(user=user, name=name)
                stats['shopping_lists'] += 1
                for it in sl.get('items', []):
                    item_name = it.get('name', '').strip()
                    if not item_name:
                        continue
                    ShoppingItem.objects.create(
                        shopping_list=list_obj,
                        name=item_name,
                        category=it.get('category', 'general'),
                        planned_unit_price=_to_dec(it.get('planned_unit_price')),
                        planned_quantity=_to_dec(it.get('planned_quantity', '1')),
                        bought=bool(it.get('bought', False)),
                        actual_unit_price=_to_dec(it.get('actual_unit_price')),
                        actual_quantity=_to_dec(it.get('actual_quantity', '1')),
                    )

            # 8. Recurring Transactions
            for item in payload.get('recurring', []):
                cat = cat_map.get(item.get('category_id'))
                RecurringTransaction.objects.create(
                    user=user,
                    category=cat,
                    type=item.get('type', 'expense'),
                    amount=_to_dec(item.get('amount')),
                    description=item.get('description', '')[:255],
                    frequency=item.get('frequency', 'monthly'),
                    next_date=_to_date(item.get('next_date')),
                    active=bool(item.get('active', True)),
                )
                stats['recurring'] += 1

            # 9. USSD Codes
            for item in payload.get('ussd_codes', []):
                service = item.get('service', '').strip()
                label = item.get('label', '').strip()
                code = item.get('code', '').strip()
                if code:
                    UssdCode.objects.get_or_create(
                        user=user,
                        code=code,
                        defaults={'service': service or 'General', 'label': label or 'Code'}
                    )
                    stats['ussd_codes'] += 1

            # 10. Wallet
            wallet_data = payload.get('wallet')
            if wallet_data and 'starting_balance' in wallet_data:
                wallet, _ = Wallet.objects.get_or_create(user=user)
                wallet.starting_balance = _to_dec(wallet_data['starting_balance'])
                wallet.save()

    except Exception as exc:
        return Response({'detail': f'Import failed: {str(exc)}'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'detail': 'Data imported successfully.',
        'imported': stats,
    })

