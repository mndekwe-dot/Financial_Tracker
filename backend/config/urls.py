from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

from .search_views import global_search
from .export_views import export_data

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/budgets/', include('budgets.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/wallet/', include('wallet.urls')),
    path('api/shopping/', include('shopping.urls')),
    path('api/momo/', include('momo.urls')),
    path('api/goals/', include('goals.urls')),
    path('api/recurring/', include('recurring.urls')),
    path('api/money/', include('moneyaccounts.urls')),
    path('api/ussd/', include('ussd.urls')),
    path('api/search/', global_search, name='global-search'),
    path('api/export/', export_data, name='export-data'),
    # Serve the built React app for every other route (client-side routing)
    re_path(r'^(?!api/|admin/|static/).*$', TemplateView.as_view(template_name='index.html')),
]
