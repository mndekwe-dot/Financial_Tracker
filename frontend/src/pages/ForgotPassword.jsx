import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../api/auth';

export default function ForgotPassword() {
  const [tab, setTab] = useState('passphrase'); // 'passphrase' | 'email'
  const navigate = useNavigate();

  // Passphrase form state
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passphraseSuccess, setPassphraseSuccess] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handlePassphraseSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await authApi.resetWithPassphrase({
        username: username.trim(),
        passphrase: passphrase.trim(),
        new_password: newPassword,
      });
      setPassphraseSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || 'Incorrect username or recovery passphrase.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email);
      setEmailSubmitted(true);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.email?.[0] || data?.detail || 'Could not send reset link. Please check your email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ width: '380px' }}>
        <div className="auth-brand">
          <Wallet size={20} /> Financial Tracker
        </div>

        {passphraseSuccess ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
            <CheckCircle size={44} style={{ color: 'var(--color-success, #22c55e)' }} />
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Password reset!</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Your password has been updated. Redirecting you to login...
            </p>
            <Link to="/login" style={{ marginTop: '0.5rem' }}>
              Log in now
            </Link>
          </div>
        ) : emailSubmitted ? (
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
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.2rem' }}>Reset password</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Choose how you want to reset your account password.
            </p>

            {/* Toggle Tabs */}
            <div className="segmented" style={{ '--seg-count': 2, '--seg-active': tab === 'passphrase' ? 0 : 1, marginBottom: '1.2rem' }}>
              <span className="segmented-thumb" aria-hidden="true" />
              <button
                type="button"
                className={`segment${tab === 'passphrase' ? ' active' : ''}`}
                onClick={() => { setTab('passphrase'); setError(''); }}
              >
                Passphrase (Instant)
              </button>
              <button
                type="button"
                className={`segment${tab === 'email' ? ' active' : ''}`}
                onClick={() => { setTab('email'); setError(''); }}
              >
                Email Link
              </button>
            </div>

            {error && <p className="error" style={{ marginBottom: '0.9rem' }}>{error}</p>}

            {tab === 'passphrase' ? (
              <form onSubmit={handlePassphraseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label>
                  Username
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your account username"
                    required
                    autoFocus
                  />
                </label>

                <label>
                  Recovery Passphrase
                  <input
                    type="text"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="e.g. blue mountain elephant river"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontWeight: 'normal' }}>
                    The secret phrase you set for account recovery.
                  </span>
                </label>

                <label>
                  New Password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                </label>

                <label>
                  Confirm New Password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </label>

                <button type="submit" disabled={busy} style={{ marginTop: '0.4rem' }}>
                  {busy ? 'Resetting password...' : 'Reset password now'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label>
                  Registered Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
                </label>

                <button type="submit" disabled={busy} style={{ marginTop: '0.4rem' }}>
                  {busy ? 'Sending link...' : 'Send reset email'}
                </button>
              </form>
            )}

            <p style={{ margin: '1.2rem 0 0', textAlign: 'center', fontSize: '0.85rem' }}>
              Remember your password? <Link to="/login">Log in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
