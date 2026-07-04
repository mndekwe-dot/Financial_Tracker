import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Weekly from './pages/Weekly';
import Loans from './pages/Loans';
import More from './pages/More';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataRefreshProvider>
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
              <Route path="/more" element={<More />} />
            </Route>
          </Routes>
        </DataRefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
