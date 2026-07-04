import { Link } from 'react-router-dom';
import { Tags, HandCoins, FileDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
        <Link to="/categories" className="more-card">
          <span className="more-icon"><Tags size={22} /></span>
          Categories
        </Link>
        <Link to="/loans" className="more-card">
          <span className="more-icon"><HandCoins size={22} /></span>
          Loans
        </Link>
        <Link to="/reports" className="more-card">
          <span className="more-icon"><FileDown size={22} /></span>
          Reports
        </Link>
        <button type="button" className="more-card logout" onClick={handleLogout}>
          <span className="more-icon"><LogOut size={22} /></span>
          Log out
        </button>
      </div>
    </div>
  );
}
