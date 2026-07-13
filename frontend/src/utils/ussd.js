// Build a tel: link for a USSD code. The '#' must be percent-encoded as %23
// or the dialer truncates the code; '*' is kept literal (dialers expect it).
export function telHref(code) {
  return 'tel:' + String(code).trim().replace(/#/g, '%23');
}

// Group a flat list of USSD codes by their service name.
export function groupByService(codes) {
  const groups = {};
  for (const c of codes) {
    const key = c.service || 'Other';
    (groups[key] = groups[key] || []).push(c);
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}
