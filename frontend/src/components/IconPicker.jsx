import { CATEGORY_ICONS } from '../constants/icons';
import CategoryIcon from './CategoryIcon';

export default function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker">
      {CATEGORY_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          className={`icon-option ${value === icon ? 'selected' : ''}`}
          onClick={() => onChange(icon)}
          aria-label={`Use icon ${icon}`}
        >
          <CategoryIcon name={icon} size={18} />
        </button>
      ))}
    </div>
  );
}
