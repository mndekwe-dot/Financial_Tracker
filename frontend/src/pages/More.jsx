import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tags, HandCoins, FileDown, ShoppingCart, Smartphone, Send, LogOut, Wallet, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function More() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

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
        <Link to="/topup" className="more-card">
          <span className="more-icon"><Wallet size={22} /></span>
          Top up
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
        <button type="button" className="more-card" onClick={() => setShowPassword(true)}>
          <span className="more-icon"><KeyRound size={22} /></span>
          Change password
        </button>
        <button type="button" className="more-card logout" onClick={handleLogout}>
          <span className="more-icon"><LogOut size={22} /></span>
          Log out
        </button>
      </div>

      <ChangePasswordModal open={showPassword} onClose={() => setShowPassword(false)} />
    </div>
  );
}
