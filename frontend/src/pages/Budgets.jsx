import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';
import CategoryIcon from '../components/CategoryIcon';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';

const today = new Date();
const EMPTY_FORM = { category: '', amount: '' };

const prevMonth = (m, y) => (m === 1 ? { m: 12, y: y - 1 } : { m: m - 1, y });

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const { version, bump } = useDataRefresh();
  const toast = useToast();

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

  async function copyFromPrevious() {
    const { m: fm, y: fy } = prevMonth(month, year);
    try {
      const { data } = await client.post('/budgets/copy/', {
        from_month: fm, from_year: fy, to_month: month, to_year: year,
      });
      bump();
      toast(data.created > 0
        ? `Copied ${data.created} budget${data.created === 1 ? '' : 's'} from ${fm}/${fy}.`
        : `Nothing to copy from ${fm}/${fy}.`, data.created > 0 ? 'success' : 'info');
    } catch {
      toast('Could not copy budgets.', 'error');
    }
  }

  // Available = amount + rollover from last month. Alerts & totals use it.
  const budgetAlerts = budgets.reduce(
    (acc, b) => {
      const spent = Number(b.spent);
      const available = Number(b.available);
      if (available <= 0) return acc;
      if (spent > available) { acc.over += 1; acc.total += 1; }
      else if (spent / available >= 0.8) { acc.near += 1; acc.total += 1; }
      return acc;
    },
    { over: 0, near: 0, total: 0 },
  );

  const totals = budgets.reduce(
    (acc, b) => {
      acc.budgeted += Number(b.amount);
      acc.available += Number(b.available);
      acc.spent += Number(b.spent);
      return acc;
    },
    { budgeted: 0, available: 0, spent: 0 },
  );
  const totalPct = totals.available > 0 ? Math.min(100, (totals.spent / totals.available) * 100) : 0;
  const totalOver = totals.spent > totals.available;

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
        <button type="button" className="secondary" onClick={copyFromPrevious} title="Copy budgets from last month">
          <Copy size={15} style={{ verticalAlign: -2 }} /> Copy last month
        </button>
      </form>

      {budgets.length > 0 && (
        <div className="budget-summary">
          <div className="budget-summary-head">
            <span>Spent this month</span>
            <strong className={totalOver ? 'amount-expense' : ''}>
              {totals.spent.toFixed(2)} / {totals.available.toFixed(2)}
            </strong>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill ${totalOver ? 'over' : ''}`} style={{ width: `${totalPct}%` }} />
          </div>
          <div className="budget-summary-foot">
            <span>Budgeted {totals.budgeted.toFixed(2)}</span>
            <span className={totalOver ? 'amount-expense' : 'amount-income'}>
              {totalOver
                ? `${(totals.spent - totals.available).toFixed(2)} over`
                : `${(totals.available - totals.spent).toFixed(2)} left`}
            </span>
          </div>
        </div>
      )}

      {budgetAlerts.total > 0 && (
        <div className={`budget-alert ${budgetAlerts.over > 0 ? 'is-over' : 'is-near'}`}>
          {budgetAlerts.over > 0 && <span><strong>{budgetAlerts.over}</strong> over budget</span>}
          {budgetAlerts.over > 0 && budgetAlerts.near > 0 && <span> · </span>}
          {budgetAlerts.near > 0 && <span><strong>{budgetAlerts.near}</strong> near the limit</span>}
        </div>
      )}

      <div className="budget-list">
        {budgets.map((b) => {
          const spent = Number(b.spent);
          const amount = Number(b.amount);
          const rollover = Number(b.rollover);
          const available = Number(b.available);
          const difference = available - spent;
          const pct = available > 0 ? Math.min(100, (spent / available) * 100) : 0;
          const over = spent > available;
          const near = !over && available > 0 && spent / available >= 0.8;
          return (
            <div key={b.id} className={`budget-card${over ? ' over' : near ? ' near' : ''}`}>
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
                  className={`progress-fill ${over ? 'over' : near ? 'near' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="budget-card-footer">
                <span>{spent.toFixed(2)} / {available.toFixed(2)}</span>
                <span className={over ? 'amount-expense' : 'amount-income'}>
                  {over ? `${Math.abs(difference).toFixed(2)} over` : `${difference.toFixed(2)} left`}
                </span>
              </div>
              {rollover !== 0 && (
                <div className="budget-rollover">
                  budget {amount.toFixed(2)}
                  <span className={rollover > 0 ? 'amount-income' : 'amount-expense'}>
                    {' '}{rollover > 0 ? '+' : '−'}{Math.abs(rollover).toFixed(2)} rollover
                  </span>
                </div>
              )}
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
