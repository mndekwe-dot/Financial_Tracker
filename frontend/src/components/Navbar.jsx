import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Wallet, LayoutDashboard, ArrowLeftRight, CalendarDays, PiggyBank,
  MoreHorizontal, Search, ChevronDown, Landmark, Target, Repeat,
  HandCoins, ShoppingCart, Tags, FileDown, Settings as SettingsIcon,
  Zap, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import InstallAppButton from './InstallAppButton';

const HUBS = [
  {
    key: 'activity',
    label: 'Activity',
    Icon: ArrowLeftRight,
    items: [
      { to: '/transactions', label: 'Transactions', desc: 'Detailed income & expenses', Icon: ArrowLeftRight },
      { to: '/weekly', label: 'Weekly Grid', desc: 'Mon–Sun day-by-day spending', Icon: CalendarDays },
      { to: '/search', label: 'Global Search', desc: 'Find anything across your account', Icon: Search },
    ],
  },
  {
    key: 'planning',
    label: 'Planning',
    Icon: PiggyBank,
    items: [
      { to: '/budgets', label: 'Budgets', desc: 'Monthly category limits & roll-overs', Icon: PiggyBank },
      { to: '/goals', label: 'Savings Goals', desc: 'Track progress toward financial targets', Icon: Target },
      { to: '/loans', label: 'Loans & Debts', desc: 'Money lent to & borrowed from others', Icon: HandCoins },
      { to: '/recurring', label: 'Recurring Bills', desc: 'Scheduled recurring payments', Icon: Repeat },
    ],
  },
  {
    key: 'money',
    label: 'Money',
    Icon: Landmark,
    items: [
      { to: '/accounts', label: 'Accounts', desc: 'Bank, Cash, Mobile Money balances', Icon: Landmark },
      { to: '/pay', label: 'Pay with MoMo', desc: 'Dial & record mobile money payments', Icon: Zap },
      { to: '/topup', label: 'Top-up & USSD', desc: 'Quick service shortcuts & codes', Icon: Smartphone },
    ],
  },
  {
    key: 'tools',
    label: 'Tools',
    Icon: MoreHorizontal,
    items: [
      { to: '/shopping', label: 'Shopping Lists', desc: 'Planned vs actual grocery lists', Icon: ShoppingCart },
      { to: '/categories', label: 'Categories', desc: 'Customize icons, colors & types', Icon: Tags },
      { to: '/reports', label: 'Reports', desc: 'Download CSV financial statements', Icon: FileDown },
      { to: '/settings', label: 'Settings', desc: 'Profile, backup restore & theme', Icon: SettingsIcon },
    ],
  },
];

const MOBILE_LINKS = [
  { to: '/', end: true, label: 'Home', Icon: LayoutDashboard },
  { to: '/transactions', end: false, label: 'Activity', Icon: ArrowLeftRight },
  { to: '/budgets', end: false, label: 'Planning', Icon: PiggyBank },
  { to: '/accounts', end: false, label: 'Money', Icon: Landmark },
  { to: '/more', end: false, label: 'More', Icon: MoreHorizontal },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openHub, setOpenHub] = useState(null);
  const navRef = useRef(null);

  // Close dropdown on route change
  useEffect(() => {
    setOpenHub(null);
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenHub(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleHub(key) {
    setOpenHub((cur) => (cur === key ? null : key));
  }

  return (
    <>
      <nav className="navbar" ref={navRef}>
        <Link to="/" className="navbar-brand">
          <Wallet size={21} />
          <span>Financial Tracker</span>
        </Link>

        {/* Desktop Hub Navigation */}
        <div className="navbar-links desktop-only">
          <NavLink to="/" end className={({ isActive }) => `nav-hub-trigger ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </NavLink>

          {HUBS.map((hub) => {
            const isChildActive = hub.items.some((i) => location.pathname === i.to);
            const isOpen = openHub === hub.key;
            return (
              <div key={hub.key} className="nav-hub-wrapper">
                <button
                  type="button"
                  className={`nav-hub-trigger ${isChildActive || isOpen ? 'active' : ''}`}
                  onClick={() => toggleHub(hub.key)}
                >
                  <hub.Icon size={15} />
                  <span>{hub.label}</span>
                  <ChevronDown size={13} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
                </button>

                {isOpen && (
                  <div className="nav-hub-dropdown">
                    <div className="nav-dropdown-header">{hub.label} Hub</div>
                    <div className="nav-dropdown-items">
                      {hub.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`nav-dropdown-item ${location.pathname === item.to ? 'active' : ''}`}
                          onClick={() => setOpenHub(null)}
                        >
                          <span className="dropdown-item-icon"><item.Icon size={16} /></span>
                          <span className="dropdown-item-text">
                            <strong>{item.label}</strong>
                            <small>{item.desc}</small>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User, Search, Theme & Actions */}
        <div className="navbar-user">
          <span className="navbar-username desktop-only">{user?.username}</span>
          <span className="desktop-only">
            <InstallAppButton className="nav-install-btn" />
          </span>
          <Link to="/search" className="secondary icon-btn" title="Search" aria-label="Search">
            <Search size={16} />
          </Link>
          <ThemeToggle />
          <button className="secondary logout-nav-btn desktop-only" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {MOBILE_LINKS.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
