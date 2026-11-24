from datetime import date

import pytest
from django.urls import reverse

from apps.core.tests.factories import CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db
LIST = reverse("transaction-list")


def test_create_transaction(auth_client, user):
    category = CategoryFactory(user=user, kind="expense")
    response = auth_client.post(
        LIST,
        {"category": category.pk, "amount": "25.50", "date": "2026-11-01", "description": "Lunch"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == "25.50"
    assert body["kind"] == "expense"
    assert body["category_name"] == category.name


def test_cannot_use_another_users_category(auth_client, other_user):
    foreign = CategoryFactory(user=other_user)
    response = auth_client.post(
        LIST, {"category": foreign.pk, "amount": "5", "description": "Sneaky"}
    )
    assert response.status_code == 400
    assert "category" in response.json()


@pytest.mark.parametrize("amount", ["0", "-3.00"])
def test_amount_must_be_positive(auth_client, user, amount):
    category = CategoryFactory(user=user)
    response = auth_client.post(
        LIST, {"category": category.pk, "amount": amount, "description": "Bad"}
    )
    assert response.status_code == 400


def test_list_is_scoped_to_user(auth_client, user, other_user):
    TransactionFactory(user=user)
    TransactionFactory(user=other_user)
    assert auth_client.get(LIST).json()["count"] == 1


def test_filters_and_search(auth_client, user):
    income = CategoryFactory(user=user, kind="income")
    expense = CategoryFactory(user=user, kind="expense")
    TransactionFactory(
        user=user, category=income, amount="1000", date=date(2026, 10, 1), description="Salary"
    )
    TransactionFactory(
        user=user, category=expense, amount="40", date=date(2026, 10, 5), description="Groceries"
    )
    TransactionFactory(
        user=user, category=expense, amount="15", date=date(2026, 11, 2), description="Coffee beans"
    )

    def descriptions(**params):
        return {t["description"] for t in auth_client.get(LIST, params).json()["results"]}

    assert descriptions(kind="income") == {"Salary"}
    assert descriptions(date_from="2026-11-01") == {"Coffee beans"}
    assert descriptions(min_amount="20", max_amount="100") == {"Groceries"}
    assert descriptions(category=expense.pk) == {"Groceries", "Coffee beans"}
    assert descriptions(search="coffee") == {"Coffee beans"}


def test_ordering_by_amount(auth_client, user):
    for amount in ["30", "10", "20"]:
        TransactionFactory(user=user, amount=amount)
    amounts = [t["amount"] for t in auth_client.get(LIST, {"ordering": "amount"}).json()["results"]]
    assert amounts == ["10.00", "20.00", "30.00"]


def test_update_and_delete(auth_client, user):
    tx = TransactionFactory(user=user)
    url = reverse("transaction-detail", args=[tx.pk])
    assert auth_client.patch(url, {"amount": "99.99"}).json()["amount"] == "99.99"
    assert auth_client.delete(url).status_code == 204


def test_export_csv_respects_filters_and_escapes_formulas(auth_client, user):
    TransactionFactory(user=user, description="=HYPERLINK(evil)", date=date(2026, 11, 3))
    TransactionFactory(user=user, description="Old one", date=date(2025, 1, 1))
    response = auth_client.get(reverse("transaction-export"), {"date_from": "2026-01-01"})
    assert response.status_code == 200
    assert response["Content-Type"] == "text/csv"
    lines = response.content.decode().strip().splitlines()
    assert len(lines) == 2  # header + one row
    assert "'=HYPERLINK(evil)" in lines[1]
