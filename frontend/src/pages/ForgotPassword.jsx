import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.email?.[0] || data?.detail || 'Could not send reset link. Please check your email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form">
        <div className="auth-brand">
          <Wallet size={20} /> Financial Tracker
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
            <CheckCircle size={44} style={{ color: 'var(--color-success, #22c55e)' }} />
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Check your email</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              If an account is associated with <strong>{email}</strong>, we've sent instructions and a link to reset your password.
            </p>
            <Link to="/login" className="secondary" style={{ marginTop: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to Log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.2rem' }}>Reset password</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {error && <p className="error">{error}</p>}

            <label>
              Email address
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>
            </label>

            <button type="submit" disabled={busy}>
              {busy ? 'Sending link...' : 'Send reset link'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: '0.85rem' }}>
              Remember your password? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
