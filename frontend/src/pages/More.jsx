import { Link, useNavigate } from 'react-router-dom';
import {
  Tags, HandCoins, FileDown, ShoppingCart, Smartphone, Send, LogOut,
  Wallet, Target, Repeat, Landmark, Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// More-page links grouped by what they're for.
const GROUPS = [
  {
    title: 'Money & payments',
    links: [
      { to: '/accounts', label: 'Accounts', Icon: Landmark },
      { to: '/topup', label: 'Top up', Icon: Wallet },
      { to: '/pay', label: 'Pay with MoMo', Icon: Send },
      { to: '/momo', label: 'MoMo auto-capture', Icon: Smartphone },
    ],
  },
  {
    title: 'Planning',
    links: [
      { to: '/goals', label: 'Savings goals', Icon: Target },
      { to: '/recurring', label: 'Recurring', Icon: Repeat },
      { to: '/loans', label: 'Loans', Icon: HandCoins },
    ],
  },
  {
    title: 'Lists & insights',
    links: [
      { to: '/shopping', label: 'Shopping', Icon: ShoppingCart },
      { to: '/categories', label: 'Categories', Icon: Tags },
      { to: '/reports', label: 'Reports', Icon: FileDown },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/settings', label: 'Settings', Icon: SettingsIcon },
    ],
  },
];

export default function More() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <div className="page-header">
        <h1>More</h1>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="more-section">
          <h2 className="more-section-title">{group.title}</h2>
          <div className="more-grid">
            {group.links.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className="more-card">
                <span className="more-icon"><Icon size={22} /></span>
                {label}
              </Link>
            ))}
            {group.title === 'Account' && (
              <button type="button" className="more-card logout" onClick={handleLogout}>
                <span className="more-icon"><LogOut size={22} /></span>
                Log out
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
