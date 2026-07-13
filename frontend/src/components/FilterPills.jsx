// Reusable animated segmented filter control.
// options: [{ key, label, count? }], value: active key, onChange(key)
export default function FilterPills({ options, value, onChange, ariaLabel }) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <div
      className="segmented"
      role="group"
      aria-label={ariaLabel}
      style={{ '--seg-count': options.length, '--seg-active': activeIndex }}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={value === o.key ? 'segment active' : 'segment'}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          <span className="segment-label">{o.label}</span>
          {o.count != null && <span className="segment-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
