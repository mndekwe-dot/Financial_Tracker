import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTheme } from './utils/theme'

initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support: registers the service worker to cache assets and offline API responses.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.PROD ? '/static/sw.js' : '/sw.js';
    navigator.serviceWorker.register(swPath, { scope: '/' })
      .then((reg) => {
        reg.update();
      })
      .catch(() => {});
  });
}
