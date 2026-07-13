from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from transactions.models import Transaction
from loans.models import Loan
from shopping.models import ShoppingItem


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """Search the user's transactions, loans and shopping items in one call."""
    q = (request.query_params.get('q') or '').strip()
    if not q:
        return Response({'transactions': [], 'loans': [], 'shopping': []})

    user = request.user

    txns = Transaction.objects.filter(user=user).filter(
        Q(description__icontains=q) | Q(tags__icontains=q) | Q(category__name__icontains=q)
    ).select_related('category')[:12]

    loans = Loan.objects.filter(user=user).filter(
        Q(person__icontains=q) | Q(note__icontains=q)
    )[:12]

    items = ShoppingItem.objects.filter(shopping_list__user=user).filter(
        Q(name__icontains=q) | Q(category__icontains=q)
    ).select_related('shopping_list')[:12]

    return Response({
        'transactions': [
            {
                'id': t.id,
                'type': t.type,
                'amount': str(t.amount),
                'description': t.description,
                'tags': t.tags,
                'date': t.date,
                'category_name': t.category.name if t.category else None,
            }
            for t in txns
        ],
        'loans': [
            {
                'id': l.id,
                'person': l.person,
                'amount': str(l.amount),
                'direction': l.direction,
                'note': l.note,
                'settled': l.settled,
            }
            for l in loans
        ],
        'shopping': [
            {
                'id': i.id,
                'name': i.name,
                'category': i.category,
                'list_id': i.shopping_list_id,
                'list_name': i.shopping_list.name,
                'bought': i.bought,
            }
            for i in items
        ],
    })
