"""Read-only aggregations over a user's transactions.

All heavy lifting happens in SQL (one aggregate query per report); Python only
reshapes the rows and fills empty months.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from apps.categories.models import Category
from apps.transactions.models import Transaction

ZERO = Decimal("0.00")
MONEY = DecimalField(max_digits=14, decimal_places=2)


def _sum(condition=None):
    return Coalesce(Sum("amount", filter=condition), Value(ZERO), output_field=MONEY)


INCOME = Q(category__kind=Category.Kind.INCOME)
EXPENSE = Q(category__kind=Category.Kind.EXPENSE)


def _pct(part, whole):
    if not whole:
        return 0.0
    return float((part / whole * 100).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def summary(user, date_from, date_to):
    totals = Transaction.objects.filter(
        user=user, date__gte=date_from, date__lte=date_to
    ).aggregate(income=_sum(INCOME), expense=_sum(EXPENSE), count=Count("id"))
    income, expense = totals["income"], totals["expense"]
    balance = income - expense
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_income": income,
        "total_expense": expense,
        "balance": balance,
        "savings_rate": _pct(balance, income) if income else None,
        "transaction_count": totals["count"],
    }


def by_category(user, date_from, date_to, kind):
    rows = list(
        Transaction.objects.filter(
            user=user, date__gte=date_from, date__lte=date_to, category__kind=kind
        )
        .values("category_id", "category__name", "category__color")
        .annotate(total=_sum(), count=Count("id"))
        .order_by("-total", "category__name")
    )
    grand_total = sum((r["total"] for r in rows), ZERO)
    return [
        {
            "category_id": r["category_id"],
            "name": r["category__name"],
            "color": r["category__color"],
            "total": r["total"],
            "count": r["count"],
            "percentage": _pct(r["total"], grand_total),
        }
        for r in rows
    ]


def _shift_month(month_start: date, delta: int) -> date:
    index = month_start.year * 12 + (month_start.month - 1) + delta
    return date(index // 12, index % 12 + 1, 1)


def monthly_trend(user, months):
    current = timezone.localdate().replace(day=1)
    first = _shift_month(current, -(months - 1))
    rows = (
        Transaction.objects.filter(user=user, date__gte=first)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(income=_sum(INCOME), expense=_sum(EXPENSE))
    )
    by_month = {r["month"]: r for r in rows}
    result = []
    for i in range(months):
        month = _shift_month(first, i)
        row = by_month.get(month, {"income": ZERO, "expense": ZERO})
        result.append(
            {
                "month": month,
                "income": row["income"],
                "expense": row["expense"],
                "balance": row["income"] - row["expense"],
            }
        )
    return result
