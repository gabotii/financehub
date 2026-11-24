import calendar

from django.utils import timezone
from rest_framework import serializers

from apps.categories.models import Category


def _current_month_bounds():
    today = timezone.localdate()
    last_day = calendar.monthrange(today.year, today.month)[1]
    return today.replace(day=1), today.replace(day=last_day)


class DateRangeQuerySerializer(serializers.Serializer):
    """Query params for range-based reports; defaults to the current month."""

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        default_from, default_to = _current_month_bounds()
        attrs.setdefault("date_from", default_from)
        attrs.setdefault("date_to", default_to)
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError("date_from must be on or before date_to.")
        return attrs


class CategoryBreakdownQuerySerializer(DateRangeQuerySerializer):
    kind = serializers.ChoiceField(choices=Category.Kind.choices, default=Category.Kind.EXPENSE)


class MonthlyQuerySerializer(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, max_value=36, default=12)


money = {"max_digits": 14, "decimal_places": 2}


class SummarySerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    total_income = serializers.DecimalField(**money)
    total_expense = serializers.DecimalField(**money)
    balance = serializers.DecimalField(**money)
    savings_rate = serializers.FloatField(allow_null=True)
    transaction_count = serializers.IntegerField()


class CategoryBreakdownSerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    total = serializers.DecimalField(**money)
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class MonthlyTrendSerializer(serializers.Serializer):
    month = serializers.DateField(format="%Y-%m")
    income = serializers.DecimalField(**money)
    expense = serializers.DecimalField(**money)
    balance = serializers.DecimalField(**money)
