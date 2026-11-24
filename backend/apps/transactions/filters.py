import django_filters

from apps.categories.models import Category

from .models import Transaction


class TransactionFilter(django_filters.FilterSet):
    # Plain number filter: validating against all categories would reveal other users' ids.
    category = django_filters.NumberFilter(field_name="category_id")
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")
    kind = django_filters.ChoiceFilter(field_name="category__kind", choices=Category.Kind.choices)

    class Meta:
        model = Transaction
        fields = ["category", "kind", "date_from", "date_to", "min_amount", "max_amount"]
