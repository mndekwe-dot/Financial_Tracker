import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { pendingSyncCount, syncOfflineQueue } from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(pendingSyncCount());
  const { bump } = useDataRefresh();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setOnline(false);
    const handleQueueChanged = (e) => setPending(e.detail ?? pendingSyncCount());
    const handleSynced = () => {
      setPending(pendingSyncCount());
      bump(); // reload pages so synced changes show up
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChanged);
    window.addEventListener('offline-queue-synced', handleSynced);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChanged);
      window.removeEventListener('offline-queue-synced', handleSynced);
    };
  }, [bump]);

  if (online && pending === 0) return null;

  return (
    <div className={`offline-banner ${online ? 'syncing' : ''}`}>
      {online ? (
        <>
          <RefreshCw size={14} />
          Syncing {pending} pending change{pending === 1 ? '' : 's'}…
        </>
      ) : (
        <>
          <WifiOff size={14} />
          You're offline — changes are saved on this device and will sync when you reconnect.
          {pending > 0 && ` (${pending} waiting)`}
        </>
      )}
    </div>
  );
}
