import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Courts from './pages/Courts';
import CourtForm from './pages/CourtForm';
import CourtDetail from './pages/CourtDetail';
import QrValidator from './pages/QrValidator';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-primary-600" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/reservas" element={<Reservations />} />
                  <Route path="/canchas" element={<Courts />} />
                  <Route path="/canchas/nueva" element={<CourtForm />} />
                  <Route path="/canchas/:id" element={<CourtDetail />} />
                  <Route path="/canchas/:id/editar" element={<CourtForm />} />
                  <Route path="/validar" element={<QrValidator />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
