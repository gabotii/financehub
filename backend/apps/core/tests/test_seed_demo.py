import pytest
from django.core.management import call_command

from apps.budgets.models import Budget
from apps.transactions.models import Transaction


@pytest.mark.django_db
def test_seed_demo_is_repeatable():
    call_command("seed_demo", "--email", "demo@test.dev", "--months", "3")
    first = Transaction.objects.filter(user__email="demo@test.dev").count()
    call_command("seed_demo", "--email", "demo@test.dev", "--months", "3")
    assert Transaction.objects.filter(user__email="demo@test.dev").count() == first > 0
    assert Budget.objects.filter(user__email="demo@test.dev").count() == 3
