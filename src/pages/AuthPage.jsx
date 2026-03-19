import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, Shield } from 'lucide-react';
import { ROUTES } from '../utils/constants';
import LoginForm from '../components/features/auth/LoginForm';
import RegisterForm from '../components/features/auth/RegisterForm';
import RecoverPasswordForm from '../components/features/auth/RecoverPasswordForm';
import Vortex from '../components/ui/Vortex';

const portalIndex = { paciente: 0, medico: 1, admin: 2 };

const PortalToggle = ({ portal, onChange }) => (
  <div className="relative flex bg-gray-100 rounded-2xl p-1 mb-6">
    <div
      className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm"
      style={{
        width: 'calc(33.33% - 4px)',
        left: `calc(${portalIndex[portal]} * 33.33% + 4px)`,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
    <button
      type="button"
      onClick={() => onChange('paciente')}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium relative z-10 cursor-pointer transition-colors duration-200 ${
        portal === 'paciente' ? 'text-primary-700' : 'text-gray-500'
      }`}
    >
      <User size={15} />
      Paciente
    </button>
    <button
      type="button"
      onClick={() => onChange('medico')}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium relative z-10 cursor-pointer transition-colors duration-200 ${
        portal === 'medico' ? 'text-primary-700' : 'text-gray-500'
      }`}
    >
      <Stethoscope size={15} />
      Médico
    </button>
    <button
      type="button"
      onClick={() => onChange('admin')}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium relative z-10 cursor-pointer transition-colors duration-200 ${
        portal === 'admin' ? 'text-primary-700' : 'text-gray-500'
      }`}
    >
      <Shield size={15} />
      Admin
    </button>
  </div>
);

const AuthPage = ({ initialView = 'login' }) => {
  const [view, setView] = useState(initialView);
  const [portal, setPortal] = useState('paciente');
  const navigate = useNavigate();

  const changeView = (newView) => {
    setView(newView);
    const routeMap = {
      login: ROUTES.LOGIN,
      register: ROUTES.REGISTER,
      recover: ROUTES.RECOVER_PASSWORD,
    };
    navigate(routeMap[newView], { replace: true });
  };

  const isRegister = view === 'register';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4 relative overflow-hidden">
      {/* Vortex interactivo */}
      <Vortex />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl" />
      </div>

      <div
        className="relative w-full"
        style={{
          maxWidth: isRegister ? '32rem' : '28rem',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Card */}
        <div
          className={`light-surface bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in ${
            isRegister ? 'max-h-[90vh] overflow-y-auto' : ''
          }`}
        >
          {/* Portal toggle — solo en login */}
          {view === 'login' && (
            <PortalToggle portal={portal} onChange={setPortal} />
          )}

          {/* Contenido animado — key fuerza re-mount y dispara la animación */}
          <div key={view} className="animate-fade-in-up">
            {view === 'login' && (
              <LoginForm portal={portal} onNavigate={changeView} />
            )}
            {view === 'register' && (
              <RegisterForm onNavigate={changeView} />
            )}
            {view === 'recover' && (
              <RecoverPasswordForm onNavigate={changeView} />
            )}
          </div>
        </div>

        {/* Tagline — solo en login */}
        {view === 'login' && (
          <p className="text-center text-sm text-white/60 mt-6 animate-fade-in">
            &quot;Tu bienestar es nuestra prioridad&quot;
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
