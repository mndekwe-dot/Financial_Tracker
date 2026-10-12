import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/auth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!uid || !token) {
    return (
      <div className="auth-page">
        <div className="auth-form" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div className="auth-brand"><Wallet size={20} /> Financial Tracker</div>
          <AlertTriangle size={42} style={{ color: 'var(--color-danger, #ef4444)', marginTop: '0.5rem' }} />
          <h1 style={{ fontSize: '1.4rem' }}>Invalid reset link</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            This password reset link is missing required parameters or is invalid.
          </p>
          <Link to="/forgot-password" className="secondary" style={{ marginTop: '0.5rem' }}>
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || (Array.isArray(data?.new_password) ? data.new_password.join(' ') : 'Password reset failed. Link may have expired.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form">
        <div className="auth-brand"><Wallet size={20} /> Financial Tracker</div>

        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
            <CheckCircle size={44} style={{ color: 'var(--color-success, #22c55e)' }} />
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Password reset!</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Your password has been updated successfully. Redirecting you to login...
            </p>
            <Link to="/login" style={{ marginTop: '0.5rem' }}>
              Log in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.2rem' }}>Set new password</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Please choose a strong password with at least 8 characters.
              </p>
            </div>

            {error && <p className="error">{error}</p>}

            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button type="submit" disabled={busy}>
              {busy ? 'Updating password...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
