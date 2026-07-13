import { useState } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { getTheme, applyTheme } from '../utils/theme';

// Cycles through light → dark → auto (follow system).
const ORDER = ['light', 'dark', 'auto'];
const META = {
  light: { Icon: Sun, label: 'Light theme' },
  dark: { Icon: Moon, label: 'Dark theme' },
  auto: { Icon: MonitorSmartphone, label: 'System theme' },
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme());
  const { Icon, label } = META[theme];

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="secondary icon-btn"
      onClick={cycle}
      title={`${label} (click to change)`}
      aria-label={label}
    >
      <Icon size={17} />
    </button>
  );
}
