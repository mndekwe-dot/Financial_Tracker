import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Download } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { downloadCsv, parseCsv } from '../utils/csv';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';

const EMPTY_ITEM = { name: '', unit_price: '', quantity: '1' };

const CSV_HEADER = ['Item', 'Unit price', 'Quantity', 'Bought', 'Actual unit price', 'Actual quantity'];

// Turn parsed CSV rows into shopping-item payloads. Tolerant of column order:
// it reads a header row when present (any of the known names), otherwise falls
// back to positional columns: name, unit price, quantity.
function rowsToItems(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => header.findIndex((h) => names.includes(h));
  const nameCol = col('item', 'name', 'product');

  let idx;
  let dataRows;
  if (nameCol !== -1) {
    idx = {
      name: nameCol,
      price: col('unit price', 'planned unit price', 'price'),
      qty: col('quantity', 'planned quantity', 'qty'),
      bought: col('bought'),
      actualPrice: col('actual unit price', 'actual price'),
      actualQty: col('actual quantity', 'actual qty'),
    };
    dataRows = rows.slice(1);
  } else {
    idx = { name: 0, price: 1, qty: 2, bought: -1, actualPrice: -1, actualQty: -1 };
    dataRows = rows;
  }

  const items = [];
  for (const r of dataRows) {
    const name = (r[idx.name] || '').trim();
    if (!name) continue;
    const price = Number(r[idx.price]);
    const qty = idx.qty >= 0 ? Number(r[idx.qty]) : NaN;
    const item = {
      name,
      planned_unit_price: Number.isFinite(price) && price >= 0 ? price : 0,
      planned_quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    };
    if (idx.bought >= 0) {
      const flag = (r[idx.bought] || '').trim().toLowerCase();
      if (['yes', 'true', '1', 'y', 'bought'].includes(flag)) {
        item.bought = true;
        const ap = Number(r[idx.actualPrice]);
        const aq = Number(r[idx.actualQty]);
        if (Number.isFinite(ap) && ap >= 0) item.actual_unit_price = ap;
        if (Number.isFinite(aq) && aq > 0) item.actual_quantity = aq;
      }
    }
    items.push(item);
  }
  return items;
}

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
  const [showAddItem, setShowAddItem] = useState(false);
  const [importState, setImportState] = useState(null); // { items, fileName, target: 'current'|'new', newName }
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const { version, bump } = useDataRefresh();
  const toast = useToast();

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
      toast('List created.');
    } catch {
      setError('Could not create the list.');
      toast('Could not create the list.', 'error');
    }
  }

  async function deleteList(id) {
    if (!confirm('Delete this shopping list and all its items?')) return;
    await client.delete(`/shopping/lists/${id}/`);
    bump();
    toast('List deleted.', 'info');
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
    setBusy(true);
    try {
      await client.post('/shopping/items/', {
        shopping_list: active.id,
        name: itemForm.name,
        planned_unit_price: price,
        planned_quantity: qty,
      });
      setItemForm(EMPTY_ITEM);
      setShowAddItem(false);
      bump();
      toast('Item added.');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    } finally {
      setBusy(false);
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
    toast('Item removed.', 'info');
  }

  function exportCsv() {
    if (!active) return;
    const rows = [CSV_HEADER];
    for (const item of active.items) {
      rows.push([
        item.name,
        Number(item.planned_unit_price).toFixed(2),
        Number(item.planned_quantity),
        item.bought ? 'Yes' : 'No',
        item.bought && item.actual_unit_price != null ? Number(item.actual_unit_price).toFixed(2) : '',
        item.bought && item.actual_quantity != null ? Number(item.actual_quantity) : '',
      ]);
    }
    const safeName = active.name.replace(/[^\w-]+/g, '-').toLowerCase();
    downloadCsv(`shopping-${safeName || 'list'}.csv`, rows);
    toast('Shopping list exported.');
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    try {
      const text = await file.text();
      const items = rowsToItems(parseCsv(text));
      if (items.length === 0) {
        toast('No items found in that file.', 'error');
        return;
      }
      const base = file.name.replace(/\.csv$/i, '');
      setImportState({
        items,
        fileName: file.name,
        target: active ? 'current' : 'new',
        newName: base || 'Imported list',
      });
    } catch {
      toast('Could not read that file.', 'error');
    }
  }

  async function confirmImport() {
    if (!importState) return;
    const { items, target, newName } = importState;
    if (target === 'new' && !newName.trim()) return;
    setBusy(true);
    try {
      let listId = active?.id;
      if (target === 'new') {
        const { data } = await client.post('/shopping/lists/', { name: newName.trim() });
        listId = data.id;
      }
      await Promise.all(
        items.map((it) => client.post('/shopping/items/', { ...it, shopping_list: listId })),
      );
      if (listId) setActiveId(listId);
      setImportState(null);
      bump();
      toast(`Imported ${items.length} item${items.length === 1 ? '' : 's'}.`);
    } catch {
      toast('Import failed. Check the file and try again.', 'error');
    } finally {
      setBusy(false);
    }
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
        <button type="button" className="secondary" onClick={pickFile} title="Import a CSV file">
          <Upload size={15} style={{ verticalAlign: -2 }} /> Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={onFileChosen}
        />
      </form>

      {error && !showAddItem && <p className="error">{error}</p>}

      {!active && <p>No shopping lists yet — create one above, or import a CSV to start.</p>}

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

          <div className="table-toolbar">
            <button type="button" onClick={() => { setError(''); setItemForm(EMPTY_ITEM); setShowAddItem(true); }}>
              <Plus size={15} style={{ verticalAlign: -2 }} /> Add item
            </button>
            <button type="button" className="secondary" onClick={exportCsv} disabled={active.items.length === 0}>
              <Download size={15} style={{ verticalAlign: -2 }} /> Export CSV
            </button>
          </div>

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

      {showAddItem && (
        <div className="modal-backdrop" onClick={() => setShowAddItem(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add item</h2>
            <form className="modal-form" onSubmit={addItem}>
              {error && <p className="error">{error}</p>}
              <input
                placeholder="Item (e.g. Rice 5kg)"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                autoFocus
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
                placeholder="Quantity"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                required
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
                <button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importState && (
        <div className="modal-backdrop" onClick={() => !busy && setImportState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Import shopping list</h2>
            <div className="modal-form">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Found <strong>{importState.items.length}</strong> item
                {importState.items.length === 1 ? '' : 's'} in <strong>{importState.fileName}</strong>.
              </p>
              <ul className="import-preview">
                {importState.items.slice(0, 5).map((it, i) => (
                  <li key={i}>{it.name} — {Number(it.planned_unit_price).toFixed(2)} × {it.planned_quantity}</li>
                ))}
                {importState.items.length > 5 && <li>…and {importState.items.length - 5} more</li>}
              </ul>

              <label className="import-choice">
                <input
                  type="radio"
                  name="import-target"
                  checked={importState.target === 'current'}
                  disabled={!active}
                  onChange={() => setImportState({ ...importState, target: 'current' })}
                />
                Add to current list{active ? ` (${active.name})` : ' (no list yet)'}
              </label>
              <label className="import-choice">
                <input
                  type="radio"
                  name="import-target"
                  checked={importState.target === 'new'}
                  onChange={() => setImportState({ ...importState, target: 'new' })}
                />
                Create a new list
              </label>
              {importState.target === 'new' && (
                <input
                  placeholder="New list name"
                  value={importState.newName}
                  onChange={(e) => setImportState({ ...importState, newName: e.target.value })}
                />
              )}

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setImportState(null)} disabled={busy}>Cancel</button>
                <button type="button" onClick={confirmImport} disabled={busy}>
                  {busy ? 'Importing…' : `Import ${importState.items.length} item${importState.items.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
