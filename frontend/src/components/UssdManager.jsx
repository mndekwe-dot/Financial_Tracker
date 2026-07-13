import { useEffect, useState } from 'react';
import { Plus, Trash2, Phone } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { telHref, groupByService } from '../utils/ussd';

const EMPTY = { service: '', label: '', code: '' };

// Full CRUD for the user's USSD shortcuts, grouped by service.
export default function UssdManager({ onChange }) {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function load() {
    client.get('/ussd/').then(({ data }) => setCodes(data)).catch(() => {});
  }

  useEffect(load, []);

  function notifyChanged() {
    load();
    onChange?.();
  }

  async function add(e) {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.label.trim()) {
      setError('Enter a label and a code.');
      return;
    }
    try {
      await client.post('/ussd/', {
        service: form.service.trim() || 'Other',
        label: form.label.trim(),
        code: form.code.trim(),
      });
      setForm(EMPTY);
      notifyChanged();
    } catch {
      setError('Could not save that shortcut.');
    }
  }

  async function remove(id) {
    await client.delete(`/ussd/${id}/`);
    notifyChanged();
  }

  async function addStarters() {
    await client.post('/ussd/defaults/');
    notifyChanged();
  }

  const services = [...new Set(codes.map((c) => c.service).filter(Boolean))];

  return (
    <div className="ussd-manager">
      {codes.length === 0 && (
        <button type="button" className="secondary" onClick={addStarters} style={{ marginBottom: '0.8rem' }}>
          Add my starter codes
        </button>
      )}

      <div className="ussd-groups">
        {groupByService(codes).map(([service, items]) => (
          <div key={service} className="ussd-group">
            <h3 className="ussd-group-title">{service}</h3>
            {items.map((c) => (
              <div key={c.id} className="ussd-item">
                <div className="ussd-item-main">
                  <span className="ussd-item-label">{c.label}</span>
                  <code className="ussd-item-code">{c.code}</code>
                </div>
                <div className="ussd-item-actions">
                  <a className="secondary icon-btn" href={telHref(c.code)} title="Dial code" aria-label="Dial">
                    <Phone size={16} />
                  </a>
                  <button type="button" className="secondary icon-btn" onClick={() => remove(c.id)} title="Delete" aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <form className="ussd-add" onSubmit={add}>
        {error && <p className="error">{error}</p>}
        <input
          placeholder="Service (e.g. Airtime)"
          value={form.service}
          onChange={(e) => setForm({ ...form, service: e.target.value })}
          list="ussd-services"
        />
        <datalist id="ussd-services">
          {services.map((s) => <option key={s} value={s} />)}
        </datalist>
        <input
          placeholder="Label (e.g. Buy pack)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <input
          placeholder="Code (e.g. *345*1*3#)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <button type="submit"><Plus size={15} style={{ verticalAlign: -2 }} /> Add</button>
      </form>
    </div>
  );
}
