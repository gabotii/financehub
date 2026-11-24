from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import DecimalField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth

from apps.categories.models import Category
from apps.core.models import TimeStampedModel


class BudgetQuerySet(models.QuerySet):
    def with_spent(self):
        """Annotate each budget with what was actually spent in its category that month."""
        from apps.transactions.models import Transaction

        spent = (
            Transaction.objects.annotate(month_start=TruncMonth("date"))
            .filter(
                user=OuterRef("user"),
                category=OuterRef("category"),
                month_start=OuterRef("month"),
            )
            .values("category")
            .annotate(total=Sum("amount"))
            .values("total")
        )
        money = DecimalField(max_digits=14, decimal_places=2)
        return self.annotate(
            spent=Coalesce(
                Subquery(spent, output_field=money), Value(Decimal("0")), output_field=money
            )
        )


class Budget(TimeStampedModel):
    """A spending limit for one expense category in one calendar month."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets"
    )
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="budgets")
    month = models.DateField(help_text="Always stored as the first day of the month.")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    objects = BudgetQuerySet.as_manager()

    class Meta:
        ordering = ["-month", "category__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category", "month"], name="unique_budget_per_category_month"
            ),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="budget_amount_positive"),
            models.CheckConstraint(condition=models.Q(month__day=1), name="budget_month_first_day"),
        ]

    def __str__(self):
        return f"{self.category.name} {self.month:%Y-%m}: {self.amount}"
