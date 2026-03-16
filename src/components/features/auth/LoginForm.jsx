import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, IdCard, Lock, AlertTriangle, Stethoscope } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import useForm from '../../../hooks/useForm';
import { validators } from '../../../utils/validators';
import { ROUTES, MAX_LOGIN_ATTEMPTS } from '../../../utils/constants';

const LoginForm = ({ onError, portal = 'paciente', onNavigate }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } = useForm(
    { cedula: '', password: '' },
    {
      cedula: [validators.required, validators.cedula],
      password: [validators.required, validators.minLength(8)],
    }
  );

  const onSubmit = async (formValues) => {
    setLoginError('');
    try {
      const result = await login(formValues.cedula, formValues.password);
      setFailedAttempts(0);
      showToast({
        type: 'success',
        title: '¡Bienvenido/a!',
        message: `¡Bienvenido/a de vuelta, ${result.user.nombre}!`,
      });
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setLoginError(error.message);
      if (onError) onError();
    }
  };

  const isDisabled = !values.cedula || !values.password;
  const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts;
  const showAttemptsWarning = failedAttempts > 0 && failedAttempts < MAX_LOGIN_ATTEMPTS;

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
          <HeartPulse size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">EPS</h1>
        <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
          {portal === 'medico' ? <><Stethoscope size={14} /> Portal del Médico</> : 'Portal del Afiliado'}
        </p>
      </div>

      {loginError && (
        <div className="mb-4 p-3 bg-error-light border border-error/20 rounded-xl text-sm text-error-dark animate-fade-in-up">
          {loginError}
        </div>
      )}

      {showAttemptsWarning && (
        <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning-dark animate-fade-in-up flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Te {remainingAttempts === 1 ? 'queda' : 'quedan'}{' '}
            <strong>{remainingAttempts} intento{remainingAttempts !== 1 ? 's' : ''}</strong>{' '}
            antes de que tu cuenta sea bloqueada temporalmente.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Número de Cédula"
          name="cedula"
          type="text"
          placeholder="Ingresa tu número de cédula"
          value={values.cedula}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.cedula}
          touched={touched.cedula}
          required
          icon={<IdCard size={18} />}
        />

        <Input
          label="Contraseña"
          name="password"
          type="password"
          placeholder="Ingresa tu contraseña"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          required
          icon={<Lock size={18} />}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isDisabled}
          className="mt-2 gradient-primary border-0 h-12 text-base"
        >
          Iniciar Sesión
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('recover') : null}
          className="text-sm text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-gray-400">o</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('register') : null}
            className="text-primary-600 font-semibold hover:text-primary-700 transition-colors cursor-pointer"
          >
            Crear cuenta
          </button>
        </p>
      </div>
    </>
  );
};

export default LoginForm;
