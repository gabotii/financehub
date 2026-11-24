from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

from apps.core.models import TimeStampedModel

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$", message="Enter a hex color such as #1A2B3C."
)


class Category(TimeStampedModel):
    class Kind(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories"
    )
    name = models.CharField(max_length=50)
    kind = models.CharField(max_length=7, choices=Kind.choices)
    color = models.CharField(max_length=7, default="#64748B", validators=[hex_color_validator])

    class Meta:
        ordering = ["kind", "name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                "user", Lower("name"), "kind", name="unique_category_name_per_user_kind"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.kind})"
