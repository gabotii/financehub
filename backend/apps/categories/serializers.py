from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "kind", "color", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        return value.strip()

    def validate(self, attrs):
        # The DB constraint is case-insensitive per user+kind; check it here so the
        # client gets a 400 with a message instead of an IntegrityError.
        user = self.context["request"].user
        name = attrs.get("name", getattr(self.instance, "name", None))
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        clash = Category.objects.filter(user=user, name__iexact=name, kind=kind)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError(
                {"name": "You already have a category with this name."}
            )
        if self.instance is not None and "kind" in attrs and attrs["kind"] != self.instance.kind:
            if self.instance.transactions.exists() or self.instance.budgets.exists():
                raise serializers.ValidationError(
                    {"kind": "Cannot change the kind of a category with transactions or budgets."}
                )
        return attrs
