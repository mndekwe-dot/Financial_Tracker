import * as LucideIcons from 'lucide-react';
import { DEFAULT_ICON } from '../constants/icons';

export default function CategoryIcon({ name, size = 16, className = '', style }) {
  const Icon = LucideIcons[name] || LucideIcons[DEFAULT_ICON];
  return <Icon size={size} className={className} style={style} />;
}
