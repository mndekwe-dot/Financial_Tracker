from rest_framework import viewsets, permissions

from .models import ShoppingList, ShoppingItem
from .serializers import ShoppingListSerializer, ShoppingItemSerializer


class ShoppingListViewSet(viewsets.ModelViewSet):
    serializer_class = ShoppingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ShoppingList.objects.filter(user=self.request.user).prefetch_related('items')


class ShoppingItemViewSet(viewsets.ModelViewSet):
    serializer_class = ShoppingItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ShoppingItem.objects.filter(shopping_list__user=self.request.user)
