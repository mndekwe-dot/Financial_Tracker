// Safe arithmetic expression evaluator (+, -, *, /, parentheses, decimals).
// Deliberately avoids eval()/Function() since this parses untrusted user input.
export function evaluateExpression(input) {
  if (input == null) return null;
  const expr = String(input).trim();
  if (expr === '') return null;
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;

  let pos = 0;
  const peek = () => expr[pos];
  const skipSpace = () => { while (peek() === ' ') pos++; };

  function parseExpression() {
    skipSpace();
    let value = parseTerm();
    skipSpace();
    while (peek() === '+' || peek() === '-') {
      const op = expr[pos++];
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
      skipSpace();
    }
    return value;
  }

  function parseTerm() {
    skipSpace();
    let value = parseFactor();
    skipSpace();
    while (peek() === '*' || peek() === '/') {
      const op = expr[pos++];
      const rhs = parseFactor();
      if (op === '*') {
        value *= rhs;
      } else {
        if (rhs === 0) throw new Error('Division by zero');
        value /= rhs;
      }
      skipSpace();
    }
    return value;
  }

  function parseFactor() {
    skipSpace();
    if (peek() === '-') { pos++; return -parseFactor(); }
    if (peek() === '+') { pos++; return parseFactor(); }
    if (peek() === '(') {
      pos++;
      const value = parseExpression();
      skipSpace();
      if (peek() !== ')') throw new Error('Expected )');
      pos++;
      return value;
    }
    const start = pos;
    while (pos < expr.length && /[0-9.]/.test(peek())) pos++;
    if (start === pos) throw new Error('Expected number');
    const num = parseFloat(expr.slice(start, pos));
    if (Number.isNaN(num)) throw new Error('Invalid number');
    return num;
  }

  try {
    const result = parseExpression();
    skipSpace();
    if (pos !== expr.length) return null;
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
