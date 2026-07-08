import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = 3500) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] || Info;
          return (
            <div key={id} className={`toast toast-${type}`}>
              <Icon size={18} className="toast-icon" />
              <span className="toast-message">{message}</span>
              <button className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Returns toast(message, type?, duration?) where type is 'success' | 'error' | 'info'.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
