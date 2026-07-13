from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .defaults import create_default_ussd
from .models import UssdCode
from .serializers import UssdCodeSerializer


class UssdCodeViewSet(viewsets.ModelViewSet):
    serializer_class = UssdCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UssdCode.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def defaults(self, request):
        """Seed the user's starter USSD shortcuts, then return the full list."""
        create_default_ussd(request.user)
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)
