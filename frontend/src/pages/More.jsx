import { Link, useNavigate } from 'react-router-dom';
import {
  Tags, HandCoins, FileDown, ShoppingCart, Smartphone, Send, LogOut,
  Wallet, Target, Repeat, Landmark, Settings as SettingsIcon, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InstallAppButton from '../components/InstallAppButton';

const GROUPS = [
  {
    title: 'Money & Balances',
    description: 'Bank, Cash, Mobile Money and top-up tools',
    links: [
      { to: '/accounts', label: 'Accounts', desc: 'Track balances across cash, bank & momo', Icon: Landmark, color: '#0ea5e9' },
      { to: '/pay', label: 'Pay with MoMo', desc: 'Dial USSD and record payments', Icon: Send, color: '#f59e0b' },
      { to: '/topup', label: 'Top-up & USSD', desc: 'Saved shortcut codes for airtime & utilities', Icon: Wallet, color: '#10b981' },
      { to: '/momo', label: 'MoMo Auto-capture', desc: 'SMS forwarder webhook settings', Icon: Smartphone, color: '#8b5cf6' },
    ],
  },
  {
    title: 'Financial Planning',
    description: 'Set future targets, manage recurring bills and loans',
    links: [
      { to: '/goals', label: 'Savings Goals', desc: 'Target amounts, deadlines and progress', Icon: Target, color: '#3b82f6' },
      { to: '/recurring', label: 'Recurring Payments', desc: 'Rent, subscriptions & recurring salary', Icon: Repeat, color: '#6366f1' },
      { to: '/loans', label: 'Loans & Debts', desc: 'Money lent to people & money you owe', Icon: HandCoins, color: '#ec4899' },
    ],
  },
  {
    title: 'Lists & Intelligence',
    description: 'Organization, categorization and data export',
    links: [
      { to: '/shopping', label: 'Shopping Lists', desc: 'Planned items vs actual cart spending', Icon: ShoppingCart, color: '#14b8a6' },
      { to: '/categories', label: 'Categories', desc: 'Manage custom colors, icons and names', Icon: Tags, color: '#f97316' },
      { to: '/reports', label: 'CSV Reports', desc: 'Download spreadsheets for Excel or Sheets', Icon: FileDown, color: '#06b6d4' },
    ],
  },
  {
    title: 'Account & Preferences',
    description: 'Security, backups and appearance',
    links: [
      { to: '/settings', label: 'Settings', desc: 'Profile, theme, currency & data restore', Icon: SettingsIcon, color: '#64748b' },
    ],
  },
];

export default function More() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Feature Hub</h1>
          <p>Access all financial tools, accounts, planning, and settings.</p>
        </div>
      </div>

      {/* Quick PWA Offline Download Banner */}
      <div className="hub-offline-banner">
        <div className="hub-banner-content">
          <ShieldCheck size={24} style={{ color: '#10b981' }} />
          <div>
            <strong>Offline Mode & PWA</strong>
            <p>Install this app on your phone or computer for instant access anytime.</p>
          </div>
        </div>
        <InstallAppButton className="hub-download-cta" showInstalled />
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="more-section">
          <div className="more-section-header">
            <h2 className="more-section-title">{group.title}</h2>
            <span className="more-section-subtitle">{group.description}</span>
          </div>
          <div className="more-grid">
            {group.links.map(({ to, label, desc, Icon, color }) => (
              <Link key={to} to={to} className="more-card elevated-hub-card">
                <span className="more-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={20} />
                </span>
                <div className="more-card-text">
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </div>
              </Link>
            ))}
            {group.title.startsWith('Account') && (
              <button type="button" className="more-card logout elevated-hub-card" onClick={handleLogout}>
                <span className="more-icon" style={{ background: '#ef444418', color: '#ef4444' }}>
                  <LogOut size={20} />
                </span>
                <div className="more-card-text">
                  <strong>Log out</strong>
                  <small>Sign out of {user?.username}</small>
                </div>
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
