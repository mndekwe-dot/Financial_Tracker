import { useEffect, useState } from 'react';
import { Plus, Trash2, Wallet, Landmark, Smartphone, PiggyBank, CircleDollarSign, ArrowLeftRight } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { formatMoney } from '../utils/currency';
import { useUndoableDelete } from '../utils/useUndoableDelete';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';

const TYPES = [
  { key: 'cash', label: 'Cash', Icon: Wallet },
  { key: 'bank', label: 'Bank', Icon: Landmark },
  { key: 'mobile_money', label: 'Mobile money', Icon: Smartphone },
  { key: 'savings', label: 'Savings', Icon: PiggyBank },
  { key: 'other', label: 'Other', Icon: CircleDollarSign },
];
const typeMeta = (t) => TYPES.find((x) => x.key === t) || TYPES[4];

const EMPTY_ACCOUNT = { name: '', type: 'cash', opening_balance: '', color: '#6366f1' };
const EMPTY_TRANSFER = { from_account: '', to_account: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [acctForm, setAcctForm] = useState(EMPTY_ACCOUNT);
  const [xferForm, setXferForm] = useState(EMPTY_TRANSFER);
  const [showAcct, setShowAcct] = useState(false);
  const [showXfer, setShowXfer] = useState(false);
  const [error, setError] = useState('');
  const { version, bump } = useDataRefresh();
  const toast = useToast();
  const undoableDelete = useUndoableDelete();

  function load() {
    client.get('/money/accounts/').then(({ data }) => setAccounts(data));
    client.get('/money/transfers/').then(({ data }) => setTransfers(data));
  }

  useEffect(load, [version]);

  async function addAccount(e) {
    e.preventDefault();
    setError('');
    const opening = acctForm.opening_balance === '' ? 0 : evaluateExpression(acctForm.opening_balance);
    if (opening === null) {
      setError('Enter a valid opening balance.');
      return;
    }
    try {
      await client.post('/money/accounts/', { ...acctForm, opening_balance: opening });
      setAcctForm(EMPTY_ACCOUNT);
      setShowAcct(false);
      bump();
      toast('Account added.');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function deleteAccount(account) {
    undoableDelete({
      label: 'Account',
      remove: () => setAccounts((cur) => cur.filter((x) => x.id !== account.id)),
      restore: () => load(),
      doDelete: async () => { await client.delete(`/money/accounts/${account.id}/`); bump(); },
    });
  }

  async function addTransfer(e) {
    e.preventDefault();
    setError('');
    const amount = evaluateExpression(xferForm.amount);
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!xferForm.from_account || !xferForm.to_account) {
      setError('Choose both accounts.');
      return;
    }
    try {
      await client.post('/money/transfers/', { ...xferForm, amount });
      setXferForm(EMPTY_TRANSFER);
      setShowXfer(false);
      bump();
      toast('Transfer recorded.');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Transfer failed.');
    }
  }

  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>Track cash, bank, mobile money and savings separately.</p>
        </div>
      </div>

      <div className="loan-summary-cards">
        <div className="summary-card balance">
          <span>Total across accounts</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>

      <div className="table-toolbar">
        <button type="button" onClick={() => { setError(''); setAcctForm(EMPTY_ACCOUNT); setShowAcct(true); }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> New account
        </button>
        <button type="button" className="secondary" onClick={() => { setError(''); setXferForm(EMPTY_TRANSFER); setShowXfer(true); }} disabled={accounts.length < 2}>
          <ArrowLeftRight size={15} style={{ verticalAlign: -2 }} /> Transfer
        </button>
      </div>

      {accounts.length === 0 && <p className="shop-empty">No accounts yet — add one to start tracking balances.</p>}

      <div className="goals-grid">
        {accounts.map((a) => {
          const { Icon, label } = typeMeta(a.type);
          return (
            <div key={a.id} className="goal-card" style={{ '--goal-color': a.color }}>
              <div className="goal-card-head">
                <span className="goal-icon"><Icon size={18} /></span>
                <strong>{a.name}</strong>
                <button className="secondary icon-btn goal-del" onClick={() => deleteAccount(a)} title="Delete account">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="goal-amounts">
                <span className="goal-saved">{formatMoney(a.balance)}</span>
              </div>
              <div className="goal-card-footer">
                <span>{label}</span>
                <span>opened {Number(a.opening_balance).toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {transfers.length > 0 && (
        <>
          <h2 className="shopping-section-title">Transfers</h2>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>From</th><th>To</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td data-label="Date">{t.date}</td>
                  <td data-label="From">{t.from_account_name}</td>
                  <td data-label="To">{t.to_account_name}</td>
                  <td data-label="Amount">{Number(t.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showAcct && (
        <div className="modal-backdrop" onClick={() => setShowAcct(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New account</h2>
            <form className="modal-form" onSubmit={addAccount}>
              {error && <p className="error">{error}</p>}
              <input placeholder="Name (e.g. MTN MoMo)" value={acctForm.name} onChange={(e) => setAcctForm({ ...acctForm, name: e.target.value })} autoFocus required />
              <select value={acctForm.type} onChange={(e) => setAcctForm({ ...acctForm, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Opening balance</label>
              <AmountInput value={acctForm.opening_balance} onChange={(opening_balance) => setAcctForm({ ...acctForm, opening_balance })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                Colour
                <input type="color" value={acctForm.color} onChange={(e) => setAcctForm({ ...acctForm, color: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAcct(false)}>Cancel</button>
                <button type="submit">Add account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showXfer && (
        <div className="modal-backdrop" onClick={() => setShowXfer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Transfer between accounts</h2>
            <form className="modal-form" onSubmit={addTransfer}>
              {error && <p className="error">{error}</p>}
              <select value={xferForm.from_account} onChange={(e) => setXferForm({ ...xferForm, from_account: e.target.value })} required>
                <option value="">From account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={xferForm.to_account} onChange={(e) => setXferForm({ ...xferForm, to_account: e.target.value })} required>
                <option value="">To account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <AmountInput value={xferForm.amount} onChange={(amount) => setXferForm({ ...xferForm, amount })} required />
              <input type="date" value={xferForm.date} onChange={(e) => setXferForm({ ...xferForm, date: e.target.value })} required />
              <input placeholder="Note (optional)" value={xferForm.note} onChange={(e) => setXferForm({ ...xferForm, note: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowXfer(false)}>Cancel</button>
                <button type="submit">Record transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
