from .models import Category

# (name, type, color, icon) — icons must exist in frontend CATEGORY_ICONS
DEFAULT_CATEGORIES = [
    ('Food & Drinks', Category.EXPENSE, '#f59e0b', 'UtensilsCrossed'),
    ('Transport', Category.EXPENSE, '#3b82f6', 'Bus'),
    ('Housing & Rent', Category.EXPENSE, '#8b5cf6', 'Home'),
    ('Shopping', Category.EXPENSE, '#ec4899', 'ShoppingBag'),
    ('Airtime & Data', Category.EXPENSE, '#06b6d4', 'Smartphone'),
    ('Health', Category.EXPENSE, '#ef4444', 'HeartPulse'),
    ('Entertainment', Category.EXPENSE, '#10b981', 'Popcorn'),
    ('Education', Category.EXPENSE, '#6366f1', 'GraduationCap'),
    ('Other', Category.EXPENSE, '#64748b', 'Wallet'),
    ('Salary', Category.INCOME, '#22c55e', 'Briefcase'),
    ('Allowance', Category.INCOME, '#84cc16', 'Banknote'),
    ('Gifts', Category.INCOME, '#f472b6', 'Gift'),
    ('Other income', Category.INCOME, '#14b8a6', 'TrendingUp'),
]


def create_default_categories(user):
    """Create any missing default categories for the user. Safe to call repeatedly."""
    existing = set(Category.objects.filter(user=user).values_list('name', 'type'))
    Category.objects.bulk_create(
        Category(user=user, name=name, type=type_, color=color, icon=icon)
        for name, type_, color, icon in DEFAULT_CATEGORIES
        if (name, type_) not in existing
    )
