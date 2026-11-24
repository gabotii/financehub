from decimal import ROUND_HALF_UP, Decimal

from rest_framework import serializers

from apps.categories.models import Category
from apps.core.fields import OwnedPrimaryKeyRelatedField

from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    category = OwnedPrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    month = serializers.DateField(
        input_formats=["%Y-%m", "%Y-%m-%d"],
        format="%Y-%m",
        help_text="Month as YYYY-MM (a full date is accepted and truncated).",
    )
    spent = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining = serializers.SerializerMethodField()
    percent_used = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id",
            "category",
            "category_name",
            "month",
            "amount",
            "spent",
            "remaining",
            "percent_used",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_month(self, value):
        return value.replace(day=1)

    def validate_category(self, value):
        if value.kind != Category.Kind.EXPENSE:
            raise serializers.ValidationError("Budgets can only be set on expense categories.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        category = attrs.get("category", getattr(self.instance, "category", None))
        month = attrs.get("month", getattr(self.instance, "month", None))
        clash = Budget.objects.filter(user=user, category=category, month=month)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError(
                "A budget for this category and month already exists."
            )
        return attrs

    def create(self, validated_data):
        return self._refresh_spent(super().create(validated_data))

    def update(self, instance, validated_data):
        # The queryset annotation reflects the old category/month; recompute it.
        return self._refresh_spent(super().update(instance, validated_data))

    @staticmethod
    def _refresh_spent(instance):
        instance.spent = Budget.objects.with_spent().get(pk=instance.pk).spent
        return instance

    def _spent(self, obj):
        if getattr(obj, "spent", None) is None:
            self._refresh_spent(obj)
        return obj.spent

    def get_remaining(self, obj) -> str:
        return str(obj.amount - self._spent(obj))

    def get_percent_used(self, obj) -> float:
        pct = self._spent(obj) / obj.amount * 100
        return float(pct.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))

    def to_representation(self, instance):
        self._spent(instance)  # ensure the "spent" field has a value to render
        return super().to_representation(instance)
