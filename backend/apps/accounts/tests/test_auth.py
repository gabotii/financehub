import pytest
from django.urls import reverse

from apps.categories.models import Category
from apps.core.tests.factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.django_db


def test_register_returns_tokens_and_seeds_categories(api_client):
    response = api_client.post(
        reverse("auth-register"),
        {"email": "New@Example.com", "password": "a-Strong-pass-123", "first_name": "Ana"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "new@example.com"
    assert {"access", "refresh"} <= body["tokens"].keys()
    assert "password" not in body["user"]
    assert Category.objects.filter(user__email="new@example.com").count() == 10


def test_register_rejects_duplicate_email_case_insensitively(api_client, user):
    response = api_client.post(
        reverse("auth-register"), {"email": user.email.upper(), "password": "a-Strong-pass-123"}
    )
    assert response.status_code == 400
    assert "email" in response.json()


def test_register_enforces_password_validators(api_client):
    response = api_client.post(
        reverse("auth-register"), {"email": "x@example.com", "password": "123"}
    )
    assert response.status_code == 400


def test_login_refresh_and_me_flow(api_client, user):
    login = api_client.post(
        reverse("auth-login"), {"email": user.email, "password": DEFAULT_PASSWORD}
    )
    assert login.status_code == 200
    tokens = login.json()

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    me = api_client.get(reverse("auth-me"))
    assert me.status_code == 200
    assert me.json()["email"] == user.email

    refreshed = api_client.post(reverse("auth-refresh"), {"refresh": tokens["refresh"]})
    assert refreshed.status_code == 200
    # Rotation blacklists the old refresh token.
    reused = api_client.post(reverse("auth-refresh"), {"refresh": tokens["refresh"]})
    assert reused.status_code == 401


def test_login_with_wrong_password_fails(api_client, user):
    response = api_client.post(reverse("auth-login"), {"email": user.email, "password": "nope"})
    assert response.status_code == 401


def test_logout_blacklists_refresh_token(api_client, user):
    tokens = api_client.post(
        reverse("auth-login"), {"email": user.email, "password": DEFAULT_PASSWORD}
    ).json()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    response = api_client.post(reverse("auth-logout"), {"refresh": tokens["refresh"]})
    assert response.status_code == 205
    response = api_client.post(reverse("auth-refresh"), {"refresh": tokens["refresh"]})
    assert response.status_code == 401


def test_logout_rejects_another_users_token(api_client, user, other_user):
    other_tokens = api_client.post(
        reverse("auth-login"), {"email": other_user.email, "password": DEFAULT_PASSWORD}
    ).json()
    api_client.force_authenticate(user)
    response = api_client.post(reverse("auth-logout"), {"refresh": other_tokens["refresh"]})
    assert response.status_code == 400


def test_me_can_update_name_but_not_email(auth_client, user):
    response = auth_client.patch(
        reverse("auth-me"), {"first_name": "Renamed", "email": "hacker@example.com"}
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Renamed"
    assert user.email != "hacker@example.com"


def test_change_password(auth_client, user):
    url = reverse("auth-change-password")
    bad = auth_client.post(url, {"current_password": "wrong", "new_password": "N3w-pass-xyz!"})
    assert bad.status_code == 400
    ok = auth_client.post(
        url, {"current_password": DEFAULT_PASSWORD, "new_password": "N3w-pass-xyz!"}
    )
    assert ok.status_code == 204
    user.refresh_from_db()
    assert user.check_password("N3w-pass-xyz!")


def test_endpoints_require_authentication(api_client):
    assert api_client.get(reverse("auth-me")).status_code == 401
    assert api_client.get(reverse("category-list")).status_code == 401


def test_deleting_a_user_cascades_to_all_their_data(user):
    from apps.core.tests.factories import BudgetFactory, TransactionFactory
    from apps.transactions.models import Transaction

    tx = TransactionFactory(user=user)
    BudgetFactory(user=user, category=tx.category)
    user.delete()
    assert not Transaction.objects.exists()
    assert not Category.objects.exists()
