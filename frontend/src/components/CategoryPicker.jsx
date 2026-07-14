import CategoryIcon from './CategoryIcon';

// Shows every category at once as clickable chips (no dropdown).
// value is the selected category id as a string ('' = none).
export default function CategoryPicker({ categories, value, onChange, allowNone = true }) {
  const isActive = (id) => String(value) === String(id);
  return (
    <div className="cat-picker">
      {allowNone && (
        <button
          type="button"
          className={`cat-chip${!value ? ' active' : ''}`}
          onClick={() => onChange('')}
        >
          None
        </button>
      )}
      {categories.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`cat-chip${isActive(c.id) ? ' active' : ''}`}
          style={{ '--chip-color': c.color }}
          onClick={() => onChange(String(c.id))}
          title={c.name}
        >
          <span className="cat-chip-icon" style={{ color: c.color }}>
            <CategoryIcon name={c.icon} size={14} />
          </span>
          {c.name}
        </button>
      ))}
      {categories.length === 0 && <span className="settings-note">No categories for this type.</span>}
    </div>
  );
}
