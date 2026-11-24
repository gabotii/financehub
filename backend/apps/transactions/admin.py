from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["date", "description", "category", "amount", "user"]
    list_filter = ["category__kind", "date"]
    search_fields = ["description", "user__email"]
    list_select_related = ["category", "user"]
    date_hierarchy = "date"
