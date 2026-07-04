import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useDataRefresh } from '../context/DataRefreshContext';

const EMPTY_FORM = { person: '', amount: '', direction: 'owed_to_me', date: new Date().toISOString().slice(0, 10), note: '' };

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const { version, bump } = useDataRefresh();

  function load() {
    client.get('/loans/').then(({ data }) => setLoans(data));
    client.get('/loans/summary/').then(({ data }) => setSummary(data));
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
      if (editingId) {
        await client.patch(`/loans/${editingId}/`, { ...form, amount });
      } else {
        await client.post('/loans/', { ...form, amount });
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

  async function handleDelete(id) {
    if (!confirm('Delete this loan record?')) return;
    await client.delete(`/loans/${id}/`);
    bump();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Money lent out or borrowed, separate from regular expenses.</p>
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
        <input
          placeholder="Note (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
      </form>

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
          {loans.map((loan) => (
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
                <button className="secondary" onClick={() => handleDelete(loan.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {loans.length === 0 && (
            <tr><td colSpan={5}>No loans recorded yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
