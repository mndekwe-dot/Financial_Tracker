import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';

export default function SetPassphraseModal({ open, onClose, hasExisting = false, onUpdated }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!open) return null;

  function close() {
    setCurrentPassword('');
    setPassphrase('');
    setConfirmPassphrase('');
    setError('');
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (passphrase.trim().length < 6) {
      setError('Passphrase must be at least 6 characters long (e.g. 3-4 memorable words).');
      return;
    }

    if (passphrase.trim().toLowerCase() !== confirmPassphrase.trim().toLowerCase()) {
      setError('Passphrases do not match.');
      return;
    }

    setBusy(true);
    try {
      await authApi.setPassphrase({
        current_password: currentPassword,
        passphrase: passphrase.trim(),
      });
      toast(hasExisting ? 'Recovery passphrase updated.' : 'Recovery passphrase set!');
      onUpdated?.();
      close();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || data?.current_password?.[0] || 'Failed to set recovery passphrase.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && close()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ margin: 0 }}>{hasExisting ? 'Update recovery passphrase' : 'Set recovery passphrase'}</h2>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '1rem', lineHeight: 1.4 }}>
          This secret phrase allows you to instantly recover your account if you forget your password, without requiring an email service.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Current password (for verification)
            <input
              type="password"
              placeholder="Your current account password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Recovery Passphrase
            <input
              type="text"
              placeholder="e.g. blue mountain elephant river"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
              Tip: Pick 3 to 4 memorable words that only you know.
            </span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Confirm Recovery Passphrase
            <input
              type="text"
              placeholder="Type your passphrase again"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              required
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '0.8rem' }}>
            <button type="button" className="secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Passphrase'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
