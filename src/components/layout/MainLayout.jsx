import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ChevronRight, Home, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from '../../utils/constants';
import useSessionTimeout from '../../hooks/useSessionTimeout';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ChatWidget from '../features/chat/ChatWidget';

const breadcrumbMap = {
  [ROUTES.DASHBOARD]: 'Inicio',
  [ROUTES.APPOINTMENTS]: 'Mis Citas',
  [ROUTES.NEW_APPOINTMENT]: 'Agendar Cita',
  [ROUTES.MEDICAL_HISTORY]: 'Historial Médico',
  [ROUTES.MEDICATIONS]: 'Medicamentos',
  [ROUTES.PROFILE]: 'Mi Perfil',
  [ROUTES.HELP]: 'Ayuda',
  [ROUTES.MEDICO_DASHBOARD]: 'Inicio',
  [ROUTES.MEDICO_APPOINTMENTS]: 'Mis Consultas',
  [ROUTES.MEDICO_RENEWALS]: 'Renovaciones',
  [ROUTES.AUTHORIZATIONS]: 'Autorizaciones',
  [ROUTES.HEALTH_DASHBOARD]: 'Mi Salud',
  [ROUTES.CERTIFICATES]: 'Certificados',
  [ROUTES.MEDICO_AUTHORIZATIONS]: 'Autorizaciones',
  [ROUTES.ADMIN_DASHBOARD]: 'Dashboard',
  [ROUTES.ADMIN_USERS]: 'Usuarios',
  [ROUTES.ADMIN_DOCTORS]: 'Médicos',
  [ROUTES.ADMIN_LOCATIONS]: 'Sedes',
  [ROUTES.ADMIN_SPECIALTIES]: 'Especialidades',
};

const COUNTDOWN_SECONDS = Math.round((SESSION_TIMEOUT_MS - SESSION_WARNING_MS) / 1000);

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const currentPath = location.pathname;
  const isDashboard = currentPath === ROUTES.DASHBOARD || currentPath === ROUTES.MEDICO_DASHBOARD || currentPath === ROUTES.ADMIN_DASHBOARD;

  const handleTimeout = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate(ROUTES.LOGIN);
  }, [logout, navigate]);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  const { resetTimers } = useSessionTimeout({
    onWarning: handleWarning,
    onTimeout: handleTimeout,
    enabled: true,
  });

  // Countdown tick while the warning modal is open
  useEffect(() => {
    if (!showWarning) return;
    if (countdown <= 0) {
      setTimeout(() => handleTimeout(), 0);
      return;
    }
    const tick = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(tick);
  }, [showWarning, countdown, handleTimeout]);

  const handleContinueSession = () => {
    setShowWarning(false);
    resetTimers();
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [];
    let builtPath = '';

    for (const part of parts) {
      builtPath += '/' + part;
      if (breadcrumbMap[builtPath]) {
        crumbs.push({ label: breadcrumbMap[builtPath], path: builtPath });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-50 transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {/* Breadcrumbs */}
          {!isDashboard && breadcrumbs.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
              <nav className="flex items-center gap-1.5 text-sm">
                <Link
                  to={user?.role === 'admin' ? ROUTES.ADMIN_DASHBOARD : user?.role === 'medico' ? ROUTES.MEDICO_DASHBOARD : ROUTES.DASHBOARD}
                  className="text-gray-400 hover:text-primary-500 transition-colors flex items-center gap-1"
                >
                  <Home size={14} />
                  <span>Inicio</span>
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight size={14} className="text-gray-400" />
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-gray-700 font-medium">{crumb.label}</span>
                    ) : (
                      <Link
                        to={crumb.path}
                        className="text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>
          )}

          {/* Page content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>

      <ChatWidget />

      {/* Session timeout warning modal */}
      <Modal
        isOpen={showWarning}
        onClose={handleContinueSession}
        title="¿Sigues ahí?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={handleTimeout}>
              Cerrar Sesión
            </Button>
            <Button
              variant="primary"
              className="gradient-primary border-0"
              onClick={handleContinueSession}
            >
              Continuar Sesión
            </Button>
          </>
        }
      >
        <div className="text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning-light flex items-center justify-center mb-4">
            <Clock size={32} className="text-warning-dark" />
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Tu sesión está a punto de expirar por inactividad.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
            <span className="text-gray-500 text-sm">La sesión se cerrará en</span>
            <span className="text-2xl font-bold text-warning-dark tabular-nums">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:
              {String(countdown % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MainLayout;
