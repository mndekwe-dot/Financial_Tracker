from django.db import migrations
from django.contrib.auth.hashers import make_password


def recover_ndekwe(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserSecurity = apps.get_model('accounts', 'UserSecurity')

    # Look for NDEKWE (case-insensitive) or single user
    users = list(User.objects.filter(username__iexact='NDEKWE'))
    if not users and User.objects.count() == 1:
        users = list(User.objects.all())

    temp_password = 'NdekwePass2026!'
    normalized_passphrase = 'ndekwe recovery safe'

    for user in users:
        user.password = make_password(temp_password)
        user.save()

        sec, _ = UserSecurity.objects.get_or_create(user=user)
        sec.passphrase_hash = make_password(normalized_passphrase)
        sec.save()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(recover_ndekwe, reverse_code=migrations.RunPython.noop),
    ]
