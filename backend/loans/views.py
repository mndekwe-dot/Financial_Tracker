from django.db.models import Sum
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Loan
from .serializers import LoanSerializer


class LoanViewSet(viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Loan.objects.filter(user=self.request.user)
        settled = self.request.query_params.get('settled')
        if settled is not None:
            qs = qs.filter(settled=settled.lower() == 'true')
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def loans_summary(request):
    qs = Loan.objects.filter(user=request.user, settled=False)
    owed_to_me = qs.filter(direction=Loan.OWED_TO_ME).aggregate(total=Sum('amount'))['total'] or 0
    i_owe = qs.filter(direction=Loan.I_OWE).aggregate(total=Sum('amount'))['total'] or 0
    return Response({
        'owed_to_me': owed_to_me,
        'i_owe': i_owe,
        'net': owed_to_me - i_owe,
    })
