import { useState } from 'react';
import { Plus } from 'lucide-react';
import TransactionFormModal from './TransactionFormModal';
import { useDataRefresh } from '../context/DataRefreshContext';

export default function QuickAddTransaction() {
  const [open, setOpen] = useState(false);
  const { bump } = useDataRefresh();

  function handleSaved() {
    bump();
    setOpen(false);
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label="Add transaction">
        <Plus size={26} />
      </button>
      <TransactionFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
