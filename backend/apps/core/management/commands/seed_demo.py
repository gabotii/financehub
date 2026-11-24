import random
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.analytics.services import _shift_month
from apps.budgets.models import Budget
from apps.categories.models import Category
from apps.categories.services import create_default_categories
from apps.transactions.models import Transaction

User = get_user_model()

# (category, description, min, max, times per month)
EXPENSES = [
    ("Housing", "Rent", 650, 650, 1),
    ("Groceries", "Supermarket", 25, 90, 6),
    ("Transport", "Fuel / transit", 10, 45, 5),
    ("Utilities", "Electricity & internet", 60, 110, 1),
    ("Health", "Pharmacy", 8, 60, 1),
    ("Entertainment", "Dinner / cinema", 15, 70, 3),
]


class Command(BaseCommand):
    help = "Create (or recreate) a demo user with six months of realistic data."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="demo@financehub.dev")
        parser.add_argument("--password", default="demo-pass-123")
        parser.add_argument("--months", type=int, default=6)
        parser.add_argument("--seed", type=int, default=42, help="Random seed for repeatable data")

    @transaction.atomic
    def handle(self, *args, email, password, months, seed, **options):
        rng = random.Random(seed)
        User.objects.filter(email=email).delete()
        user = User.objects.create_user(email=email, password=password, first_name="Demo")
        create_default_categories(user)
        cats = {c.name: c for c in Category.objects.filter(user=user)}

        today = timezone.localdate()
        current = today.replace(day=1)
        rows = []
        for offset in range(months - 1, -1, -1):
            month = _shift_month(current, -offset)
            last_day = today.day if month == current else 28

            def day(rng=rng, month=month, last_day=last_day):
                return date(month.year, month.month, rng.randint(1, last_day))

            rows.append(
                Transaction(
                    user=user,
                    category=cats["Salary"],
                    amount=Decimal("2400"),
                    date=month,
                    description="Monthly salary",
                )
            )
            if rng.random() < 0.5:
                rows.append(
                    Transaction(
                        user=user,
                        category=cats["Freelance"],
                        amount=Decimal(rng.randint(200, 700)),
                        date=day(),
                        description="Freelance project",
                    )
                )
            for name, desc, low, high, times in EXPENSES:
                for _ in range(times):
                    amount = Decimal(rng.uniform(low, high)).quantize(Decimal("0.01"))
                    rows.append(
                        Transaction(
                            user=user,
                            category=cats[name],
                            amount=amount,
                            date=day(),
                            description=desc,
                        )
                    )
        Transaction.objects.bulk_create(rows)

        for name, limit in [("Groceries", 400), ("Entertainment", 150), ("Transport", 180)]:
            Budget.objects.create(
                user=user, category=cats[name], month=current, amount=Decimal(limit)
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo user {email} / {password}: {len(rows)} transactions over {months} months."
            )
        )
