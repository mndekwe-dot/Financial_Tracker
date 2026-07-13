import { useState } from 'react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

const EMPTY = { current_password: '', new_password: '', confirm: '' };

export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!open) return null;

  function close() {
    setForm(EMPTY);
    setError('');
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.new_password !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await client.post('/auth/change-password/', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast('Password updated.');
      close();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && close()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Change password</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
