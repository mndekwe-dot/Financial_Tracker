import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Palette, Coins, Download, Trash2, Phone, Upload, Smartphone, Sparkles, Copy, Check } from 'lucide-react';
import client from '../api/client';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import SetPassphraseModal, { generateMemorablePassphrase } from '../components/SetPassphraseModal';
import UssdManager from '../components/UssdManager';
import InstallAppButton from '../components/InstallAppButton';
import { getTheme, applyTheme } from '../utils/theme';
import { getCurrency, setCurrency } from '../utils/currency';

const THEMES = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'auto', label: 'System' },
];
const CURRENCIES = ['', '$', '€', '£', '₦', 'R', 'RWF ', 'KES ', 'UGX ', '₵', '₹'];

export default function Settings() {
  const { user, logout } = useAuth();
  const { bump } = useDataRefresh();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState({ username: user?.username || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [hasPassphrase, setHasPassphrase] = useState(Boolean(user?.has_passphrase));
  const [directPassphrase, setDirectPassphrase] = useState(() => !user?.has_passphrase ? generateMemorablePassphrase() : '');
  const [directSaving, setDirectSaving] = useState(false);
  const [directCopied, setDirectCopied] = useState(false);
  const [lastSavedPassphrase, setLastSavedPassphrase] = useState('');
  const [theme, setTheme] = useState(getTheme());
  const [currency, setCurrencyState] = useState(getCurrency());
  const [importing, setImporting] = useState(false);

  function handleGenerateDirect() {
    setDirectPassphrase(generateMemorablePassphrase());
  }

  async function handleCopyDirect(textToCopy) {
    const text = textToCopy || lastSavedPassphrase || directPassphrase;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setDirectCopied(true);
      toast('Passphrase copied to clipboard!');
      setTimeout(() => setDirectCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  }

  async function handleSaveDirectPassphrase(e) {
    e?.preventDefault?.();
    const phrase = directPassphrase.trim();
    if (phrase.length < 6) {
      toast('Passphrase must be at least 6 characters.', 'error');
      return;
    }
    setDirectSaving(true);
    try {
      await authApi.setPassphrase({ passphrase: phrase });
      setHasPassphrase(true);
      setLastSavedPassphrase(phrase);
      toast('Recovery passphrase saved directly to your account!');
    } catch (err) {
      const data = err.response?.data;
      toast(data?.detail || data?.passphrase?.[0] || 'Failed to save recovery passphrase.', 'error');
    } finally {
      setDirectSaving(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);
      const { data } = await client.post('/import/', json);
      toast(data.detail || 'Data restored successfully!');
      bump();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Import failed. Check JSON format.';
      toast(msg, 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await client.patch('/auth/me/', profile);
      toast('Profile updated.');
    } catch (err) {
      const data = err.response?.data;
      toast(data ? Object.values(data).flat().join(' ') : 'Could not update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  function chooseTheme(t) {
    applyTheme(t);
    setTheme(t);
  }

  function chooseCurrency(sym) {
    setCurrency(sym);
    setCurrencyState(sym);
    toast('Currency preference saved.');
  }

  async function exportData() {
    try {
      const { data } = await client.get('/export/');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-tracker-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Data exported.');
    } catch {
      toast('Export failed.', 'error');
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account and ALL your data? This cannot be undone.')) return;
    if (!confirm('Really delete everything? Last chance.')) return;
    try {
      await client.delete('/auth/me/');
      logout();
      navigate('/login');
    } catch {
      toast('Could not delete account.', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile, appearance and data.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h2><User size={17} /> Profile</h2>
          <form className="modal-form" onSubmit={saveProfile}>
            <label className="settings-label">Username
              <input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} required />
            </label>
            <label className="settings-label">Email
              <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </label>
            <button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
          </form>
        </section>

        <section className="settings-card">
          <h2><KeyRound size={17} /> Security</h2>
          <p className="settings-note">Change your password or manage recovery options.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <button type="button" className="secondary" onClick={() => setShowPassword(true)}>
              Change password
            </button>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Recovery Passphrase</span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  background: hasPassphrase ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: hasPassphrase ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)',
                  fontWeight: 600,
                }}>
                  {hasPassphrase ? 'Active' : 'Not set'}
                </span>
              </div>
              <p className="settings-note" style={{ margin: '0 0 0.6rem', fontSize: '0.8rem' }}>
                Protect your account: if you ever forget your password, you can reset it instantly with this phrase (no email needed).
              </p>

              <form onSubmit={handleSaveDirectPassphrase} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Enter or generate memorable phrase..."
                    value={directPassphrase}
                    onChange={(e) => setDirectPassphrase(e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleGenerateDirect}
                    title="Generate a default memorable phrase"
                    style={{ padding: '0.4rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                  >
                    <Sparkles size={13} /> Suggest
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <button
                    type="submit"
                    disabled={directSaving || !directPassphrase.trim()}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem' }}
                  >
                    {directSaving ? 'Saving...' : (hasPassphrase ? 'Update passphrase directly' : 'Save passphrase directly')}
                  </button>
                  {(lastSavedPassphrase || directPassphrase) && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleCopyDirect()}
                      title="Copy phrase to clipboard"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    >
                      {directCopied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                      {directCopied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </form>

              {lastSavedPassphrase && (
                <div style={{
                  padding: '0.5rem 0.7rem',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text)',
                  marginTop: '0.5rem',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  lineHeight: 1.4,
                }}>
                  Saved! Write this down or copy it to your notes: <br />
                  <strong style={{ color: 'var(--color-primary, #6366f1)' }}>{lastSavedPassphrase}</strong>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h2><Palette size={17} /> Appearance</h2>
          <p className="settings-note">Theme</p>
          <div className="segmented" style={{ '--seg-count': THEMES.length, '--seg-active': THEMES.findIndex((t) => t.key === theme) }}>
            <span className="segmented-thumb" aria-hidden="true" />
            {THEMES.map((t) => (
              <button key={t.key} type="button" className={theme === t.key ? 'segment active' : 'segment'} onClick={() => chooseTheme(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <h2><Coins size={17} /> Currency</h2>
          <p className="settings-note">Symbol shown before amounts.</p>
          <select value={currency} onChange={(e) => chooseCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c || 'none'} value={c}>{c ? `${c}  (${(1234.5).toFixed(2)} → ${c}1234.50)` : 'None'}</option>
            ))}
          </select>
        </section>

        <section className="settings-card settings-card-wide">
          <h2><Phone size={17} /> USSD shortcuts</h2>
          <p className="settings-note">Save the codes you dial for airtime, transport card, etc. Tap the phone icon to dial, or use them on the Top-up page.</p>
          <UssdManager />
        </section>

        <section className="settings-card">
          <h2><Smartphone size={17} /> Offline App</h2>
          <p className="settings-note">Download and install this app to your device for instant offline access and home screen launch.</p>
          <InstallAppButton showInstalled />
        </section>

        <section className="settings-card">
          <h2><Download size={17} /> Backup & Restore</h2>
          <p className="settings-note">Download a full JSON backup of everything in your account or restore from a previous backup file.</p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="button" className="secondary" onClick={exportData}>Export backup</button>
            <label className="secondary button-like-label" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
              <Upload size={15} style={{ marginRight: 6 }} />
              {importing ? 'Importing…' : 'Restore backup'}
              <input type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: 'none' }} disabled={importing} />
            </label>
          </div>
        </section>

        <section className="settings-card danger-zone">
          <h2><Trash2 size={17} /> Danger zone</h2>
          <p className="settings-note">Permanently delete your account and all data.</p>
          <button type="button" className="danger-btn" onClick={deleteAccount}>Delete account</button>
        </section>
      </div>

      <ChangePasswordModal open={showPassword} onClose={() => setShowPassword(false)} />
      <SetPassphraseModal
        open={showPassphrase}
        onClose={() => setShowPassphrase(false)}
        hasExisting={hasPassphrase}
        onUpdated={() => setHasPassphrase(true)}
      />
    </div>
  );
}
