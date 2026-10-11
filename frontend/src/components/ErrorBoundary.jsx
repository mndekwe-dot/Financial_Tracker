import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'var(--color-danger-soft, #fee2e2)',
            color: 'var(--color-danger, #ef4444)',
            padding: '1rem',
            borderRadius: '50%',
            marginBottom: '1rem',
          }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 0 1.5rem' }}>
            An unexpected error occurred while rendering this page. You can reload or return to the dashboard.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={16} /> Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

