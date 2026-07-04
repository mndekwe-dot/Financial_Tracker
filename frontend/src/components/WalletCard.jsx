import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';

export default function WalletCard() {
  const [wallet, setWallet] = useState(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const { version } = useDataRefresh();

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
    setWallet(data);
    setEditing(false);
  }

  if (!wallet) return null;

  return (
    <div className="wallet-card">
      <div className="wallet-card-top">
        <span>Remaining balance</span>
        {!editing && (
          <button onClick={startEdit}>
            <Pencil size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
            Depot: {Number(wallet.starting_balance).toFixed(2)}
          </button>
        )}
      </div>

      {editing ? (
        <form className="wallet-edit-form" onSubmit={saveDepot}>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button type="submit">Save</button>
          <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div className="wallet-remaining">{Number(wallet.remaining).toFixed(2)}</div>
      )}

      <div className="wallet-breakdown">
        <span>With loans included<b>{Number(wallet.remaining_with_loans).toFixed(2)}</b></span>
        <span>Owed to me<b>{Number(wallet.owed_to_me).toFixed(2)}</b></span>
        <span>I owe<b>{Number(wallet.i_owe).toFixed(2)}</b></span>
      </div>
    </div>
  );
}
