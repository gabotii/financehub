from datetime import date

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.analytics.services import _shift_month
from apps.core.tests.factories import CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db
RANGE = {"date_from": "2026-11-01", "date_to": "2026-11-30"}


@pytest.fixture
def data(user, other_user):
    salary = CategoryFactory(user=user, kind="income", name="Salary")
    food = CategoryFactory(user=user, kind="expense", name="Food", color="#FF0000")
    rent = CategoryFactory(user=user, kind="expense", name="Rent")
    TransactionFactory(user=user, category=salary, amount="2000", date=date(2026, 11, 1))
    TransactionFactory(user=user, category=rent, amount="900", date=date(2026, 11, 2))
    TransactionFactory(user=user, category=food, amount="200", date=date(2026, 11, 5))
    TransactionFactory(user=user, category=food, amount="100", date=date(2026, 11, 20))
    TransactionFactory(user=user, category=food, amount="5000", date=date(2026, 10, 20))
    TransactionFactory(user=other_user, amount="7777", date=date(2026, 11, 3))
    return {"food": food, "rent": rent}


def test_summary(auth_client, data):
    body = auth_client.get(reverse("analytics-summary"), RANGE).json()
    assert body["total_income"] == "2000.00"
    assert body["total_expense"] == "1200.00"
    assert body["balance"] == "800.00"
    assert body["savings_rate"] == 40.0
    assert body["transaction_count"] == 4


def test_summary_without_income_has_null_savings_rate(auth_client, user):
    body = auth_client.get(reverse("analytics-summary")).json()
    assert body["total_income"] == "0.00"
    assert body["savings_rate"] is None


def test_summary_rejects_inverted_range(auth_client):
    response = auth_client.get(
        reverse("analytics-summary"), {"date_from": "2026-12-01", "date_to": "2026-11-01"}
    )
    assert response.status_code == 400


def test_by_category(auth_client, data):
    rows = auth_client.get(reverse("analytics-by-category"), RANGE).json()
    assert [(r["name"], r["total"], r["count"], r["percentage"]) for r in rows] == [
        ("Rent", "900.00", 1, 75.0),
        ("Food", "300.00", 2, 25.0),
    ]
    assert rows[1]["color"] == "#FF0000"


def test_by_category_income(auth_client, data):
    rows = auth_client.get(reverse("analytics-by-category"), {**RANGE, "kind": "income"}).json()
    assert [r["name"] for r in rows] == ["Salary"]


def test_monthly_trend_fills_empty_months(auth_client, user):
    this_month = timezone.localdate().replace(day=1)
    two_ago = _shift_month(this_month, -2)
    TransactionFactory(user=user, amount="10", date=this_month)
    TransactionFactory(
        user=user, category=CategoryFactory(user=user, kind="income"), amount="50", date=two_ago
    )

    rows = auth_client.get(reverse("analytics-monthly"), {"months": 3}).json()
    assert [r["month"] for r in rows] == [
        f"{m:%Y-%m}" for m in (two_ago, _shift_month(this_month, -1), this_month)
    ]
    assert rows[0] == {
        "month": f"{two_ago:%Y-%m}",
        "income": "50.00",
        "expense": "0.00",
        "balance": "50.00",
    }
    assert rows[1]["income"] == "0.00" and rows[1]["expense"] == "0.00"
    assert rows[2]["expense"] == "10.00" and rows[2]["balance"] == "-10.00"


def test_monthly_validates_months(auth_client):
    assert auth_client.get(reverse("analytics-monthly"), {"months": 0}).status_code == 400


@pytest.mark.parametrize(
    ("start", "delta", "expected"),
    [
        (date(2026, 1, 1), -1, date(2025, 12, 1)),
        (date(2026, 12, 1), 1, date(2027, 1, 1)),
        (date(2026, 5, 1), -17, date(2024, 12, 1)),
    ],
)
def test_shift_month(start, delta, expected):
    assert _shift_month(start, delta) == expected
