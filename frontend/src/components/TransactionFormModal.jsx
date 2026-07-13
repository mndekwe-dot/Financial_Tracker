import { useEffect, useState } from 'react';
import client from '../api/client';
import AmountInput from './AmountInput';
import { evaluateExpression } from '../utils/calc';

const buildForm = (date) => ({
  type: 'expense',
  amount: '',
  category: '',
  account: '',
  description: '',
  tags: '',
  date: date || new Date().toISOString().slice(0, 10),
});

export default function TransactionFormModal({ open, initialDate, onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(() => buildForm(initialDate));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(initialDate));
      setError('');
      client.get('/categories/').then(({ data }) => setCategories(data));
      client.get('/money/accounts/').then(({ data }) => setAccounts(data));
    }
  }, [open, initialDate]);

  if (!open) return null;

  const filteredCategories = categories.filter((c) => c.type === form.type);

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
      await client.post('/transactions/', { ...form, amount, category: form.category || null, account: form.account || null });
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Transaction</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <AmountInput
            value={form.amount}
            onChange={(amount) => setForm({ ...form, amount })}
            required
            autoFocus
          />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">No category</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {accounts.length > 0 && (
            <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            placeholder="Tags (comma-separated, e.g. trip, work)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
