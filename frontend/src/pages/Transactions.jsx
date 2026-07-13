import { useEffect, useState } from 'react';
import FilterPills from '../components/FilterPills';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import CategoryIcon from '../components/CategoryIcon';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';

const today = new Date();
const EMPTY_FORM = { type: 'expense', amount: '', category: '', description: '', date: today.toISOString().slice(0, 10) };

function monthBounds(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start_date: `${year}-${pad(month)}-01`,
    end_date: `${year}-${pad(month)}-${lastDay}`,
  };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const { version, bump } = useDataRefresh();

  function loadTransactions() {
    const params = { ...monthBounds(year, month) };
    if (filterType) params.type = filterType;
    client.get('/transactions/', { params }).then(({ data }) => setTransactions(data));
  }

  useEffect(() => {
    client.get('/categories/').then(({ data }) => setCategories(data));
  }, []);

  useEffect(loadTransactions, [filterType, version, month, year]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSearch('');
  }

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const displayed = search.trim()
    ? transactions.filter((t) =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    const payload = { ...form, amount, category: form.category || null };
    try {
      if (editingId) {
        await client.put(`/transactions/${editingId}/`, payload);
      } else {
        await client.post('/transactions/', payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      bump();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function handleEdit(t) {
    setEditingId(t.id);
    setForm({
      type: t.type,
      amount: t.amount,
      category: t.category ?? '',
      description: t.description,
      date: t.date,
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    await client.delete(`/transactions/${id}/`);
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
          <h1>Transactions</h1>
          <p>Every income and expense you've logged.</p>
        </div>
        <div className="filter-bar">
          <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
          <span>{String(month).padStart(2, '0')}/{year}</span>
          <button className="secondary" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <AmountInput
          value={form.amount}
          onChange={(amount) => setForm({ ...form, amount })}
          required
        />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">No category</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
      </form>

      <div className="filter-row">
        <FilterPills
          ariaLabel="Filter transactions by type"
          value={filterType}
          onChange={setFilterType}
          options={[
            { key: '', label: 'All' },
            { key: 'expense', label: 'Expense' },
            { key: 'income', label: 'Income' },
          ]}
        />
        <input
          placeholder="Search description or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((t) => (
            <tr key={t.id}>
              <td data-label="Date">{t.date}</td>
              <td data-label="Type">{t.type}</td>
              <td data-label="Category">
                {t.category_name ? (
                  <>
                    <span className="category-icon" style={{ background: `${t.category_color}33`, color: t.category_color, width: 22, height: 22 }}>
                      <CategoryIcon name={t.category_icon} size={12} />
                    </span>
                    {t.category_name}
                  </>
                ) : '-'}
              </td>
              <td data-label="Description">{t.description}</td>
              <td data-label="Amount" className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                {t.type === 'income' ? '+' : '-'}{Number(t.amount).toFixed(2)}
              </td>
              <td>
                <button onClick={() => handleEdit(t)}>Edit</button>
                <button onClick={() => handleDelete(t.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr><td colSpan={6}>{search ? 'No matches.' : `No transactions for ${String(month).padStart(2, '0')}/${year}.`}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
