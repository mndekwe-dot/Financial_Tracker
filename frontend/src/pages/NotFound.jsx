import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 0.5rem', color: 'var(--color-primary)' }}>404</h1>
      <h2 style={{ margin: '0 0 0.5rem' }}>Page not found</h2>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 0 1.5rem' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--color-primary)',
        color: '#fff',
        padding: '0.6rem 1.2rem',
        borderRadius: 'var(--radius-md, 8px)',
        textDecoration: 'none',
        fontWeight: 600,
      }}>
        <Home size={18} /> Back to Dashboard
      </Link>
    </div>
  );
}

