import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import QuickAddTransaction from './QuickAddTransaction';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
      <QuickAddTransaction />
    </>
  );
}
