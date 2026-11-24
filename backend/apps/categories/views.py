from django.db.models import RestrictedError
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.core.mixins import OwnedQuerysetMixin

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_fields = ["kind"]
    search_fields = ["name"]
    ordering_fields = ["name", "kind", "created_at"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except RestrictedError:
            return Response(
                {"detail": "This category has transactions; reassign or delete them first."},
                status=status.HTTP_409_CONFLICT,
            )
