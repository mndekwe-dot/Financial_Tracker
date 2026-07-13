import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Download, ChevronDown, Receipt } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { downloadCsv } from '../utils/csv';
import { parseShoppingItems } from '../utils/shoppingImport';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useToast } from '../context/ToastContext';

const EMPTY_ITEM = { name: '', category: '', unit_price: '', quantity: '1' };

function ShoppingSkeleton() {
  return (
    <div className="shopping-skeleton" aria-hidden="true">
      <div className="loan-summary-cards">
        <div className="summary-card"><span className="skeleton-bar skeleton-bar--sm" /><span className="skeleton-bar skeleton-bar--lg" /></div>
        <div className="summary-card"><span className="skeleton-bar skeleton-bar--sm" /><span className="skeleton-bar skeleton-bar--lg" /></div>
        <div className="summary-card"><span className="skeleton-bar skeleton-bar--sm" /><span className="skeleton-bar skeleton-bar--lg" /></div>
      </div>
      <span className="skeleton-bar skeleton-title" />
      <div className="skeleton-table">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <span className="skeleton-bar" style={{ flex: 3 }} />
            <span className="skeleton-bar" style={{ flex: 1 }} />
            <span className="skeleton-bar" style={{ flex: 1 }} />
            <span className="skeleton-bar" style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const CSV_HEADER = ['Item', 'Category', 'Unit price', 'Quantity', 'Bought', 'Actual unit price', 'Actual quantity'];

const UNCATEGORIZED = 'Uncategorized';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Not bought' },
  { key: 'bought', label: 'Bought' },
];

// Fallback palette for shopping categories that don't match one of the user's
// expense categories. A category name always maps to the same colour.
const SHOP_PALETTE = [
  '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#ef4444', '#10b981', '#6366f1', '#14b8a6', '#f472b6',
];

function fallbackColor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SHOP_PALETTE[h % SHOP_PALETTE.length];
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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'bought'
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = all categories
  const [expandedId, setExpandedId] = useState(null); // which item card is open
  const [catColors, setCatColors] = useState({}); // lowercased category name -> theme colour
  const [allCategories, setAllCategories] = useState([]);
  const fileInputRef = useRef(null);
  const { version, bump } = useDataRefresh();
  const toast = useToast();

  function load() {
    client.get('/shopping/lists/')
      .then(({ data }) => {
        setLists(data);
        setActiveId((current) => (data.some((l) => l.id === current) ? current : (data[0]?.id ?? null)));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [version]);

  // Pull the user's category colours so matching shopping categories are themed.
  useEffect(() => {
    client.get('/categories/').then(({ data }) => {
      setAllCategories(data);
      const map = {};
      for (const c of data) map[c.name.trim().toLowerCase()] = c.color;
      setCatColors(map);
    }).catch(() => {});
  }, []);

  // Colour for a shopping category: a matching user category's colour, else a
  // stable fallback derived from the name.
  function colorForCategory(name) {
    const key = (name || '').trim().toLowerCase();
    if (!key) return null;
    return catColors[key] || fallbackColor(key);
  }

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
        category: itemForm.category.trim(),
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
        item.category || '',
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

  async function recordAsExpense() {
    if (!active) return;
    const total = Number(active.actual_grand_total);
    if (!total || total <= 0) {
      toast('Nothing bought yet to record.', 'error');
      return;
    }
    const cat = allCategories.find(
      (c) => c.type === 'expense' && c.name.toLowerCase().includes('shopping'),
    );
    if (!confirm(`Record ${total.toFixed(2)} as an expense${cat ? ` in ${cat.name}` : ''}?`)) return;
    try {
      await client.post('/transactions/', {
        type: 'expense',
        amount: total,
        category: cat ? cat.id : null,
        description: `Shopping: ${active.name}`,
        date: new Date().toISOString().slice(0, 10),
      });
      bump();
      toast('Recorded as an expense.');
    } catch {
      toast('Could not record expense.', 'error');
    }
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
      const items = parseShoppingItems(text);
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

  const allItems = active ? active.items : [];
  const boughtCount = allItems.filter((i) => i.bought).length;
  const change = active ? Number(active.change) : 0;

  // Distinct categories present in the active list, for the category filter.
  const categories = [...new Set(allItems.map((i) => (i.category || '').trim() || UNCATEGORIZED))].sort();

  // Items narrowed by the category filter, then split into pending/bought.
  const itemCategory = (i) => (i.category || '').trim() || UNCATEGORIZED;
  const filtered = categoryFilter
    ? allItems.filter((i) => itemCategory(i) === categoryFilter)
    : allItems;
  const remainingItems = filtered.filter((i) => !i.bought);
  const boughtItems = filtered.filter((i) => i.bought);

  const showPending = statusFilter === 'all' || statusFilter === 'pending';
  const showBought = statusFilter === 'all' || statusFilter === 'bought';

  // A single item, shown as a compact row that expands on click for editing.
  function renderItem(item, index) {
    const expanded = expandedId === item.id;
    const diff = item.bought ? Number(item.actual_total) - Number(item.planned_total) : null;
    const toggle = () => setExpandedId(expanded ? null : item.id);
    return (
      <div
        key={item.id}
        className={`shop-item${item.bought ? ' is-bought' : ''}${expanded ? ' is-open' : ''}`}
        style={{ '--row-index': index }}
      >
        <div
          className="shop-item-head"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={toggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        >
          <input
            type="checkbox"
            className="shop-check"
            checked={item.bought}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleBought(item)}
            title={item.bought ? 'Mark as not bought' : 'Mark as bought'}
          />
          <div className="shop-item-main">
            <span className="shop-item-name">{item.name}</span>
            {item.category && (
              <button
                type="button"
                className="cat-badge"
                style={{ '--cat-color': colorForCategory(item.category) }}
                title={`Filter by ${item.category}`}
                onClick={(e) => { e.stopPropagation(); setCategoryFilter(item.category); }}
              >
                {item.category}
              </button>
            )}
          </div>
          <div className="shop-item-meta">
            <span className="shop-item-total">{Number(item.bought ? item.actual_total : item.planned_total).toFixed(2)}</span>
            <ChevronDown size={18} className="chevron" aria-hidden="true" />
          </div>
        </div>

        <div className="shop-item-body">
          <div className="shop-item-body-inner">
            <div className="detail-grid">
              <div className="detail"><span>Unit price</span><strong>{Number(item.planned_unit_price).toFixed(2)}</strong></div>
              <div className="detail"><span>Quantity</span><strong>{Number(item.planned_quantity)}</strong></div>
              <div className="detail"><span>Planned total</span><strong>{Number(item.planned_total).toFixed(2)}</strong></div>
            </div>

            {item.bought && (
              <div className="detail-grid">
                <label className="detail"><span>Actual price</span>
                  <ActualInput item={item} field="actual_unit_price" disabled={!item.bought} onSave={patchItem} />
                </label>
                <label className="detail"><span>Actual qty</span>
                  <ActualInput item={item} field="actual_quantity" disabled={!item.bought} onSave={patchItem} />
                </label>
                <div className="detail"><span>New total</span><strong>{Number(item.actual_total).toFixed(2)}</strong></div>
                <div className="detail"><span>Diff</span>
                  <strong className={diff > 0 ? 'amount-expense' : diff < 0 ? 'amount-income' : ''}>
                    {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
                  </strong>
                </div>
              </div>
            )}

            <div className="shop-item-actions">
              <button type="button" className="secondary" onClick={() => deleteItem(item.id)}>
                <Trash2 size={15} style={{ verticalAlign: -2 }} /> Remove item
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSection(title, rows, emptyText) {
    return (
      // Key on the active filters so switching filters re-mounts the list and
      // replays the staggered card entrance animation.
      <div className="shopping-section" key={`${title}-${statusFilter}-${categoryFilter}`}>
        <h2 className="shopping-section-title">{title} <span className="section-count">{rows.length}</span></h2>
        {rows.length === 0
          ? <p className="shop-empty">{emptyText}</p>
          : <div className="shop-list">{rows.map(renderItem)}</div>}
      </div>
    );
  }

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
          <button type="button" className="secondary" onClick={() => deleteList(active.id)} title="Delete this list">
            <Trash2 size={15} style={{ verticalAlign: -2 }} /> Delete list
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

      {loading && <ShoppingSkeleton />}

      {!loading && !active && <p>No shopping lists yet — create one above, or import a CSV to start.</p>}

      {!loading && active && (
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
            <button type="button" className="secondary" onClick={recordAsExpense} disabled={boughtCount === 0} title="Add the bought total to your transactions">
              <Receipt size={15} style={{ verticalAlign: -2 }} /> Record as expense
            </button>
          </div>

          {active.items.length > 0 && (
            <div className="shopping-filters">
              <div
                className="segmented"
                role="group"
                aria-label="Filter by status"
                style={{ '--seg-count': STATUS_FILTERS.length, '--seg-active': STATUS_FILTERS.findIndex((f) => f.key === statusFilter) }}
              >
                <span className="segmented-thumb" aria-hidden="true" />
                {STATUS_FILTERS.map((f) => {
                  const count = f.key === 'all' ? filtered.length : f.key === 'pending' ? remainingItems.length : boughtItems.length;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      className={statusFilter === f.key ? 'segment active' : 'segment'}
                      aria-pressed={statusFilter === f.key}
                      onClick={() => setStatusFilter(f.key)}
                    >
                      <span className="segment-label">{f.label}</span>
                      <span className="segment-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <label className="filter-category">
                <span>Category</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {active.items.length === 0 ? (
            <p className="shop-empty">No items yet — add what you plan to buy.</p>
          ) : (
            <>
              {showPending && renderSection('Remaining', remainingItems, 'Nothing left — everything is bought.')}
              {showBought && renderSection('Bought', boughtItems, 'Nothing bought yet — check items off as you shop.')}
            </>
          )}
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
              <input
                placeholder="Category (optional, e.g. Groceries)"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                list="shopping-categories"
              />
              <datalist id="shopping-categories">
                {categories.filter((c) => c !== UNCATEGORIZED).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
