from datetime import datetime

import django_filters
from rest_framework.exceptions import ValidationError

from .models import Budget


class BudgetFilter(django_filters.FilterSet):
    month = django_filters.CharFilter(method="filter_month", help_text="YYYY-MM")
    category = django_filters.NumberFilter(field_name="category_id")

    class Meta:
        model = Budget
        fields = ["month", "category"]

    def filter_month(self, queryset, name, value):
        try:
            month = datetime.strptime(value, "%Y-%m").date()
        except ValueError as exc:
            raise ValidationError({"month": "Use the format YYYY-MM."}) from exc
        return queryset.filter(month=month)
