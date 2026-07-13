from django.contrib import admin

from .models import Account, Transfer

admin.site.register(Account)
admin.site.register(Transfer)
