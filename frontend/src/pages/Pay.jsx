import { useEffect, useState } from 'react';
import { Phone, Store, Copy, PhoneCall, CheckCircle2 } from 'lucide-react';
import client from '../api/client';
import AmountInput from '../components/AmountInput';
import { evaluateExpression } from '../utils/calc';
import { useToast } from '../context/ToastContext';
import { useDataRefresh } from '../context/DataRefreshContext';

const isAndroid = /Android/i.test(navigator.userAgent);

// Build the dial link. Only '#' must be encoded for the dialer; '*' stays literal.
const telHref = (ussd) => `tel:${ussd.replace(/#/g, '%23')}`;

export default function Pay() {
  const [recipientType, setRecipientType] = useState('phone');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ussd }
  const toast = useToast();
  const { bump } = useDataRefresh();

  useEffect(() => {
    client.get('/categories/').then(({ data }) => setCategories(data.filter((c) => c.type === 'expense')));
  }, []);

  function reset() {
    setResult(null);
    setRecipient('');
    setAmount('');
    setCategory('');
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const value = evaluateExpression(amount);
    if (value === null || value <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!recipient.trim()) {
      setError(recipientType === 'merchant' ? 'Enter the merchant code.' : 'Enter the phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await client.post('/momo/pay/', {
        recipient: recipient.trim(),
        recipient_type: recipientType,
        amount: value,
        category: category || null,
      });
      bump(); // the expense is recorded immediately
      setResult({ ussd: data.ussd });
      // On Android, jump straight to the dialer with the code pre-filled.
      if (isAndroid) {
        window.location.href = telHref(data.ussd);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start the payment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.ussd);
      toast('Payment code copied.');
    } catch {
      toast('Could not copy — long-press the code to copy.', 'error');
    }
  }

  if (result) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Complete your payment</h1>
            <p>The expense is already recorded. Confirm it on your phone by entering your MoMo PIN.</p>
          </div>
        </div>

        <div className="momo-card pay-result">
          <CheckCircle2 size={40} className="pay-tick" />
          <p className="pay-recorded-note">Recorded — it’ll be confirmed automatically when the MoMo SMS arrives.</p>

          <div className="pay-code">{result.ussd}</div>

          <a className="pay-dial-btn" href={telHref(result.ussd)}>
            <PhoneCall size={18} style={{ verticalAlign: -3 }} /> Open dialer &amp; enter PIN
          </a>
          <button type="button" className="secondary" onClick={copyCode}>
            <Copy size={15} style={{ verticalAlign: -2 }} /> Copy code
          </button>

          {!isAndroid && (
            <p className="momo-hint" style={{ marginTop: '0.9rem' }}>
              On iPhone the dialer may not auto-run the full code. If it doesn’t, tap <strong>Copy code</strong>,
              open your Phone app, paste it and press call — then enter your PIN.
            </p>
          )}

          <button type="button" className="pay-new" onClick={reset}>Make another payment</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pay with MoMo</h1>
          <p>Enter who to pay and how much — we open MoMo pre-filled so you just add your PIN, and record the expense for you.</p>
        </div>
      </div>

      <form className="momo-card pay-form" onSubmit={submit}>
        {error && <p className="error">{error}</p>}

        <div className="pay-toggle">
          <button
            type="button"
            className={recipientType === 'phone' ? 'active' : ''}
            onClick={() => setRecipientType('phone')}
          >
            <Phone size={15} style={{ verticalAlign: -2 }} /> Phone number
          </button>
          <button
            type="button"
            className={recipientType === 'merchant' ? 'active' : ''}
            onClick={() => setRecipientType('merchant')}
          >
            <Store size={15} style={{ verticalAlign: -2 }} /> Merchant code
          </button>
        </div>

        <label className="pay-label">
          {recipientType === 'merchant' ? 'Merchant / MoMoPay code' : 'Phone number'}
          <input
            inputMode={recipientType === 'merchant' ? 'numeric' : 'tel'}
            placeholder={recipientType === 'merchant' ? 'e.g. 123456' : 'e.g. 0788123456'}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="pay-label">
          Amount
          <AmountInput value={amount} onChange={setAmount} required />
        </label>

        <label className="pay-label">
          Category (optional)
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="pay-submit" disabled={submitting}>
          {submitting ? 'Preparing…' : 'Pay'}
        </button>
      </form>
    </div>
  );
}
