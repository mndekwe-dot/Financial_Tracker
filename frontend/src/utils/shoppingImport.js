import { parseCsv } from './csv';

const ITEM_NAMES = ['item', 'name', 'product', 'description'];
const QTY_NAMES = ['quantity', 'qty', 'planned quantity'];
const PRICE_NAMES = ['unit price', 'planned unit price', 'price', 'unit cost'];
const TOTAL_NAMES = ['total price', 'total', 'amount', 'total cost'];
const BOUGHT_NAMES = ['bought', 'purchased'];
const APRICE_NAMES = ['actual unit price', 'actual price'];
const AQTY_NAMES = ['actual quantity', 'actual qty'];
// Item-column values that are really summary rows, not products.
const SKIP_VALUES = ['total', 'grand total', 'sub total', 'subtotal', 'total price'];

const lower = (cell) => String(cell ?? '').trim().toLowerCase();

// Parse a number that may carry thousands separators, currency spaces or quotes.
function cleanNumber(raw) {
  const n = Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

// Turn parsed CSV rows into shopping-item payloads. Copes with messy spreadsheet
// exports: a title row above the header, a leading blank column, thousands
// separators, summary rows, and even two item tables sitting side by side.
export function rowsToItems(rows) {
  if (rows.length === 0) return [];

  // Find the header row wherever it sits (it names an "Item"/"Name" column).
  const headerIdx = rows.findIndex((r) => r.some((c) => ITEM_NAMES.includes(lower(c))));

  // No header we recognise — assume plain columns: name, unit price, quantity.
  if (headerIdx === -1) {
    const items = [];
    for (const r of rows) {
      const cells = String(r[0] ?? '').trim() === '' ? r.slice(1) : r; // drop a leading blank column
      const name = (cells[0] || '').trim();
      if (!name || SKIP_VALUES.includes(name.toLowerCase())) continue;
      const price = cleanNumber(cells[1]);
      if (!Number.isFinite(price)) continue;
      const qty = cleanNumber(cells[2]);
      items.push({
        name,
        planned_unit_price: price >= 0 ? price : 0,
        planned_quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      });
    }
    return items;
  }

  // Build one or more column "blocks" — a sheet can hold several tables across
  // the same rows. Each block starts at an Item column and claims the qty/price/
  // total columns that follow it (until the next Item column).
  const blocks = [];
  let block = null;
  rows[headerIdx].forEach((cell, i) => {
    const name = lower(cell);
    if (ITEM_NAMES.includes(name)) {
      block = { item: i, qty: -1, price: -1, total: -1, bought: -1, aprice: -1, aqty: -1 };
      blocks.push(block);
    } else if (block) {
      if (block.qty === -1 && QTY_NAMES.includes(name)) block.qty = i;
      else if (block.price === -1 && PRICE_NAMES.includes(name)) block.price = i;
      else if (block.total === -1 && TOTAL_NAMES.includes(name)) block.total = i;
      else if (block.bought === -1 && BOUGHT_NAMES.includes(name)) block.bought = i;
      else if (block.aprice === -1 && APRICE_NAMES.includes(name)) block.aprice = i;
      else if (block.aqty === -1 && AQTY_NAMES.includes(name)) block.aqty = i;
    }
  });

  const items = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    for (const b of blocks) {
      const name = (row[b.item] || '').trim();
      if (!name || SKIP_VALUES.includes(name.toLowerCase())) continue;

      let price = b.price >= 0 ? cleanNumber(row[b.price]) : NaN;
      const qty = b.qty >= 0 ? cleanNumber(row[b.qty]) : NaN;
      const total = b.total >= 0 ? cleanNumber(row[b.total]) : NaN;
      // Derive a unit price from the line total when the unit price is blank.
      if (!Number.isFinite(price) && Number.isFinite(total) && Number.isFinite(qty) && qty > 0) {
        price = total / qty;
      }
      // Need at least some price signal to count as a real line item.
      if (!Number.isFinite(price) && !Number.isFinite(total)) continue;

      const item = {
        name,
        planned_unit_price: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
        planned_quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      };
      if (b.bought >= 0 && ['yes', 'true', '1', 'y', 'bought'].includes(lower(row[b.bought]))) {
        item.bought = true;
        const ap = cleanNumber(row[b.aprice]);
        const aq = cleanNumber(row[b.aqty]);
        if (Number.isFinite(ap) && ap >= 0) item.actual_unit_price = ap;
        if (Number.isFinite(aq) && aq > 0) item.actual_quantity = aq;
      }
      items.push(item);
    }
  }
  return items;
}

// Convenience: parse CSV text straight into shopping-item payloads.
export function parseShoppingItems(text) {
  return rowsToItems(parseCsv(text));
}
