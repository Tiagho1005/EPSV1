import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, Mail, Lock, ChevronLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Stepper from '../components/ui/Stepper';
import useForm from '../hooks/useForm';
import { validators } from '../utils/validators';
import { ROUTES } from '../utils/constants';
import { api } from '../services/api';

const RecoverPasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [codeValues, setCodeValues] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { values, errors, touched, handleChange, handleBlur } = useForm(
    { identifier: '', newPassword: '', confirmNewPassword: '' },
    {
      identifier: [validators.required],
      newPassword: [validators.required, validators.password],
      confirmNewPassword: [validators.required, (val) => validators.passwordMatch(val, values.newPassword)],
    }
  );

  // Countdown timer for resend code
  useEffect(() => {
    if (step === 1 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) setCanResend(true);
  }, [step, countdown]);

  const handleStep1 = async () => {
    if (!values.identifier) return;
    setIsLoading(true);
    try {
      await api.recoverPassword(values.identifier);
      showToast({ type: 'info', title: 'Código enviado', message: 'Te enviamos un código de verificación a tu correo' });
      setStep(1);
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newValues = [...codeValues];
    newValues[index] = value;
    setCodeValues(newValues);
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeValues[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleStep2 = async () => {
    const code = codeValues.join('');
    if (code.length !== 6) return;
    setIsLoading(true);
    try {
      await api.verifyCode(code);
      setStep(2);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3 = async () => {
    if (errors.newPassword || errors.confirmNewPassword) return;
    setIsLoading(true);
    try {
      await api.resetPassword(values.newPassword);
      showToast({ type: 'success', title: '¡Listo!', message: 'Tu contraseña ha sido actualizada exitosamente' });
      navigate(ROUTES.LOGIN);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { label: 'Identificación', icon: 'User' },
    { label: 'Verificación', icon: 'ShieldCheck' },
    { label: 'Nueva contraseña', icon: 'Lock' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 mb-3">
              <HeartPulse size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Recuperar Contraseña</h1>
          </div>

          {/* Stepper */}
          <div className="mb-8">
            <Stepper steps={steps} currentStep={step} />
          </div>

          {/* Step 1: Identification */}
          {step === 0 && (
            <div className="animate-fade-in-up">
              <p className="text-sm text-gray-500 mb-4 text-center">
                Ingresa tu correo electrónico o número de cédula
              </p>
              <Input
                label="Correo o Cédula"
                name="identifier"
                placeholder="tucorreo@ejemplo.com o 1234567890"
                value={values.identifier}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.identifier}
                touched={touched.identifier}
                required
                icon={<Mail size={18} />}
              />
              <Button
                fullWidth
                loading={isLoading}
                disabled={!values.identifier}
                onClick={handleStep1}
                className="gradient-primary border-0 h-12"
                icon={<ArrowRight size={18} />}
                iconPosition="right"
              >
                Enviar Código
              </Button>
            </div>
          )}

          {/* Step 2: Code verification */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <p className="text-sm text-gray-500 mb-6 text-center">
                Ingresa el código de 6 dígitos enviado a tu correo
              </p>
              <div className="flex gap-2 justify-center mb-6">
                {codeValues.map((val, i) => (
                  <input
                    key={i}
                    id={`code-${i}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition-all"
                  />
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mb-4">
                {canResend ? (
                  <button
                    onClick={() => { setCountdown(60); setCanResend(false); }}
                    className="text-primary-600 font-medium hover:text-primary-700 cursor-pointer"
                  >
                    Reenviar código
                  </button>
                ) : (
                  <>Reenviar código en <span className="font-semibold text-primary-600">{countdown}s</span></>
                )}
              </p>
              <p className="text-center text-xs text-gray-400 mb-4">
                Código de prueba: <span className="font-mono font-bold">123456</span>
              </p>
              <Button
                fullWidth
                loading={isLoading}
                disabled={codeValues.join('').length !== 6}
                onClick={handleStep2}
                className="gradient-primary border-0 h-12"
              >
                Verificar Código
              </Button>
            </div>
          )}

          {/* Step 3: New password */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <p className="text-sm text-gray-500 mb-4 text-center">
                Crea tu nueva contraseña
              </p>
              <Input
                label="Nueva Contraseña"
                name="newPassword"
                type="password"
                placeholder="Crea una contraseña segura"
                value={values.newPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.newPassword}
                touched={touched.newPassword}
                required
                icon={<Lock size={18} />}
              />
              <Input
                label="Confirmar Nueva Contraseña"
                name="confirmNewPassword"
                type="password"
                placeholder="Repite tu nueva contraseña"
                value={values.confirmNewPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.confirmNewPassword}
                touched={touched.confirmNewPassword}
                required
                icon={<Lock size={18} />}
              />
              <Button
                fullWidth
                loading={isLoading}
                onClick={handleStep3}
                className="gradient-primary border-0 h-12"
              >
                Actualizar Contraseña
              </Button>
            </div>
          )}

          {/* Back to login */}
          <div className="text-center mt-6">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ChevronLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoverPasswordPage;
