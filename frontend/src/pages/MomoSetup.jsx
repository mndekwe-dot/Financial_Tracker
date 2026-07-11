import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, RefreshCw, Smartphone, FlaskConical, CheckCircle2, XCircle, Send, Save } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

const KIND_LABELS = {
  received: 'Received', sent: 'Sent', payment: 'Payment',
  airtime: 'Airtime/Data', withdrawal: 'Withdrawal', deposit: 'Deposit', other: 'Transaction',
};

export default function MomoSetup() {
  const [settings, setSettings] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sample, setSample] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [ussd, setUssd] = useState({ pay_send_ussd: '', pay_merchant_ussd: '' });
  const [savingUssd, setSavingUssd] = useState(false);
  const toast = useToast();

  function loadMessages() {
    client.get('/momo/messages/').then(({ data }) => setMessages(data));
  }

  useEffect(() => {
    client.get('/momo/settings/').then(({ data }) => {
      setSettings(data);
      setUssd({ pay_send_ussd: data.pay_send_ussd, pay_merchant_ussd: data.pay_merchant_ussd });
    });
    loadMessages();
  }, []);

  async function saveUssd(e) {
    e.preventDefault();
    if (!ussd.pay_send_ussd.includes('{amount}') || !ussd.pay_merchant_ussd.includes('{amount}')) {
      toast('Both codes must include the {amount} placeholder.', 'error');
      return;
    }
    setSavingUssd(true);
    try {
      const { data } = await client.patch('/momo/settings/', ussd);
      setSettings(data);
      toast('Payment codes saved.');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not save the codes.', 'error');
    } finally {
      setSavingUssd(false);
    }
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`);
    } catch {
      toast('Could not copy — long-press to copy manually.', 'error');
    }
  }

  async function regenerate() {
    if (!confirm('Generate a new token? Your old webhook URL will stop working and you must update the forwarder app.')) return;
    const { data } = await client.post('/momo/settings/');
    setSettings(data);
    toast('New token generated. Update your forwarder app.', 'info');
  }

  async function runTest() {
    if (!sample.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await client.post('/momo/test/', { text: sample });
      setTestResult(data);
    } catch {
      toast('Test failed. Try again.', 'error');
    } finally {
      setTesting(false);
    }
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Auto-capture from MTN MoMo</h1>
          <p>Forward your MoMo SMS to your account and each one becomes a transaction automatically.</p>
        </div>
        <Link to="/pay" className="pay-dial-btn" style={{ textDecoration: 'none' }}>
          <Send size={16} style={{ verticalAlign: -3 }} /> Pay with MoMo
        </Link>
      </div>

      <div className="loan-summary-cards">
        <div className="summary-card income">
          <span>Auto-recorded</span>
          <strong>{settings.counts.recorded}</strong>
        </div>
        <div className="summary-card balance">
          <span>Duplicates skipped</span>
          <strong>{settings.counts.duplicate}</strong>
        </div>
        <div className="summary-card expense">
          <span>Ignored (not MoMo)</span>
          <strong>{settings.counts.ignored}</strong>
        </div>
      </div>

      <section className="momo-card">
        <h2>Your webhook URL</h2>
        <p className="momo-hint">Paste this into the SMS-forwarding app on the Android phone that holds your SIM. Keep it secret — anyone with this link can add transactions.</p>
        <div className="momo-field">
          <code className="momo-code">{settings.webhook_url}</code>
          <button type="button" onClick={() => copy(settings.webhook_url, 'Webhook URL')} title="Copy URL">
            <Copy size={15} />
          </button>
        </div>
        <button type="button" className="secondary momo-regen" onClick={regenerate}>
          <RefreshCw size={14} style={{ verticalAlign: -2 }} /> Regenerate token
        </button>
      </section>

      <section className="momo-card">
        <h2><Send size={18} style={{ verticalAlign: -3 }} /> Payment dial codes</h2>
        <p className="momo-hint">
          These are the USSD codes the <Link to="/pay">Pay</Link> screen dials. Defaults are for MTN Rwanda —
          edit them to match exactly what you normally dial. Keep the <code>{'{recipient}'}</code> and
          <code>{'{amount}'}</code> placeholders where the number and amount go.
        </p>
        <form className="pay-form" onSubmit={saveUssd}>
          <label className="pay-label">
            Send to a phone number
            <input
              value={ussd.pay_send_ussd}
              onChange={(e) => setUssd({ ...ussd, pay_send_ussd: e.target.value })}
              placeholder="*182*1*1*{recipient}*{amount}#"
            />
          </label>
          <label className="pay-label">
            Pay a merchant / MoMoPay code
            <input
              value={ussd.pay_merchant_ussd}
              onChange={(e) => setUssd({ ...ussd, pay_merchant_ussd: e.target.value })}
              placeholder="*182*8*1*{recipient}*{amount}#"
            />
          </label>
          <button type="submit" disabled={savingUssd}>
            <Save size={15} style={{ verticalAlign: -2 }} /> {savingUssd ? 'Saving…' : 'Save codes'}
          </button>
        </form>
      </section>

      <section className="momo-card">
        <h2><Smartphone size={18} style={{ verticalAlign: -3 }} /> Set up the Android relay</h2>
        <ol className="momo-steps">
          <li>Put the SIM that receives MTN MoMo messages in an Android phone (a spare one works — it just needs to stay on with internet).</li>
          <li>Install a free SMS-forwarding app such as <strong>“SMS to URL Forwarder”</strong> (or MacroDroid / Tasker).</li>
          <li>Add a rule that triggers on messages <strong>from the MTN MoMo sender</strong> (e.g. <code>MoMo</code> / <code>M-Money</code>).</li>
          <li>Set the action to an <strong>HTTP POST</strong> to the webhook URL above.</li>
          <li>Send the message text in a JSON field named <code>text</code> (or <code>message</code>). Most apps have a <code>%message%</code> placeholder — use it as the body: <code>{'{'}"text":"%message%"{'}'}</code>.</li>
          <li>Grant the app SMS-read permission and leave it running. Done — new MoMo SMS now record themselves.</li>
        </ol>
        <p className="momo-hint">Tip: send yourself a test MoMo transaction (or use the tester below) to confirm it lands in Transactions.</p>
      </section>

      <section className="momo-card">
        <h2><FlaskConical size={18} style={{ verticalAlign: -3 }} /> Test the parser</h2>
        <p className="momo-hint">Paste a real MoMo message to see exactly what would be recorded. Nothing is saved.</p>
        <textarea
          className="momo-textarea"
          rows={3}
          placeholder="Paste an MTN MoMo SMS here…"
          value={sample}
          onChange={(e) => setSample(e.target.value)}
        />
        <button type="button" onClick={runTest} disabled={testing || !sample.trim()}>
          {testing ? 'Testing…' : 'Test message'}
        </button>
        {testResult && (
          testResult.parsed ? (
            <div className="momo-test-result ok">
              <CheckCircle2 size={16} />
              <span>
                Would record a <strong>{testResult.transaction_type}</strong> of <strong>{testResult.amount}</strong>
                {testResult.party ? <> ({KIND_LABELS[testResult.kind] || testResult.kind} — {testResult.party})</> : <> ({KIND_LABELS[testResult.kind] || testResult.kind})</>}
                {' '}on {testResult.date}.
              </span>
            </div>
          ) : (
            <div className="momo-test-result bad">
              <XCircle size={16} />
              <span>Couldn’t read this one. Paste it in a message to me and I’ll add support for its format.</span>
            </div>
          )
        )}
      </section>

      <section className="momo-card">
        <div className="momo-card-head">
          <h2>Recently auto-captured</h2>
          <button type="button" className="secondary" onClick={loadMessages}>Refresh</button>
        </div>
        {messages.length === 0 ? (
          <p className="momo-hint">Nothing yet. Once your relay forwards a MoMo SMS, it shows up here and in Transactions.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Status</th><th>Type</th><th>Amount</th><th>Details</th></tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td data-label="When">{new Date(m.created_at).toLocaleString()}</td>
                  <td data-label="Status">
                    <span className={`momo-badge momo-${m.status}`}>{m.status}</span>
                  </td>
                  <td data-label="Type" className={m.direction === 'in' ? 'amount-income' : m.direction === 'out' ? 'amount-expense' : ''}>
                    {m.transaction_type || '—'}
                  </td>
                  <td data-label="Amount">{m.amount ? Number(m.amount).toFixed(2) : '—'}</td>
                  <td data-label="Details">{m.party || (KIND_LABELS[m.kind] || '') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
