import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppointmentProvider } from './context/AppointmentContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import NewAppointmentPage from './pages/NewAppointmentPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import MedicationsPage from './pages/MedicationsPage';
import ProfilePage from './pages/ProfilePage';
import HelpPage from './pages/HelpPage';
import MedicoDashboardPage from './pages/medico/MedicoDashboardPage';
import MedicoAppointmentsPage from './pages/medico/MedicoAppointmentsPage';
import MedicoRenewalsPage from './pages/medico/MedicoRenewalsPage';
import { PageSpinner } from './components/ui/Spinner';
import { ROUTES } from './utils/constants';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'medico' ? ROUTES.MEDICO_DASHBOARD : ROUTES.DASHBOARD} replace />;
  }
  return children;
};

const PacienteRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user?.role === 'medico') return <Navigate to={ROUTES.MEDICO_DASHBOARD} replace />;
  return children;
};

const MedicoRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user?.role !== 'medico') return <Navigate to={ROUTES.DASHBOARD} replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes — todas renderizan AuthPage con la vista inicial correcta */}
      <Route path={ROUTES.LOGIN} element={<PublicRoute><AuthPage initialView="login" /></PublicRoute>} />
      <Route path={ROUTES.REGISTER} element={<PublicRoute><AuthPage initialView="register" /></PublicRoute>} />
      <Route path={ROUTES.RECOVER_PASSWORD} element={<PublicRoute><AuthPage initialView="recover" /></PublicRoute>} />

      {/* Patient routes */}
      <Route
        element={
          <PacienteRoute>
            <AppointmentProvider>
              <MainLayout />
            </AppointmentProvider>
          </PacienteRoute>
        }
      >
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.APPOINTMENTS} element={<AppointmentsPage />} />
        <Route path={ROUTES.NEW_APPOINTMENT} element={<NewAppointmentPage />} />
        <Route path={ROUTES.MEDICAL_HISTORY} element={<MedicalHistoryPage />} />
        <Route path={ROUTES.MEDICATIONS} element={<MedicationsPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.HELP} element={<HelpPage />} />
      </Route>

      {/* Medico routes */}
      <Route
        element={
          <MedicoRoute>
            <MainLayout />
          </MedicoRoute>
        }
      >
        <Route path={ROUTES.MEDICO_DASHBOARD} element={<MedicoDashboardPage />} />
        <Route path={ROUTES.MEDICO_APPOINTMENTS} element={<MedicoAppointmentsPage />} />
        <Route path={ROUTES.MEDICO_RENEWALS} element={<MedicoRenewalsPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.HELP} element={<HelpPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
