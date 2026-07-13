import { useEffect, useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useUndoableDelete } from '../utils/useUndoableDelete';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', target_amount: '', color: '#6366f1', target_date: '' };

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();
  const undoableDelete = useUndoableDelete();

  function load() {
    client.get('/goals/').then(({ data }) => setGoals(data));
  }

  useEffect(load, []);

  async function addGoal(e) {
    e.preventDefault();
    setError('');
    const target = evaluateExpression(form.target_amount);
    if (target === null || target <= 0) {
      setError('Enter a target greater than zero.');
      return;
    }
    setBusy(true);
    try {
      await client.post('/goals/', {
        name: form.name,
        target_amount: target,
        color: form.color,
        target_date: form.target_date || null,
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
      load();
      toast('Goal created.');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function contribute(goal, sign) {
    const raw = prompt(`${sign > 0 ? 'Add to' : 'Withdraw from'} "${goal.name}" — amount:`);
    if (raw === null) return;
    const value = evaluateExpression(raw);
    if (value === null || value <= 0) {
      toast('Enter a valid amount.', 'error');
      return;
    }
    await client.post(`/goals/${goal.id}/contribute/`, { amount: sign * value });
    load();
    toast(sign > 0 ? 'Contribution added.' : 'Withdrawn.');
  }

  function remove(g) {
    undoableDelete({
      label: 'Goal',
      remove: () => setGoals((cur) => cur.filter((x) => x.id !== g.id)),
      restore: () => load(),
      doDelete: () => client.delete(`/goals/${g.id}/`),
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Savings goals</h1>
          <p>Set targets and track your progress toward them.</p>
        </div>
      </div>

      <div className="table-toolbar">
        <button type="button" onClick={() => { setError(''); setForm(EMPTY_FORM); setShowAdd(true); }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> New goal
        </button>
      </div>

      {goals.length === 0 && <p className="shop-empty">No goals yet — create one to start saving toward something.</p>}

      <div className="goals-grid">
        {goals.map((g) => {
          const pct = Number(g.progress);
          const done = pct >= 100;
          return (
            <div key={g.id} className={`goal-card${done ? ' done' : ''}`} style={{ '--goal-color': g.color }}>
              <div className="goal-card-head">
                <span className="goal-icon"><Target size={18} /></span>
                <strong>{g.name}</strong>
                <button className="secondary icon-btn goal-del" onClick={() => remove(g)} title="Delete goal">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="goal-amounts">
                <span className="goal-saved">{Number(g.saved_amount).toFixed(2)}</span>
                <span className="goal-target"> / {Number(g.target_amount).toFixed(2)}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill goal-fill" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <div className="goal-card-footer">
                <span>{done ? 'Reached 🎉' : `${Number(g.remaining).toFixed(2)} to go`}</span>
                <span>{pct}%</span>
              </div>
              {g.target_date && <div className="goal-date">Target: {g.target_date}</div>}
              <div className="goal-actions">
                <button type="button" onClick={() => contribute(g, 1)}>Add</button>
                <button type="button" className="secondary" onClick={() => contribute(g, -1)}>Withdraw</button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New savings goal</h2>
            <form className="modal-form" onSubmit={addGoal}>
              {error && <p className="error">{error}</p>}
              <input
                placeholder="Name (e.g. New laptop)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                required
              />
              <AmountInput value={form.target_amount} onChange={(target_amount) => setForm({ ...form, target_amount })} required />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                Colour
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
                Target date (optional)
                <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
