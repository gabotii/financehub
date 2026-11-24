import pytest
from django.urls import reverse

from apps.core.tests.factories import CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db
LIST = reverse("category-list")


def detail(pk):
    return reverse("category-detail", args=[pk])


def test_create_and_list_only_own_categories(auth_client, user, other_user):
    CategoryFactory(user=other_user, name="Not mine")
    response = auth_client.post(LIST, {"name": "Food", "kind": "expense", "color": "#FF0000"})
    assert response.status_code == 201

    names = [c["name"] for c in auth_client.get(LIST).json()["results"]]
    assert names == ["Food"]


def test_duplicate_name_is_case_insensitive_per_kind(auth_client, user):
    CategoryFactory(user=user, name="Food", kind="expense")
    dup = auth_client.post(LIST, {"name": "food", "kind": "expense"})
    assert dup.status_code == 400
    other_kind = auth_client.post(LIST, {"name": "food", "kind": "income"})
    assert other_kind.status_code == 201


def test_invalid_color_rejected(auth_client):
    response = auth_client.post(LIST, {"name": "X", "kind": "expense", "color": "red"})
    assert response.status_code == 400


def test_cannot_access_other_users_category(auth_client, other_user):
    category = CategoryFactory(user=other_user)
    assert auth_client.get(detail(category.pk)).status_code == 404
    assert auth_client.delete(detail(category.pk)).status_code == 404


def test_delete_category_with_transactions_returns_conflict(auth_client, user):
    category = CategoryFactory(user=user)
    TransactionFactory(user=user, category=category)
    assert auth_client.delete(detail(category.pk)).status_code == 409


def test_cannot_change_kind_when_transactions_exist(auth_client, user):
    category = CategoryFactory(user=user, kind="expense")
    TransactionFactory(user=user, category=category)
    response = auth_client.patch(detail(category.pk), {"kind": "income"})
    assert response.status_code == 400


def test_filter_by_kind(auth_client, user):
    CategoryFactory(user=user, kind="income")
    CategoryFactory(user=user, kind="expense")
    results = auth_client.get(LIST, {"kind": "income"}).json()["results"]
    assert [c["kind"] for c in results] == ["income"]
