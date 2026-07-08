// Build a CSV string from rows (arrays of cells) and trigger a browser download.
// A UTF-8 BOM is prepended so Excel opens the file with correct encoding.
export function downloadCsv(filename, rows) {
  const escape = (cell) => {
    const s = cell === null || cell === undefined ? '' : String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Parse a CSV string into an array of rows (each row an array of string cells).
// Handles quoted fields, escaped quotes (""), commas/newlines inside quotes,
// a leading UTF-8 BOM and both \r\n and \n line endings.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // Flush the final field/row unless the file ended on a clean newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows (e.g. trailing blank lines).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
