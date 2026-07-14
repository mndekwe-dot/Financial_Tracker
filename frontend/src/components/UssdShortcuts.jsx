import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Copy } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { telHref, groupByService } from '../utils/ussd';

// Read-only, tappable list of the user's saved USSD codes, grouped by service.
// Tapping "Dial" opens the phone dialer pre-filled with the code.
export default function UssdShortcuts({ version }) {
  const [codes, setCodes] = useState([]);
  const toast = useToast();

  useEffect(() => {
    client.get('/ussd/').then(({ data }) => setCodes(data)).catch(() => {});
  }, [version]);

  function copy(code) {
    navigator.clipboard?.writeText(code).then(
      () => toast('Code copied.'),
      () => toast('Could not copy.', 'error'),
    );
  }

  if (codes.length === 0) {
    return (
      <p className="topup-note">
        No USSD shortcuts yet — add your codes under <Link to="/settings">Settings</Link>.
      </p>
    );
  }

  return (
    <div className="ussd-groups">
      {groupByService(codes).map(([service, items]) => (
        <div key={service} className="ussd-group">
          <h3 className="ussd-group-title">{service}</h3>
          <div className="ussd-list">
            {items.map((c) => (
              <div key={c.id} className="ussd-item">
                <div className="ussd-item-main">
                  <span className="ussd-item-label">{c.label}</span>
                  {/* Tap the code to copy the exact string — dialers mangle '#'. */}
                  <button type="button" className="ussd-item-code" onClick={() => copy(c.code)} title="Tap to copy">
                    {c.code}
                  </button>
                </div>
                <div className="ussd-item-actions">
                  <button type="button" className="ussd-copy-btn" onClick={() => copy(c.code)}>
                    <Copy size={15} /> Copy
                  </button>
                  <a className="secondary icon-btn" href={telHref(c.code)} title="Try dialing (may not work for USSD)" aria-label="Dial">
                    <Phone size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="topup-note" style={{ marginTop: '0.4rem' }}>
        Tip: tap <strong>Copy</strong>, then paste into your phone dialer — that keeps the code exact. Dialing directly can drop the <code>#</code>.
      </p>
    </div>
  );
}
