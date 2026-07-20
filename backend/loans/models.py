from datetime import date

from django.conf import settings
from django.db import models


class Loan(models.Model):
    OWED_TO_ME = 'owed_to_me'
    I_OWE = 'i_owe'
    DIRECTION_CHOICES = [
        (OWED_TO_ME, 'Owed to me'),
        (I_OWE, 'I owe'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    person = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    direction = models.CharField(max_length=12, choices=DIRECTION_CHOICES, default=OWED_TO_ME)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    settled = models.BooleanField(default=False)
    account = models.ForeignKey(
        'moneyaccounts.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='loans',
    )
    # Auto-managed: the expense (lent) / income (borrowed) transaction booked when the loan is created.
    lend_transaction = models.OneToOneField(
        'transactions.Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='loan_as_lend',
    )
    # Auto-managed: the income (repaid to me) / expense (I paid back) transaction booked on settlement.
    repay_transaction = models.OneToOneField(
        'transactions.Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='loan_as_repay',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.person} {self.direction} {self.amount}'

    def _loan_category(self, name, txn_type):
        from categories.models import Category
        category, _ = Category.objects.get_or_create(
            user=self.user, name=name, type=txn_type,
            defaults={'color': '#f97316', 'icon': 'HandCoins'},
        )
        return category

    def _sync_transactions(self, is_new, was_settled):
        """Keep the linked expense/income transactions in step with this loan.

        Lending money out (direction=owed_to_me) is an expense the moment it
        leaves your account; it only becomes income when the person pays you
        back (settled=True). Borrowing (direction=i_owe) is the mirror image.
        """
        from transactions.models import Transaction

        updates = {}

        if is_new and self.lend_transaction_id is None:
            lend_type = Transaction.EXPENSE if self.direction == self.OWED_TO_ME else Transaction.INCOME
            category_name = 'Lending' if self.direction == self.OWED_TO_ME else 'Borrowing'
            description = (
                f'Loan to {self.person}' if self.direction == self.OWED_TO_ME else f'Borrowed from {self.person}'
            )
            txn = Transaction.objects.create(
                user=self.user,
                category=self._loan_category(category_name, lend_type),
                account=self.account,
                type=lend_type,
                amount=self.amount,
                description=description,
                date=self.date,
            )
            updates['lend_transaction'] = txn
        elif not is_new and self.lend_transaction_id:
            # Keep the original transaction's figures in sync with edits to the loan.
            Transaction.objects.filter(pk=self.lend_transaction_id).update(
                amount=self.amount, date=self.date, account=self.account,
            )

        just_settled = is_new or was_settled is False
        if self.settled and just_settled and self.repay_transaction_id is None:
            repay_type = Transaction.INCOME if self.direction == self.OWED_TO_ME else Transaction.EXPENSE
            category_name = 'Loan repayment' if self.direction == self.OWED_TO_ME else 'Loan payment'
            description = (
                f'Repaid by {self.person}' if self.direction == self.OWED_TO_ME else f'Repaid {self.person}'
            )
            txn = Transaction.objects.create(
                user=self.user,
                category=self._loan_category(category_name, repay_type),
                account=self.account,
                type=repay_type,
                amount=self.amount,
                description=description,
                date=date.today(),
            )
            updates['repay_transaction'] = txn
        elif not self.settled and was_settled is True and self.repay_transaction_id is not None:
            Transaction.objects.filter(pk=self.repay_transaction_id).delete()
            updates['repay_transaction'] = None
        elif self.settled and self.repay_transaction_id:
            Transaction.objects.filter(pk=self.repay_transaction_id).update(account=self.account)

        if updates:
            Loan.objects.filter(pk=self.pk).update(**updates)
            for field, value in updates.items():
                setattr(self, field, value)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        was_settled = None
        if not is_new:
            was_settled = Loan.objects.filter(pk=self.pk).values_list('settled', flat=True).first()
        super().save(*args, **kwargs)
        self._sync_transactions(is_new=is_new, was_settled=was_settled)

    def delete(self, *args, **kwargs):
        from transactions.models import Transaction
        txn_ids = [tid for tid in (self.lend_transaction_id, self.repay_transaction_id) if tid]
        result = super().delete(*args, **kwargs)
        if txn_ids:
            Transaction.objects.filter(pk__in=txn_ids).delete()
        return result
