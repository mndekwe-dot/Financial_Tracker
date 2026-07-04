import { useEffect, useState } from 'react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import CategoryIcon from '../components/CategoryIcon';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';

const today = new Date();
const EMPTY_FORM = { category: '', amount: '' };

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const { version, bump } = useDataRefresh();

  function loadBudgets() {
    client.get('/budgets/', { params: { month, year } }).then(({ data }) => setBudgets(data));
  }

  useEffect(() => {
    client.get('/categories/', { params: { type: 'expense' } }).then(({ data }) =>
      setCategories(data.filter((c) => c.type === 'expense'))
    );
  }, []);

  useEffect(loadBudgets, [version, month, year]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    const payload = { category: form.category, amount, month, year };
    try {
      if (editingId) {
        await client.put(`/budgets/${editingId}/`, payload);
      } else {
        await client.post('/budgets/', payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      bump();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function handleEdit(b) {
    setEditingId(b.id);
    setForm({ category: b.category, amount: b.amount });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this budget?')) return;
    await client.delete(`/budgets/${id}/`);
    bump();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p>Set monthly limits per category and track what's left.</p>
        </div>
        <div className="filter-bar">
          <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
          <span>{month}/{year}</span>
          <button className="secondary" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <AmountInput
          value={form.amount}
          onChange={(amount) => setForm({ ...form, amount })}
          required
        />
        <button type="submit">{editingId ? 'Update' : `Add for ${month}/${year}`}</button>
        {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
      </form>

      <div className="budget-list">
        {budgets.map((b) => {
          const spent = Number(b.spent);
          const amount = Number(b.amount);
          const difference = amount - spent;
          const pct = Math.min(100, (spent / amount) * 100);
          const over = spent > amount;
          return (
            <div key={b.id} className="budget-card">
              <div className="budget-card-header">
                <span>
                  <span className="category-icon" style={{ background: `${b.category_color}33`, color: b.category_color }}>
                    <CategoryIcon name={b.category_icon} size={15} />
                  </span>
                  {b.category_name}
                </span>
                <span>{b.month}/{b.year}</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${over ? 'over' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="budget-card-footer">
                <span>{spent.toFixed(2)} / {amount.toFixed(2)}</span>
                <span className={over ? 'amount-expense' : 'amount-income'}>
                  {over ? `${Math.abs(difference).toFixed(2)} over` : `${difference.toFixed(2)} left`}
                </span>
              </div>
              <div className="budget-card-actions">
                <button onClick={() => handleEdit(b)}>Edit</button>
                <button onClick={() => handleDelete(b.id)}>Delete</button>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <p>No budgets set for {month}/{year} yet.</p>}
      </div>
    </div>
  );
}
