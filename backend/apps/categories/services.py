from .models import Category

DEFAULT_CATEGORIES = [
    ("Salary", Category.Kind.INCOME, "#16A34A"),
    ("Freelance", Category.Kind.INCOME, "#0D9488"),
    ("Other income", Category.Kind.INCOME, "#65A30D"),
    ("Housing", Category.Kind.EXPENSE, "#DC2626"),
    ("Groceries", Category.Kind.EXPENSE, "#EA580C"),
    ("Transport", Category.Kind.EXPENSE, "#CA8A04"),
    ("Utilities", Category.Kind.EXPENSE, "#2563EB"),
    ("Health", Category.Kind.EXPENSE, "#DB2777"),
    ("Entertainment", Category.Kind.EXPENSE, "#7C3AED"),
    ("Other expenses", Category.Kind.EXPENSE, "#64748B"),
]


def create_default_categories(user):
    """Give a new account a sensible starting set of categories."""
    return Category.objects.bulk_create(
        [Category(user=user, name=n, kind=k, color=c) for n, k, c in DEFAULT_CATEGORIES]
    )
