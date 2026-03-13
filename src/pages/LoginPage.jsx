import React, { useState } from 'react';
import LoginForm from '../components/features/auth/LoginForm';

const LoginPage = () => {
  const [shakeForm, setShakeForm] = useState(false);

  const handleShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl" />
      </div>

      <div className={`w-full max-w-md relative ${shakeForm ? 'animate-shake' : ''}`}>
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in">
          <LoginForm onError={handleShake} />
        </div>

        {/* Tagline */}
        <p className="text-center text-sm text-white/60 mt-6">
          &quot;Tu bienestar es nuestra prioridad&quot;
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
