from django.db import connection
from django.db.utils import OperationalError
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

HealthSerializer = inline_serializer(
    name="Health",
    fields={"status": serializers.CharField(), "database": serializers.CharField()},
)


class HealthCheckView(APIView):
    """Liveness/readiness probe: reports whether the database is reachable."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={200: HealthSerializer, 503: HealthSerializer})
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except OperationalError:
            return Response(
                {"status": "error", "database": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "database": "ok"})
