from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from transactions.models import Transaction
from .models import Loan

User = get_user_model()


class LoanTransactionSyncTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='ama', password='pw12345')

    def test_lending_money_creates_an_expense(self):
        loan = Loan.objects.create(
            user=self.user, person='Kofi', amount=100, direction=Loan.OWED_TO_ME, date=date.today(),
        )
        self.assertIsNotNone(loan.lend_transaction_id)
        txn = loan.lend_transaction
        self.assertEqual(txn.type, Transaction.EXPENSE)
        self.assertEqual(txn.amount, 100)
        self.assertIsNone(loan.repay_transaction_id)

    def test_settling_a_loan_owed_to_me_creates_income(self):
        loan = Loan.objects.create(
            user=self.user, person='Kofi', amount=100, direction=Loan.OWED_TO_ME, date=date.today(),
        )
        loan.settled = True
        loan.save()
        loan.refresh_from_db()
        self.assertIsNotNone(loan.repay_transaction_id)
        self.assertEqual(loan.repay_transaction.type, Transaction.INCOME)
        self.assertEqual(loan.repay_transaction.amount, 100)
        # The original lend expense must still exist untouched.
        self.assertEqual(loan.lend_transaction.type, Transaction.EXPENSE)

    def test_unsettling_a_loan_removes_the_repayment_transaction(self):
        loan = Loan.objects.create(
            user=self.user, person='Kofi', amount=100, direction=Loan.OWED_TO_ME, date=date.today(), settled=True,
        )
        repay_id = loan.repay_transaction_id
        self.assertIsNotNone(repay_id)

        loan.settled = False
        loan.save()
        loan.refresh_from_db()
        self.assertIsNone(loan.repay_transaction_id)
        self.assertFalse(Transaction.objects.filter(pk=repay_id).exists())

    def test_borrowing_money_creates_income_and_settling_creates_an_expense(self):
        loan = Loan.objects.create(
            user=self.user, person='Yaw', amount=50, direction=Loan.I_OWE, date=date.today(),
        )
        self.assertEqual(loan.lend_transaction.type, Transaction.INCOME)

        loan.settled = True
        loan.save()
        loan.refresh_from_db()
        self.assertEqual(loan.repay_transaction.type, Transaction.EXPENSE)
        self.assertEqual(loan.repay_transaction.amount, 50)

    def test_deleting_a_loan_deletes_its_linked_transactions(self):
        loan = Loan.objects.create(
            user=self.user, person='Kofi', amount=100, direction=Loan.OWED_TO_ME, date=date.today(), settled=True,
        )
        lend_id, repay_id = loan.lend_transaction_id, loan.repay_transaction_id

        loan.delete()

        self.assertFalse(Transaction.objects.filter(pk=lend_id).exists())
        self.assertFalse(Transaction.objects.filter(pk=repay_id).exists())

    def test_editing_amount_updates_the_linked_lend_transaction(self):
        loan = Loan.objects.create(
            user=self.user, person='Kofi', amount=100, direction=Loan.OWED_TO_ME, date=date.today(),
        )
        loan.amount = 150
        loan.save()
        loan.lend_transaction.refresh_from_db()
        self.assertEqual(loan.lend_transaction.amount, 150)
