from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .defaults import create_default_categories
from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def defaults(self, request):
        """Add the starter category set (skips any the user already has)."""
        create_default_categories(request.user)
        return Response(self.get_serializer(self.get_queryset(), many=True).data)
