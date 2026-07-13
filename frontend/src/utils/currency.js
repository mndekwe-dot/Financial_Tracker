// Currency symbol preference, stored per device. Empty string = no symbol.
const KEY = 'currency';

export function getCurrency() {
  return localStorage.getItem(KEY) || '';
}

export function setCurrency(symbol) {
  localStorage.setItem(KEY, symbol || '');
  window.dispatchEvent(new Event('currency-changed'));
}

// Format a number with the chosen symbol, e.g. "$1234.50" or "1234.50".
export function formatMoney(value) {
  const num = Number(value || 0).toFixed(2);
  const sym = getCurrency();
  return sym ? `${sym}${num}` : num;
}
