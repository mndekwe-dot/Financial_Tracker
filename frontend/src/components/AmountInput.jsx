import { evaluateExpression } from '../utils/calc';

export default function AmountInput({ value, onChange, placeholder = 'Amount', required, autoFocus }) {
  const hasMath = /[+\-*/]/.test(value || '');
  const result = hasMath ? evaluateExpression(value) : null;

  return (
    <div className="amount-input-wrap">
      <input
        type="text"
        inputMode="decimal"
        placeholder={`${placeholder} (try 200+150)`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
      />
      {hasMath && (
        <span className={`amount-preview ${result === null ? 'invalid' : ''}`}>
          {result === null ? 'Invalid expression' : `= ${result.toFixed(2)}`}
        </span>
      )}
    </div>
  );
}
