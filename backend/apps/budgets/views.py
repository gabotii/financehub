from rest_framework import viewsets

from apps.core.mixins import OwnedQuerysetMixin

from .filters import BudgetFilter
from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Budget.objects.with_spent().select_related("category")
    serializer_class = BudgetSerializer
    filterset_class = BudgetFilter
    ordering_fields = ["month", "amount", "spent"]
