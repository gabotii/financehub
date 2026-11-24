from datetime import date

import pytest
from django.urls import reverse

from apps.core.tests.factories import BudgetFactory, CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db
LIST = reverse("budget-list")


def test_create_budget_normalises_month(auth_client, user):
    category = CategoryFactory(user=user, kind="expense")
    response = auth_client.post(
        LIST, {"category": category.pk, "month": "2026-11-17", "amount": "200"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["month"] == "2026-11"
    assert body["spent"] == "0.00"
    assert body["percent_used"] == 0.0


def test_budget_reports_spent_only_for_its_month_and_category(auth_client, user):
    food = CategoryFactory(user=user, kind="expense")
    fun = CategoryFactory(user=user, kind="expense")
    BudgetFactory(user=user, category=food, month=date(2026, 11, 1), amount="200")
    TransactionFactory(user=user, category=food, amount="50", date=date(2026, 11, 3))
    TransactionFactory(user=user, category=food, amount="25", date=date(2026, 11, 30))
    TransactionFactory(user=user, category=food, amount="999", date=date(2026, 10, 31))
    TransactionFactory(user=user, category=fun, amount="999", date=date(2026, 11, 10))

    [budget] = auth_client.get(LIST, {"month": "2026-11"}).json()["results"]
    assert budget["spent"] == "75.00"
    assert budget["remaining"] == "125.00"
    assert budget["percent_used"] == 37.5


def test_budget_requires_expense_category(auth_client, user):
    income = CategoryFactory(user=user, kind="income")
    response = auth_client.post(LIST, {"category": income.pk, "month": "2026-11", "amount": "1"})
    assert response.status_code == 400


def test_duplicate_budget_rejected(auth_client, user):
    budget = BudgetFactory(user=user, month=date(2026, 11, 1))
    response = auth_client.post(
        LIST, {"category": budget.category.pk, "month": "2026-11", "amount": "50"}
    )
    assert response.status_code == 400


def test_update_recomputes_spent(auth_client, user):
    category = CategoryFactory(user=user, kind="expense")
    TransactionFactory(user=user, category=category, amount="40", date=date(2026, 10, 2))
    budget = BudgetFactory(user=user, category=category, month=date(2026, 11, 1))
    response = auth_client.patch(reverse("budget-detail", args=[budget.pk]), {"month": "2026-10"})
    assert response.status_code == 200
    assert response.json()["spent"] == "40.00"


def test_invalid_month_filter(auth_client):
    assert auth_client.get(LIST, {"month": "November"}).status_code == 400


def test_cannot_see_other_users_budgets(auth_client, other_user):
    budget = BudgetFactory(user=other_user)
    assert auth_client.get(LIST).json()["count"] == 0
    assert auth_client.get(reverse("budget-detail", args=[budget.pk])).status_code == 404
