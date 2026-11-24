import csv

from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action

from apps.core.mixins import OwnedQuerysetMixin

from .filters import TransactionFilter
from .models import Transaction
from .serializers import TransactionSerializer

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value):
    """Neutralise spreadsheet formula injection in user-supplied text."""
    text = str(value)
    return f"'{text}" if text.startswith(FORMULA_PREFIXES) else text


class TransactionViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("category")
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    search_fields = ["description", "notes"]
    ordering_fields = ["date", "amount", "created_at"]

    @extend_schema(responses={(200, "text/csv"): OpenApiTypes.STR})
    @action(detail=False, methods=["get"], pagination_class=None)
    def export(self, request):
        """Download the (filtered) transactions as CSV."""
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="transactions.csv"'
        writer = csv.writer(response)
        writer.writerow(["date", "description", "category", "kind", "amount", "notes"])
        for t in queryset.iterator():
            writer.writerow(
                [
                    t.date,
                    csv_safe(t.description),
                    csv_safe(t.category.name),
                    t.category.kind,
                    t.amount,
                    csv_safe(t.notes),
                ]
            )
        return response
