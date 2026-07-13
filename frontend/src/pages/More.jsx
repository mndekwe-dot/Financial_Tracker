import { Link, useNavigate } from 'react-router-dom';
import { Tags, HandCoins, FileDown, ShoppingCart, Smartphone, Send, LogOut, Wallet, Target, Repeat, Landmark, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      <div className="more-grid">
        <Link to="/accounts" className="more-card">
          <span className="more-icon"><Landmark size={22} /></span>
          Accounts
        </Link>
        <Link to="/topup" className="more-card">
          <span className="more-icon"><Wallet size={22} /></span>
          Top up
        </Link>
        <Link to="/goals" className="more-card">
          <span className="more-icon"><Target size={22} /></span>
          Savings goals
        </Link>
        <Link to="/recurring" className="more-card">
          <span className="more-icon"><Repeat size={22} /></span>
          Recurring
        </Link>
        <Link to="/pay" className="more-card">
          <span className="more-icon"><Send size={22} /></span>
          Pay with MoMo
        </Link>
        <Link to="/categories" className="more-card">
          <span className="more-icon"><Tags size={22} /></span>
          Categories
        </Link>
        <Link to="/loans" className="more-card">
          <span className="more-icon"><HandCoins size={22} /></span>
          Loans
        </Link>
        <Link to="/shopping" className="more-card">
          <span className="more-icon"><ShoppingCart size={22} /></span>
          Shopping
        </Link>
        <Link to="/reports" className="more-card">
          <span className="more-icon"><FileDown size={22} /></span>
          Reports
        </Link>
        <Link to="/momo" className="more-card">
          <span className="more-icon"><Smartphone size={22} /></span>
          MoMo auto-capture
        </Link>
        <Link to="/settings" className="more-card">
          <span className="more-icon"><SettingsIcon size={22} /></span>
          Settings
        </Link>
        <button type="button" className="more-card logout" onClick={handleLogout}>
          <span className="more-icon"><LogOut size={22} /></span>
          Log out
        </button>
      </div>
    </div>
  );
}
