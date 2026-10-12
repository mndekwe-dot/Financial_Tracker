from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import UserSecurity

User = get_user_model()


class Command(BaseCommand):
    help = 'Set or update the recovery passphrase for a user account'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='The username (case-insensitive)')
        parser.add_argument('passphrase', type=str, help='The secret recovery passphrase to set')

    def handle(self, *args, **options):
        username = options['username'].strip()
        passphrase = options['passphrase'].strip()

        if len(passphrase) < 6:
            self.stderr.write(self.style.ERROR('Passphrase must be at least 6 characters long.'))
            return

        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"User '{username}' was not found in the database."))
            return

        sec, _ = UserSecurity.objects.get_or_create(user=user)
        sec.set_passphrase(passphrase)
        sec.save()

        self.stdout.write(self.style.SUCCESS(
            f"Successfully set recovery passphrase for user '{user.username}'.\n"
            f"Passphrase: {passphrase}"
        ))
