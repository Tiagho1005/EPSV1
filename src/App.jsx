import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppointmentProvider } from './context/AppointmentContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import NewAppointmentPage from './pages/NewAppointmentPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import MedicationsPage from './pages/MedicationsPage';
import ProfilePage from './pages/ProfilePage';
import HelpPage from './pages/HelpPage';
import { PageSpinner } from './components/ui/Spinner';
import { ROUTES } from './utils/constants';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path={ROUTES.REGISTER} element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path={ROUTES.RECOVER_PASSWORD} element={<PublicRoute><RecoverPasswordPage /></PublicRoute>} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppointmentProvider>
              <MainLayout />
            </AppointmentProvider>
          </ProtectedRoute>
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

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
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
