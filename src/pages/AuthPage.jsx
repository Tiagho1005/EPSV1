import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import LoginForm from '../components/features/auth/LoginForm';
import RegisterForm from '../components/features/auth/RegisterForm';
import RecoverPasswordForm from '../components/features/auth/RecoverPasswordForm';
import Vortex from '../components/ui/Vortex';

const AuthPage = ({ initialView = 'login' }) => {
  const [view, setView] = useState(initialView);
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
          {/* Contenido animado — key fuerza re-mount y dispara la animación */}
          <div key={view} className="animate-fade-in-up">
            {view === 'login' && (
              <LoginForm onNavigate={changeView} />
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
