import { useEffect, useState } from 'react';
import { Plus, Trash2, Play, Pause } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  frequency: 'monthly',
  next_date: new Date().toISOString().slice(0, 10),
};

export default function Recurring() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { bump } = useDataRefresh();
  const toast = useToast();

  function load() {
    client.get('/recurring/').then(({ data }) => setItems(data));
  }

  useEffect(() => {
    load();
    client.get('/categories/').then(({ data }) => setCategories(data));
  }, []);

  const formCategories = categories.filter((c) => c.type === form.type);

  async function addItem(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      await client.post('/recurring/', { ...form, amount, category: form.category || null });
      setForm(EMPTY_FORM);
      setShowAdd(false);
      load();
      toast('Recurring item added.');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item) {
    await client.patch(`/recurring/${item.id}/`, { active: !item.active });
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this recurring item?')) return;
    await client.delete(`/recurring/${id}/`);
    load();
    toast('Deleted.', 'info');
  }

  async function runDue() {
    const { data } = await client.post('/recurring/run_due/');
    load();
    bump();
    toast(data.created > 0 ? `Posted ${data.created} due transaction${data.created === 1 ? '' : 's'}.` : 'Nothing due right now.');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recurring</h1>
          <p>Templates that post automatically — rent, salary, subscriptions.</p>
        </div>
      </div>

      <div className="table-toolbar">
        <button type="button" onClick={() => { setError(''); setForm(EMPTY_FORM); setShowAdd(true); }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> New recurring
        </button>
        <button type="button" className="secondary" onClick={runDue}>
          <Play size={15} style={{ verticalAlign: -2 }} /> Post due now
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Every</th>
            <th>Next date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
              <td data-label="Description">{item.description || <span className="muted">—</span>}{item.category_name ? ` · ${item.category_name}` : ''}</td>
              <td data-label="Type">{item.type}</td>
              <td data-label="Amount" className={item.type === 'income' ? 'amount-income' : 'amount-expense'}>
                {Number(item.amount).toFixed(2)}
              </td>
              <td data-label="Every">{item.frequency}</td>
              <td data-label="Next date">{item.next_date}</td>
              <td data-label="Status">{item.active ? 'Active' : 'Paused'}</td>
              <td>
                <button className="secondary" onClick={() => toggleActive(item)} title={item.active ? 'Pause' : 'Resume'}>
                  {item.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="secondary" onClick={() => remove(item.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={7}>No recurring items yet.</td></tr>
          )}
        </tbody>
      </table>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New recurring item</h2>
            <form className="modal-form" onSubmit={addItem}>
              {error && <p className="error">{error}</p>}
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <AmountInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required autoFocus />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">No category</option>
                {formCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                placeholder="Description (e.g. Rent)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
                First / next date
                <input
                  type="date"
                  value={form.next_date}
                  onChange={(e) => setForm({ ...form, next_date: e.target.value })}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
