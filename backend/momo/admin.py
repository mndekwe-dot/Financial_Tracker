from django.contrib import admin

from .models import MomoInboxToken, MomoMessage, MomoPayment


@admin.register(MomoInboxToken)
class MomoInboxTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'enabled', 'created_at')


@admin.register(MomoMessage)
class MomoMessageAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'direction', 'amount', 'party', 'created_at')
    list_filter = ('status', 'direction')
    search_fields = ('raw_text', 'party', 'txid')


@admin.register(MomoPayment)
class MomoPaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'recipient', 'recipient_type', 'reconciled', 'created_at')
    list_filter = ('reconciled', 'recipient_type')
