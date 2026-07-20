import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import FilterPills from '../components/FilterPills';
import { evaluateExpression } from '../utils/calc';
import { useUndoableDelete } from '../utils/useUndoableDelete';
import { useDataRefresh } from '../context/DataRefreshContext';

const EMPTY_FORM = {
  person: '', amount: '', direction: 'owed_to_me', date: new Date().toISOString().slice(0, 10), note: '', account: '',
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('outstanding'); // 'all' | 'outstanding' | 'settled'
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'owed_to_me' | 'i_owe'
  const { version, bump } = useDataRefresh();
  const undoableDelete = useUndoableDelete();

  function load() {
    client.get('/loans/').then(({ data }) => setLoans(data));
    client.get('/loans/summary/').then(({ data }) => setSummary(data));
    client.get('/money/accounts/').then(({ data }) => setAccounts(data.filter((a) => !a.archived)));
  }

  useEffect(load, [version]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(form.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    try {
      const payload = { ...form, amount, account: form.account || null };
      if (editingId) {
        await client.patch(`/loans/${editingId}/`, payload);
      } else {
        await client.post('/loans/', payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      bump();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function handleEdit(loan) {
    setEditingId(loan.id);
    setForm({
      person: loan.person,
      amount: String(loan.amount),
      direction: loan.direction,
      date: loan.date,
      note: loan.note || '',
      account: loan.account || '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function toggleSettled(loan) {
    await client.patch(`/loans/${loan.id}/`, { settled: !loan.settled });
    bump();
  }

  function handleDelete(loan) {
    undoableDelete({
      label: 'Loan',
      remove: () => setLoans((cur) => cur.filter((x) => x.id !== loan.id)),
      restore: () => load(),
      doDelete: async () => { await client.delete(`/loans/${loan.id}/`); bump(); },
    });
  }

  const byStatus = (l) =>
    statusFilter === 'all' || (statusFilter === 'settled' ? l.settled : !l.settled);
  const byDirection = (l) => directionFilter === 'all' || l.direction === directionFilter;
  const visibleLoans = loans.filter((l) => byStatus(l) && byDirection(l));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Money lent out or borrowed. Automatically tracked in your balance as an expense or income.</p>
        </div>
      </div>

      {summary && (
        <div className="loan-summary-cards">
          <div className="summary-card income">
            <span>Owed to me</span>
            <strong>{Number(summary.owed_to_me).toFixed(2)}</strong>
          </div>
          <div className="summary-card expense">
            <span>I owe</span>
            <strong>{Number(summary.i_owe).toFixed(2)}</strong>
          </div>
          <div className="summary-card balance">
            <span>Net</span>
            <strong>{Number(summary.net).toFixed(2)}</strong>
          </div>
        </div>
      )}

      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <input
          placeholder="Person"
          value={form.person}
          onChange={(e) => setForm({ ...form, person: e.target.value })}
          required
        />
        <AmountInput
          value={form.amount}
          onChange={(amount) => setForm({ ...form, amount })}
          required
        />
        <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
          <option value="owed_to_me">Owed to me</option>
          <option value="i_owe">I owe</option>
        </select>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
          <option value="">No account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <input
          placeholder="Note (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
      </form>
      <p className="hint">
        Lending money books it as an expense right away; marking a loan settled books the
        repayment as income. Borrowing works the other way round.
      </p>

      {loans.length > 0 && (
        <div className="filter-row">
          <FilterPills
            ariaLabel="Filter loans by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { key: 'outstanding', label: 'Outstanding', count: loans.filter((l) => !l.settled).length },
              { key: 'settled', label: 'Settled', count: loans.filter((l) => l.settled).length },
              { key: 'all', label: 'All', count: loans.length },
            ]}
          />
          <FilterPills
            ariaLabel="Filter loans by direction"
            value={directionFilter}
            onChange={setDirectionFilter}
            options={[
              { key: 'all', label: 'Both' },
              { key: 'owed_to_me', label: 'Owed to me' },
              { key: 'i_owe', label: 'I owe' },
            ]}
          />
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Direction</th>
            <th>Amount</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleLoans.map((loan) => (
            <tr key={loan.id} style={{ opacity: loan.settled ? 0.5 : 1 }}>
              <td data-label="Person">{loan.person}</td>
              <td data-label="Direction">
                <span className={`badge ${loan.direction === 'owed_to_me' ? 'owed-to-me' : 'i-owe'}`}>
                  {loan.direction === 'owed_to_me' ? 'Owed to me' : 'I owe'}
                </span>
              </td>
              <td data-label="Amount" className={loan.direction === 'owed_to_me' ? 'amount-income' : 'amount-expense'}>
                {Number(loan.amount).toFixed(2)}
              </td>
              <td data-label="Date">{loan.date}</td>
              <td>
                <button className="secondary" onClick={() => handleEdit(loan)} title="Edit">
                  <Pencil size={16} />
                </button>
                <button className="secondary" onClick={() => toggleSettled(loan)} title="Toggle settled">
                  <CheckCircle2 size={16} />
                </button>
                <button className="secondary" onClick={() => handleDelete(loan)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {loans.length === 0 && (
            <tr><td colSpan={5}>No loans recorded yet.</td></tr>
          )}
          {loans.length > 0 && visibleLoans.length === 0 && (
            <tr><td colSpan={5}>No loans match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
