import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InstallAppButton from '../components/InstallAppButton';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-brand"><Wallet size={20} /> Financial Tracker</div>
        <h1>Welcome back</h1>
        {error && <p className="error">{error}</p>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Password</span>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-primary)' }}>
              Forgot password?
            </Link>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'center' }}>
          <InstallAppButton />
        </div>
      </form>
    </div>
  );
}
