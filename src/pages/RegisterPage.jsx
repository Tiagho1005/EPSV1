import React from 'react';
import RegisterForm from '../components/features/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
