from .models import UssdCode

# (service, label, code)
DEFAULT_USSD = [
    ('Airtime', 'Buy pack', '*345*1*3#'),
    ('Transport card', 'Top up', '*532*1*2*94ED7B1B#'),
    ('Transport card', 'Check balance', '*532*2*2*94ED7B1B#'),
]


def create_default_ussd(user):
    """Add any missing starter USSD shortcuts for the user. Safe to repeat."""
    existing = set(UssdCode.objects.filter(user=user).values_list('code', flat=True))
    UssdCode.objects.bulk_create(
        UssdCode(user=user, service=service, label=label, code=code)
        for service, label, code in DEFAULT_USSD
        if code not in existing
    )
