import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import client from '../api/client';
import AmountInput from './AmountInput';
import CategoryPicker from './CategoryPicker';
import CategoryIcon from './CategoryIcon';
import { evaluateExpression } from '../utils/calc';

const emptyForm = (date) => ({
  type: 'expense', amount: '', category: '', account: '', description: '', tags: '', date,
});

// Modal for one calendar day: lists that day's transactions and lets you add
// a new one or edit/delete an existing one.
export default function DayTransactionsModal({ date, open, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm(date));
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  function load() {
    client.get('/transactions/', { params: { start_date: date, end_date: date } })
      .then(({ data }) => setItems(data));
  }

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(date));
    setEditingId(null);
    setAdding(false);
    setError('');
    load();
    client.get('/categories/').then(({ data }) => setCategories(data));
    client.get('/money/accounts/').then(({ data }) => setAccounts(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  if (!open) return null;

  const formCategories = categories.filter((c) => c.type === form.type);

  async function save(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    const payload = { ...form, amount, category: form.category || null, account: form.account || null };
    try {
      if (editingId) {
        await client.put(`/transactions/${editingId}/`, payload);
      } else {
        await client.post('/transactions/', payload);
      }
      setForm(emptyForm(date));
      setEditingId(null);
      setAdding(false);
      load();
      onChanged?.();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setAdding(true);
    setError('');
    setForm({
      type: t.type, amount: t.amount, category: t.category ?? '',
      account: t.account ?? '', description: t.description, tags: t.tags ?? '', date: t.date,
    });
  }

  async function remove(id) {
    await client.delete(`/transactions/${id}/`);
    load();
    onChanged?.();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{date}</h2>

        <div className="day-txn-list">
          {items.length === 0 && <p className="settings-note">No transactions on this day yet.</p>}
          {items.map((t) => (
            <div key={t.id} className="day-txn">
              <span className="category-icon" style={{ background: `${t.category_color || '#94a3b8'}33`, color: t.category_color || '#94a3b8', width: 26, height: 26 }}>
                <CategoryIcon name={t.category_icon || 'Wallet'} size={13} />
              </span>
              <div className="day-txn-main">
                <span className="day-txn-title">{t.category_name || t.description || 'Uncategorized'}</span>
                {(t.description || t.tags) && (
                  <small>{t.description}{t.tags ? ` · ${t.tags}` : ''}</small>
                )}
              </div>
              <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                {t.type === 'income' ? '+' : '-'}{Number(t.amount).toFixed(2)}
              </span>
              <button type="button" className="secondary icon-btn" onClick={() => startEdit(t)} title="Edit"><Pencil size={15} /></button>
              <button type="button" className="secondary icon-btn" onClick={() => remove(t.id)} title="Delete"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => { setForm(emptyForm(date)); setEditingId(null); setError(''); setAdding(true); }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> Add transaction
        </button>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Add/edit as its own modal dialog on top of the day view. */}
      {adding && (
        <div className="modal-backdrop" onClick={(e) => { e.stopPropagation(); setAdding(false); setEditingId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit transaction' : 'Add transaction'}</h2>
            <form className="modal-form" onSubmit={save}>
              {error && <p className="error">{error}</p>}
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <AmountInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required autoFocus />
              <CategoryPicker categories={formCategories} value={form.category} onChange={(category) => setForm({ ...form, category })} />
              {accounts.length > 0 && (
                <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
                  <option value="">No account</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => { setAdding(false); setEditingId(null); }}>Cancel</button>
                <button type="submit">{editingId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
