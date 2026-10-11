import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import FilterPills from '../components/FilterPills';
import CategoryPicker from '../components/CategoryPicker';
import { useUndoableDelete } from '../utils/useUndoableDelete';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import CategoryIcon from '../components/CategoryIcon';
import AmountInput from '../components/AmountInput';
import TransactionFormModal from '../components/TransactionFormModal';
import { TableSkeleton } from '../components/Skeleton';
import { formatMoney } from '../utils/currency';
import { evaluateExpression } from '../utils/calc';

const today = new Date();
const EMPTY_FORM = {
  type: 'expense', amount: '', category: '', account: '',
  description: '', tags: '', date: today.toISOString().slice(0, 10),
};

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
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const { version, bump } = useDataRefresh();
  const undoableDelete = useUndoableDelete();

  function loadTransactions() {
    setLoading(true);
    const params = { ...monthBounds(year, month) };
    if (filterType) params.type = filterType;
    if (filterCategory) params.category = filterCategory;
    client.get('/transactions/', { params })
      .then(({ data }) => setTransactions(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    client.get('/categories/').then(({ data }) => setCategories(data));
    client.get('/money/accounts/').then(({ data }) => setAccounts(data));
  }, []);

  useEffect(loadTransactions, [filterType, filterCategory, version, month, year]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
    setEditingId(null);
    setSearch('');
  }

  const displayed = transactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.category_name?.toLowerCase().includes(q) ||
      t.account_name?.toLowerCase().includes(q) ||
      t.tags?.toLowerCase().includes(q)
    );
  });

  const monthIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthNet = monthIncome - monthExpense;

  function handleEdit(t) {
    setEditingId(t.id);
    setForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category ?? '',
      account: t.account ?? '',
      description: t.description || '',
      tags: t.tags ?? '',
      date: t.date,
    });
  }

  async function handleUpdateSubmit(e) {
    e.preventDefault();
    const amount = evaluateExpression(form.amount);
    if (!amount || amount <= 0) return;
    const payload = { ...form, amount, category: form.category || null, account: form.account || null };
    try {
      await client.put(`/transactions/${editingId}/`, payload);
      setEditingId(null);
      setForm(EMPTY_FORM);
      bump();
    } catch {
      alert('Could not update transaction.');
    }
  }

  function handleDelete(t) {
    undoableDelete({
      label: 'Transaction',
      remove: () => setTransactions((cur) => cur.filter((x) => x.id !== t.id)),
      restore: () => loadTransactions(),
      doDelete: async () => { await client.delete(`/transactions/${t.id}/`); bump(); },
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>Every expense and income with accounts, tags and categories.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filter-bar">
            <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
            <span>{String(month).padStart(2, '0')}/{year}</span>
            <button className="secondary" onClick={() => changeMonth(1)}>›</button>
          </div>
          <button
            type="button"
            className="add-txn-hero-btn"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      {/* Month Totals Strip */}
      <div className="month-mini-summary">
        <div className="mini-stat income">
          <span>Income</span>
          <b>+{formatMoney(monthIncome)}</b>
        </div>
        <div className="mini-stat expense">
          <span>Expense</span>
          <b>-{formatMoney(monthExpense)}</b>
        </div>
        <div className="mini-stat balance">
          <span>Net</span>
          <b>{formatMoney(monthNet)}</b>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="txn-filter-bar">
        <div className="filter-row-left">
          <FilterPills
            ariaLabel="Filter transactions by type"
            value={filterType}
            onChange={setFilterType}
            options={[
              { key: '', label: 'All' },
              { key: 'expense', label: 'Expenses' },
              { key: 'income', label: 'Income' },
            ]}
          />
        </div>
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search description, tag or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="clear-search-btn" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Category Chips */}
      {categories.length > 0 && (
        <div className="category-filter-slider">
          <button
            type="button"
            className={`cat-pill ${filterCategory === '' ? 'active' : ''}`}
            onClick={() => setFilterCategory('')}
          >
            All Categories
          </button>
          {categories
            .filter((c) => !filterType || c.type === filterType)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat-pill ${String(filterCategory) === String(c.id) ? 'active' : ''}`}
                style={{ '--pill-color': c.color }}
                onClick={() => setFilterCategory(String(filterCategory) === String(c.id) ? '' : String(c.id))}
              >
                <CategoryIcon name={c.icon} size={13} />
                <span>{c.name}</span>
              </button>
            ))}
        </div>
      )}

      {/* Transactions Table / List */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description & Tags</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((t) => (
              <tr key={t.id}>
                <td data-label="Date">
                  <span className="txn-date-cell">{t.date}</span>
                </td>
                <td data-label="Category">
                  {t.category_name ? (
                    <span className="category-tag-cell">
                      <span className="category-icon" style={{ background: `${t.category_color}25`, color: t.category_color }}>
                        <CategoryIcon name={t.category_icon} size={13} />
                      </span>
                      <span>{t.category_name}</span>
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td data-label="Description">
                  <div className="txn-desc-wrap">
                    <span className="txn-desc-title">{t.description || 'Untitled Transaction'}</span>
                    {t.tags && (
                      <span className="txn-tags">
                        {t.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <span key={tag} className="txn-tag">{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </td>
                <td data-label="Account">
                  {t.account_name ? (
                    <span className="account-badge-pill">{t.account_name}</span>
                  ) : (
                    <span className="text-faint">Cash</span>
                  )}
                </td>
                <td data-label="Amount" className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                  <b>{t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}</b>
                </td>
                <td data-label="Actions">
                  <div className="table-actions">
                    <button className="secondary sm-btn" onClick={() => handleEdit(t)}>Edit</button>
                    <button className="secondary sm-btn danger-hover" onClick={() => handleDelete(t)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="empty-table-state">
                    <p style={{ margin: '0 0 0.8rem', color: 'var(--color-text-muted)' }}>
                      {search || filterCategory || filterType
                        ? 'No transactions matched your filters.'
                        : `No transactions logged for ${String(month).padStart(2, '0')}/${year}.`}
                    </p>
                    <button
                      type="button"
                      className="add-txn-hero-btn"
                      onClick={() => setAddModalOpen(true)}
                    >
                      <Plus size={16} /> Record Transaction
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="modal-backdrop" onClick={() => setEditingId(null)}>
          <div className="modal modal-enhanced" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Transaction</h2>
            <form className="modal-form" onSubmit={handleUpdateSubmit}>
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
              <CategoryPicker
                categories={categories.filter((c) => c.type === form.type)}
                value={form.category}
                onChange={(category) => setForm({ ...form, category })}
              />
              {accounts.length > 0 && (
                <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
                  <option value="">No account (Cash / General)</option>
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
                placeholder="Tags (comma-separated)"
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
                <button type="button" className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                <button type="submit">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <TransactionFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => { setAddModalOpen(false); bump(); }}
      />
    </div>
  );
}
