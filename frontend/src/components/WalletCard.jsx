import { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import { formatMoney } from '../utils/currency';

export default function WalletCard() {
  const [wallet, setWallet] = useState(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const { version, bump } = useDataRefresh();

  function load() {
    client.get('/wallet/').then(({ data }) => setWallet(data));
  }

  useEffect(load, [version]);

  function startEdit() {
    setValue(wallet.starting_balance);
    setEditing(true);
  }

  async function saveDepot(e) {
    e.preventDefault();
    const { data } = await client.patch('/wallet/', { starting_balance: value });
    if (!data.queuedOffline) {
      setWallet(data);
    }
    setEditing(false);
    bump();
  }

  if (!wallet) return null;

  return (
    <div className="wallet-card elevated-wallet">
      <div className="wallet-card-top">
        <div className="wallet-label-group">
          <span className="wallet-pill-label">Total Balance (Depot)</span>
          <span className="wallet-subtitle">Calculated from opening baseline & transactions</span>
        </div>
        {!editing ? (
          <button className="depot-edit-pill" onClick={startEdit} title="Adjust starting depot baseline">
            <Pencil size={12} />
            <span>Depot: {formatMoney(wallet.starting_balance)}</span>
          </button>
        ) : null}
      </div>

      {editing ? (
        <form className="wallet-edit-form" onSubmit={saveDepot}>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Starting balance"
            autoFocus
          />
          <button type="submit" className="save-btn" title="Save depot">
            <Check size={16} /> Save
          </button>
          <button type="button" className="secondary cancel-btn" onClick={() => setEditing(false)} title="Cancel">
            <X size={16} />
          </button>
        </form>
      ) : (
        <div className="wallet-hero-amount">
          <span className="wallet-remaining">{formatMoney(wallet.remaining)}</span>
        </div>
      )}

      <div className="wallet-breakdown">
        <div className="breakdown-item">
          <span className="breakdown-title">With Loans Factored</span>
          <b className="breakdown-val highlight">{formatMoney(wallet.remaining_with_loans)}</b>
        </div>
        <div className="breakdown-item">
          <span className="breakdown-title">Owed to Me</span>
          <b className="breakdown-val income">{formatMoney(wallet.owed_to_me)}</b>
        </div>
        <div className="breakdown-item">
          <span className="breakdown-title">I Owe (Debts)</span>
          <b className="breakdown-val expense">{formatMoney(wallet.i_owe)}</b>
        </div>
      </div>
    </div>
  );
}
