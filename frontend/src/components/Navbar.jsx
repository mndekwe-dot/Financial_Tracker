import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Wallet, LayoutDashboard, ArrowLeftRight, CalendarDays, PiggyBank, MoreHorizontal, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const DESKTOP_LINKS = [
  { to: '/', end: true, label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/transactions', end: false, label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/weekly', end: false, label: 'Weekly', Icon: CalendarDays },
  { to: '/budgets', end: false, label: 'Budgets', Icon: PiggyBank },
  { to: '/more', end: false, label: 'More', Icon: MoreHorizontal },
];

const MOBILE_LINKS = [
  { to: '/', end: true, label: 'Home', Icon: LayoutDashboard },
  { to: '/transactions', end: false, label: 'Activity', Icon: ArrowLeftRight },
  { to: '/weekly', end: false, label: 'Weekly', Icon: CalendarDays },
  { to: '/budgets', end: false, label: 'Budgets', Icon: PiggyBank },
  { to: '/more', end: false, label: 'More', Icon: MoreHorizontal },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Wallet size={20} />
          Financial Tracker
        </div>
        <div className="navbar-links desktop-only">
          {DESKTOP_LINKS.map(({ to, end, label, Icon }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="navbar-user">
          <span className="navbar-username desktop-only">{user?.username}</span>
          <Link to="/search" className="secondary icon-btn" title="Search" aria-label="Search">
            <Search size={17} />
          </Link>
          <ThemeToggle />
          <button className="secondary" onClick={handleLogout}>Log out</button>
        </div>
      </nav>
      <nav className="bottom-nav">
        {MOBILE_LINKS.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
