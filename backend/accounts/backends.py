from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

UserModel = get_user_model()


class CaseInsensitiveModelBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL with case-insensitive username lookup.
    This prevents users from getting locked out if they type 'NDEKWE' vs 'Ndekwe'.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if not username or not password:
            return None

        try:
            user = UserModel._default_manager.get(username__iexact=username)
        except UserModel.DoesNotExist:
            UserModel().set_password(password)
            return None
        except UserModel.MultipleObjectsReturned:
            user = UserModel._default_manager.filter(username__iexact=username).order_by('id').first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

