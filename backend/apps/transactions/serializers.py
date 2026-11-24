from rest_framework import serializers

from apps.categories.models import Category
from apps.core.fields import OwnedPrimaryKeyRelatedField

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    category = OwnedPrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    kind = serializers.CharField(source="category.kind", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "category",
            "category_name",
            "kind",
            "amount",
            "date",
            "description",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
