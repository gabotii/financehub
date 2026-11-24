from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.budgets.models import Budget
from apps.categories.models import Category
from apps.transactions.models import Transaction

DEFAULT_PASSWORD = "S3cure-pass-for-tests"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    password = factory.PostGenerationMethodCall("set_password", DEFAULT_PASSWORD)

    @factory.post_generation
    def save_password(obj, create, extracted, **kwargs):
        if create:
            obj.save()


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Category {n}")
    kind = Category.Kind.EXPENSE


class TransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transaction

    user = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory, user=factory.SelfAttribute("..user"))
    amount = Decimal("10.00")
    date = factory.LazyFunction(timezone.localdate)
    description = factory.Sequence(lambda n: f"Transaction {n}")


class BudgetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Budget

    user = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory, user=factory.SelfAttribute("..user"))
    month = factory.LazyFunction(lambda: timezone.localdate().replace(day=1))
    amount = Decimal("100.00")
