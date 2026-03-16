import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, CalendarPlus, FileText, Pill, User,
  HelpCircle, LogOut, HeartPulse, X, AlertTriangle, Sun, Moon,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../utils/constants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const pacienteMenu = [
  { icon: Home, label: 'Inicio', path: ROUTES.DASHBOARD },
  { icon: Calendar, label: 'Mis Citas', path: ROUTES.APPOINTMENTS },
  { icon: CalendarPlus, label: 'Agendar Cita', path: ROUTES.NEW_APPOINTMENT },
  { icon: FileText, label: 'Historial Médico', path: ROUTES.MEDICAL_HISTORY },
  { icon: Pill, label: 'Medicamentos', path: ROUTES.MEDICATIONS },
  { icon: User, label: 'Mi Perfil', path: ROUTES.PROFILE },
  { divider: true },
  { icon: HelpCircle, label: 'Ayuda', path: ROUTES.HELP },
];

const medicoMenu = [
  { icon: Home, label: 'Inicio', path: ROUTES.MEDICO_DASHBOARD },
  { icon: Calendar, label: 'Mis Consultas', path: ROUTES.MEDICO_APPOINTMENTS },
  { icon: RefreshCw, label: 'Renovaciones', path: ROUTES.MEDICO_RENEWALS },
  { icon: User, label: 'Mi Perfil', path: ROUTES.PROFILE },
  { divider: true },
  { icon: HelpCircle, label: 'Ayuda', path: ROUTES.HELP },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = user?.role === 'medico' ? medicoMenu : pacienteMenu;
  const portalLabel = user?.role === 'medico' ? 'Portal del Médico' : 'Portal del Afiliado';

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    navigate(ROUTES.LOGIN);
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full gradient-sidebar text-white z-50 transition-transform duration-300 w-[280px] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <HeartPulse size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">EPS</h1>
              <p className="text-xs text-purple-200 -mt-0.5">{portalLabel}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            if (item.divider) {
              return <hr key={index} className="my-3 border-white/10" />;
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                      : 'text-purple-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-sm font-bold">
              {getInitials(user?.nombreCompleto)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nombreCompleto || 'Usuario'}</p>
              <p className="text-xs text-purple-300 truncate">
                {user?.role === 'medico' ? 'Médico' : `CC ${user?.cedula}`}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-purple-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer mb-1"
            aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-purple-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Logout confirmation modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Cerrar Sesión"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleLogoutConfirm}>
              Cerrar Sesión
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-error" />
          </div>
          <div>
            <p className="text-sm text-gray-700">
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a iniciar sesión para acceder al portal.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;
