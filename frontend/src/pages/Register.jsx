import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(username, email, password, passphrase);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      const message = data ? Object.values(data).flat().join(' ') : 'Registration failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-brand"><Wallet size={20} /> Financial Tracker</div>
        <h1>Create account</h1>
        {error && <p className="error">{error}</p>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Email (optional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Recovery Passphrase (recommended)
          <input
            type="text"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="e.g. blue mountain elephant river"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontWeight: 'normal' }}>
            A secret phrase of 3-4 words used to reset your password without email.
          </span>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Register'}
        </button>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
