import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Weekly from './pages/Weekly';
import Loans from './pages/Loans';
import Reports from './pages/Reports';
import Shopping from './pages/Shopping';
import More from './pages/More';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataRefreshProvider>
          <ToastProvider>
            <OfflineBanner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/weekly" element={<Weekly />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/shopping" element={<Shopping />} />
                <Route path="/more" element={<More />} />
              </Route>
            </Routes>
          </ToastProvider>
        </DataRefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
