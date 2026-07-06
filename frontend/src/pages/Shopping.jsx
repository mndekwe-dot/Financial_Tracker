import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useDataRefresh } from '../context/DataRefreshContext';

const EMPTY_ITEM = { name: '', unit_price: '', quantity: '1' };

// Editable cell for the shopping stage: saves on blur/Enter if the value changed.
function ActualInput({ item, field, disabled, onSave }) {
  const current = item[field];
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      style={{ width: 90 }}
      key={`${item.id}-${field}-${current}`}
      defaultValue={current ?? ''}
      disabled={disabled}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      onBlur={(e) => {
        const value = e.target.value;
        if (value !== '' && Number(value) >= 0 && Number(value) !== Number(current)) {
          onSave(item, { [field]: value });
        }
      }}
    />
  );
}

export default function Shopping() {
  const [lists, setLists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [error, setError] = useState('');
  const { version, bump } = useDataRefresh();

  function load() {
    client.get('/shopping/lists/').then(({ data }) => {
      setLists(data);
      setActiveId((current) => (data.some((l) => l.id === current) ? current : (data[0]?.id ?? null)));
    });
  }

  useEffect(load, [version]);

  const active = lists.find((l) => l.id === activeId);

  async function createList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setError('');
    try {
      const { data } = await client.post('/shopping/lists/', { name: newListName.trim() });
      setNewListName('');
      if (data?.id) setActiveId(data.id);
      bump();
    } catch {
      setError('Could not create the list.');
    }
  }

  async function deleteList(id) {
    if (!confirm('Delete this shopping list and all its items?')) return;
    await client.delete(`/shopping/lists/${id}/`);
    bump();
  }

  async function addItem(e) {
    e.preventDefault();
    setError('');
    const price = evaluateExpression(itemForm.unit_price);
    const qty = Number(itemForm.quantity);
    if (price === null || price < 0) {
      setError('Enter a valid unit price.');
      return;
    }
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    try {
      await client.post('/shopping/items/', {
        shopping_list: active.id,
        name: itemForm.name,
        planned_unit_price: price,
        planned_quantity: qty,
      });
      setItemForm(EMPTY_ITEM);
      bump();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  async function patchItem(item, payload) {
    await client.patch(`/shopping/items/${item.id}/`, payload);
    bump();
  }

  function toggleBought(item) {
    if (item.bought) {
      patchItem(item, { bought: false });
    } else {
      // Start the actuals from the plan; adjust them as prices differ in the shop.
      patchItem(item, {
        bought: true,
        actual_unit_price: item.actual_unit_price ?? item.planned_unit_price,
        actual_quantity: item.actual_quantity ?? item.planned_quantity,
      });
    }
  }

  async function deleteItem(id) {
    await client.delete(`/shopping/items/${id}/`);
    bump();
  }

  const boughtCount = active ? active.items.filter((i) => i.bought).length : 0;
  const change = active ? Number(active.change) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Shopping</h1>
          <p>Plan a list with prices, then track what things really cost in the shop.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={createList}>
        <input
          placeholder="New list name (e.g. Groceries week 28)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
        />
        <button type="submit"><Plus size={15} style={{ verticalAlign: -2 }} /> New list</button>
        {lists.length > 0 && (
          <select value={activeId ?? ''} onChange={(e) => setActiveId(Number(e.target.value))}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        {active && (
          <button type="button" className="secondary" onClick={() => deleteList(active.id)} title="Delete list">
            <Trash2 size={15} />
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      {!active && <p>No shopping lists yet — create one above to start planning.</p>}

      {active && (
        <>
          <div className="loan-summary-cards">
            <div className="summary-card balance">
              <span>Planned grand total</span>
              <strong>{Number(active.planned_grand_total).toFixed(2)}</strong>
            </div>
            <div className="summary-card expense">
              <span>Spent so far ({boughtCount}/{active.items.length} bought)</span>
              <strong>{Number(active.actual_grand_total).toFixed(2)}</strong>
            </div>
            <div className={`summary-card ${change > 0 ? 'expense' : 'income'}`}>
              <span>Change vs plan (bought items)</span>
              <strong>
                {change > 0 ? '+' : ''}{change.toFixed(2)}
                {boughtCount > 0 && (change > 0 ? ' over' : change < 0 ? ' saved' : ' on plan')}
              </strong>
            </div>
          </div>

          <form className="inline-form" onSubmit={addItem}>
            <input
              placeholder="Item (e.g. Rice 5kg)"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
            <AmountInput
              value={itemForm.unit_price}
              onChange={(unit_price) => setItemForm({ ...itemForm, unit_price })}
              required
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              style={{ width: 90 }}
              placeholder="Qty"
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              required
            />
            <button type="submit">Add item</button>
          </form>

          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit price</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Bought</th>
                <th>Actual price</th>
                <th>Actual qty</th>
                <th>New total</th>
                <th>Diff</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.items.map((item) => {
                const diff = item.bought ? Number(item.actual_total) - Number(item.planned_total) : null;
                return (
                  <tr key={item.id} style={{ opacity: item.bought ? 0.85 : 1 }}>
                    <td data-label="Item">{item.name}</td>
                    <td data-label="Unit price">{Number(item.planned_unit_price).toFixed(2)}</td>
                    <td data-label="Qty">{Number(item.planned_quantity)}</td>
                    <td data-label="Total">{Number(item.planned_total).toFixed(2)}</td>
                    <td data-label="Bought">
                      <input
                        type="checkbox"
                        checked={item.bought}
                        onChange={() => toggleBought(item)}
                      />
                    </td>
                    <td data-label="Actual price">
                      <ActualInput item={item} field="actual_unit_price" disabled={!item.bought} onSave={patchItem} />
                    </td>
                    <td data-label="Actual qty">
                      <ActualInput item={item} field="actual_quantity" disabled={!item.bought} onSave={patchItem} />
                    </td>
                    <td data-label="New total">
                      {item.bought ? Number(item.actual_total).toFixed(2) : '—'}
                    </td>
                    <td data-label="Diff" className={diff > 0 ? 'amount-expense' : diff < 0 ? 'amount-income' : ''}>
                      {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
                    </td>
                    <td>
                      <button className="secondary" onClick={() => deleteItem(item.id)} title="Remove item">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {active.items.length === 0 && (
                <tr><td colSpan={10}>No items yet — add what you plan to buy.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
