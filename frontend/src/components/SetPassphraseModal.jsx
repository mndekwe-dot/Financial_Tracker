import { useState } from 'react';
import { ShieldCheck, Sparkles, Copy, Check } from 'lucide-react';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';

const WORDLIST = [
  'amber', 'anchor', 'beacon', 'breeze', 'canyon', 'cedar', 'clover', 'comet',
  'coral', 'crystal', 'dawn', 'desert', 'falcon', 'forest', 'galaxy', 'glacier',
  'harbor', 'island', 'jupiter', 'meadow', 'nebula', 'ocean', 'orbit', 'pebble',
  'planet', 'prism', 'river', 'shadow', 'shield', 'silver', 'solar', 'summit',
  'timber', 'topaz', 'valley', 'voyage', 'wave', 'willow', 'zenith', 'copper'
];

export function generateMemorablePassphrase() {
  const words = [];
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * WORDLIST.length);
    words.push(WORDLIST[idx]);
  }
  return words.join(' ');
}

export default function SetPassphraseModal({ open, onClose, hasExisting = false, onUpdated }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!open) return null;

  function close() {
    setPassphrase('');
    setConfirmPassphrase('');
    setError('');
    setCopied(false);
    onClose();
  }

  function handleGenerate() {
    const phrase = generateMemorablePassphrase();
    setPassphrase(phrase);
    setConfirmPassphrase(phrase);
    setError('');
  }

  async function handleCopy() {
    if (!passphrase) return;
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      toast('Passphrase copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
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
        passphrase: passphrase.trim(),
      });
      toast(hasExisting ? 'Recovery passphrase updated.' : 'Recovery passphrase set!');
      onUpdated?.();
      close();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || data?.passphrase?.[0] || 'Failed to set recovery passphrase.');
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '0.8rem', lineHeight: 1.4 }}>
          This secret phrase protects your account: if you ever forget your password, you can reset it instantly without needing an email.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary"
            onClick={handleGenerate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <Sparkles size={14} /> Generate memorable phrase
          </button>
          {passphrase && (
            <button
              type="button"
              className="secondary"
              onClick={handleCopy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy phrase'}
            </button>
          )}
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Recovery Passphrase
            <input
              type="text"
              placeholder="e.g. blue mountain elephant river"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
              Tip: Pick 3 to 4 memorable words, or click "Generate memorable phrase" above.
            </span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Confirm Recovery Passphrase
            <input
              type="text"
              placeholder="Type or paste your passphrase again"
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
