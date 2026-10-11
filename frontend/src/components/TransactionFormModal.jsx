import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { transactionsApi } from '../api/transactions';
import { useLookups } from '../context/LookupContext';
import AmountInput from './AmountInput';
import CategoryPicker from './CategoryPicker';
import { evaluateExpression } from '../utils/calc';

const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const buildForm = (date, type = 'expense') => ({
  type,
  amount: '',
  category: '',
  account: '',
  description: '',
  tags: '',
  date: date || getTodayStr(),
});

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function TransactionFormModal({ open, initialDate, initialType = 'expense', onClose, onSaved }) {
  const { categories, accounts } = useLookups();
  const [form, setForm] = useState(() => buildForm(initialDate, initialType));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(initialDate, initialType));
      setError('');
    }
  }, [open, initialDate, initialType]);

  if (!open) return null;

  const filteredCategories = categories.filter((c) => c.type === form.type);

  function handleQuickAmount(amt) {
    const current = Number(evaluateExpression(form.amount) || 0);
    const next = current > 0 ? current + amt : amt;
    setForm((f) => ({ ...f, amount: String(next) }));
  }

  function setDateShortcut(str) {
    setForm((f) => ({ ...f, date: str }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      await transactionsApi.create({
        ...form,
        amount,
        category: form.category || null,
        account: form.account || null,
      });
      onSaved?.();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Could not add transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-enhanced" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Transaction</h2>
          <div className="type-toggle-pills">
            <button
              type="button"
              className={`type-pill expense ${form.type === 'expense' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, type: 'expense', category: '' })}
            >
              <ArrowDownLeft size={14} /> Expense
            </button>
            <button
              type="button"
              className={`type-pill income ${form.type === 'income' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, type: 'income', category: '' })}
            >
              <ArrowUpRight size={14} /> Income
            </button>
          </div>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <div className="amount-section">
            <AmountInput
              value={form.amount}
              onChange={(amount) => setForm({ ...form, amount })}
              placeholder="0.00"
              required
              autoFocus
            />
            <div className="quick-amount-row">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleQuickAmount(amt)}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="category-section">
            <label className="section-label">Category</label>
            <CategoryPicker
              categories={filteredCategories}
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
            />
          </div>

          <div className="form-row-grid">
            {accounts.length > 0 && (
              <div className="form-field">
                <label className="section-label">Account</label>
                <select
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                >
                  <option value="">No account (Cash / General)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field date-field">
              <label className="section-label">Date</label>
              <div className="date-input-group">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
                <div className="date-shortcuts">
                  <button
                    type="button"
                    className={`date-chip ${form.date === getTodayStr() ? 'active' : ''}`}
                    onClick={() => setDateShortcut(getTodayStr())}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`date-chip ${form.date === getYesterdayStr() ? 'active' : ''}`}
                    onClick={() => setDateShortcut(getYesterdayStr())}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-field">
            <input
              placeholder="Description (e.g. Lunch with team)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-field">
            <input
              placeholder="Tags (optional: comma-separated e.g. vacation, food)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-action-btn" disabled={submitting}>
              {submitting ? 'Saving…' : form.type === 'expense' ? 'Record Expense' : 'Record Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
