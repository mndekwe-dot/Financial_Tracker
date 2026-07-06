from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/budgets/', include('budgets.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/wallet/', include('wallet.urls')),
    path('api/shopping/', include('shopping.urls')),
    # Serve the built React app for every other route (client-side routing)
    re_path(r'^(?!api/|admin/|static/).*$', TemplateView.as_view(template_name='index.html')),
]
