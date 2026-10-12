import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import { ToastProvider } from './context/ToastContext';
import { LookupProvider } from './context/LookupContext';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Lazy-loaded routes for code-splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Weekly = lazy(() => import('./pages/Weekly'));
const Loans = lazy(() => import('./pages/Loans'));
const Reports = lazy(() => import('./pages/Reports'));
const Shopping = lazy(() => import('./pages/Shopping'));
const TopUp = lazy(() => import('./pages/TopUp'));
const Goals = lazy(() => import('./pages/Goals'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Search = lazy(() => import('./pages/Search'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Settings = lazy(() => import('./pages/Settings'));
const MomoSetup = lazy(() => import('./pages/MomoSetup'));
const Pay = lazy(() => import('./pages/Pay'));
const More = lazy(() => import('./pages/More'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataRefreshProvider>
          <ToastProvider>
            <LookupProvider>
              <OfflineBanner />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/weekly" element={<Weekly />} />
                    <Route path="/loans" element={<Loans />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/shopping" element={<Shopping />} />
                    <Route path="/topup" element={<TopUp />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/recurring" element={<Recurring />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/momo" element={<MomoSetup />} />
                    <Route path="/pay" element={<Pay />} />
                    <Route path="/more" element={<More />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </LookupProvider>
        </ToastProvider>
      </DataRefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
