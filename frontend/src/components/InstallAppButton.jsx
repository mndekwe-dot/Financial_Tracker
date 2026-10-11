import { useEffect, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

let deferredPrompt = null;

export default function InstallAppButton({ className = '', showInstalled = false }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (deferredPrompt) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      // Fallback hint for browsers like iOS Safari that don't support beforeinstallprompt
      alert('To install this app on your device:\n\n• iOS Safari: Tap Share and select "Add to Home Screen".\n• Android / Chrome: Tap the browser menu (⋮) and select "Install app" or "Add to Home screen".\n• Desktop Chrome/Edge: Click the install icon in the URL bar.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
    }
    deferredPrompt = null;
  }

  if (isInstalled && showInstalled) {
    return (
      <span className={`installed-badge ${className}`}>
        <CheckCircle2 size={16} /> App Installed
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`install-app-btn ${canInstall ? 'ready-to-install' : ''} ${className}`}
      onClick={handleInstall}
      title={canInstall ? 'Install app to your device' : 'Download/Install app guide for offline use'}
    >
      <Download size={16} />
      <span>Download App</span>
    </button>
  );
}
