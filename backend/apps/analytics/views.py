from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import (
    CategoryBreakdownQuerySerializer,
    CategoryBreakdownSerializer,
    DateRangeQuerySerializer,
    MonthlyQuerySerializer,
    MonthlyTrendSerializer,
    SummarySerializer,
)


def _params(serializer_class, request):
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class SummaryView(APIView):
    """Income, expenses, balance and savings rate for a date range (default: this month)."""

    @extend_schema(parameters=[DateRangeQuerySerializer], responses=SummarySerializer)
    def get(self, request):
        p = _params(DateRangeQuerySerializer, request)
        data = services.summary(request.user, p["date_from"], p["date_to"])
        return Response(SummarySerializer(data).data)


class CategoryBreakdownView(APIView):
    """Totals per category for one kind (default: expense) over a date range."""

    @extend_schema(
        parameters=[CategoryBreakdownQuerySerializer],
        responses=CategoryBreakdownSerializer(many=True),
    )
    def get(self, request):
        p = _params(CategoryBreakdownQuerySerializer, request)
        data = services.by_category(request.user, p["date_from"], p["date_to"], p["kind"])
        return Response(CategoryBreakdownSerializer(data, many=True).data)


class MonthlyTrendView(APIView):
    """Income vs expense for each of the last N months, including empty months."""

    @extend_schema(parameters=[MonthlyQuerySerializer], responses=MonthlyTrendSerializer(many=True))
    def get(self, request):
        p = _params(MonthlyQuerySerializer, request)
        data = services.monthly_trend(request.user, p["months"])
        return Response(MonthlyTrendSerializer(data, many=True).data)
