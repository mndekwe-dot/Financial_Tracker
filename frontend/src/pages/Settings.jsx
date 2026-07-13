import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Palette, Coins, Download, Trash2 } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
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
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState({ username: user?.username || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const [currency, setCurrencyState] = useState(getCurrency());

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
          <p className="settings-note">Change the password you use to sign in.</p>
          <button type="button" className="secondary" onClick={() => setShowPassword(true)}>Change password</button>
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

        <section className="settings-card">
          <h2><Download size={17} /> Your data</h2>
          <p className="settings-note">Download a full JSON backup of everything in your account.</p>
          <button type="button" className="secondary" onClick={exportData}>Export data</button>
        </section>

        <section className="settings-card danger-zone">
          <h2><Trash2 size={17} /> Danger zone</h2>
          <p className="settings-note">Permanently delete your account and all data.</p>
          <button type="button" className="danger-btn" onClick={deleteAccount}>Delete account</button>
        </section>
      </div>

      <ChangePasswordModal open={showPassword} onClose={() => setShowPassword(false)} />
    </div>
  );
}
