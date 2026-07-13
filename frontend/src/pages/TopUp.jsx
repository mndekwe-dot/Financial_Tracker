import { useEffect, useState } from 'react';
import { Smartphone, BusFront, Check } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';

// The two top-up targets, each matched to one of the user's expense categories
// by name so the spend lands in the right place on reports.
const TARGETS = [
  { key: 'airtime', label: 'Airtime', keywords: ['airtime', 'data'], icon: Smartphone, description: 'Airtime top-up' },
  { key: 'transport', label: 'Transport card', keywords: ['transport'], icon: BusFront, description: 'Transport card top-up' },
];

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function TopUp() {
  const [categories, setCategories] = useState([]);
  const [target, setTarget] = useState('airtime');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { bump } = useDataRefresh();
  const toast = useToast();

  useEffect(() => {
    client.get('/categories/').then(({ data }) => setCategories(data));
  }, []);

  const active = TARGETS.find((t) => t.key === target);

  // First expense category whose name matches one of the target's keywords.
  function matchCategory(t) {
    return categories.find(
      (c) => c.type === 'expense' && t.keywords.some((k) => c.name.toLowerCase().includes(k)),
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const value = evaluateExpression(amount);
    if (value === null || value <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      const category = matchCategory(active);
      await client.post('/transactions/', {
        type: 'expense',
        amount: value,
        category: category ? category.id : null,
        description: active.description,
        date: new Date().toISOString().slice(0, 10),
      });
      setAmount('');
      bump();
      toast(`${active.label} topped up with ${value.toFixed(2)}.`);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Top-up failed.');
    } finally {
      setBusy(false);
    }
  }

  const matched = matchCategory(active);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Top up</h1>
          <p>Quickly log airtime or transport card top-ups as an expense.</p>
        </div>
      </div>

      <form className="topup-card" onSubmit={submit}>
        <div className="topup-targets">
          {TARGETS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === target;
            return (
              <button
                type="button"
                key={t.key}
                className={`topup-target${isActive ? ' active' : ''}`}
                onClick={() => setTarget(t.key)}
                aria-pressed={isActive}
              >
                <span className="topup-target-icon"><Icon size={22} /></span>
                <span className="topup-target-label">{t.label}</span>
                {isActive && <Check size={16} className="topup-target-check" />}
              </button>
            );
          })}
        </div>

        {error && <p className="error">{error}</p>}

        <AmountInput value={amount} onChange={setAmount} required autoFocus />

        <div className="topup-quick">
          {QUICK_AMOUNTS.map((q) => (
            <button type="button" key={q} className="topup-chip" onClick={() => setAmount(String(q))}>
              +{q}
            </button>
          ))}
        </div>

        <p className="topup-note">
          {matched
            ? <>Records an expense in <strong>{matched.name}</strong>.</>
            : <>No matching category found — this will be saved without a category. You can add a &ldquo;{active.label}&rdquo; category under Categories.</>}
        </p>

        <button type="submit" disabled={busy}>{busy ? 'Saving…' : `Top up ${active.label}`}</button>
      </form>
    </div>
  );
}
