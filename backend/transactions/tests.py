from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from categories.models import Category
from transactions.models import Transaction

User = get_user_model()


class TransactionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(
            user=self.user, name='Groceries', type='expense', color='#10b981', icon='ShoppingBag'
        )

    def test_create_transaction(self):
        res = self.client.post('/api/transactions/', {
            'type': 'expense',
            'amount': '45.50',
            'category': self.category.id,
            'description': 'Supermarket run',
            'date': '2026-10-10',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 1)
        t = Transaction.objects.first()
        self.assertEqual(t.amount, 45.50)
        self.assertEqual(t.description, 'Supermarket run')

    def test_weekly_breakdown_includes_weekends(self):
        # 2026-10-10 is Saturday, 2026-10-11 is Sunday
        Transaction.objects.create(
            user=self.user,
            type=Transaction.EXPENSE,
            amount=60,
            date=date(2026, 10, 10),
            category=self.category,
        )
        Transaction.objects.create(
            user=self.user,
            type=Transaction.EXPENSE,
            amount=40,
            date=date(2026, 10, 11),
            category=self.category,
        )
        res = self.client.get('/api/transactions/weekly/', {'month': 10, 'year': 2026})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        weeks = res.data['weeks']
        self.assertTrue(len(weeks) > 0)
        # Every week must have 7 days
        for w in weeks:
            self.assertEqual(len(w['days']), 7)
        # The week containing Oct 10-11 must have sum of 100
        found_week = None
        for w in weeks:
            dates = [d['date'] for d in w['days']]
            if date(2026, 10, 10) in dates:
                found_week = w
                break
        self.assertIsNotNone(found_week)
        self.assertEqual(found_week['total'], 100)

    def test_export_and_import_roundtrip(self):
        Transaction.objects.create(
            user=self.user,
            type=Transaction.EXPENSE,
            amount=25,
            date=date(2026, 10, 5),
            category=self.category,
            description='Test Export',
        )
        export_res = self.client.get('/api/export/')
        self.assertEqual(export_res.status_code, status.HTTP_200_OK)
        data = export_res.data
        self.assertIn('categories', data)
        self.assertIn('transactions', data)

        # Clear transactions and import back
        Transaction.objects.filter(user=self.user).delete()
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)

        import_res = self.client.post('/api/import/', data, format='json')
        self.assertEqual(import_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 1)
        self.assertEqual(Transaction.objects.first().description, 'Test Export')
