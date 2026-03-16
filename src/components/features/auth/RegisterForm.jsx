import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, User, IdCard, Phone, Mail, MapPin, Lock, ChevronLeft } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import DatePicker from '../../ui/DatePicker';
import useForm from '../../../hooks/useForm';
import { validators } from '../../../utils/validators';
import { departments } from '../../../data/departments';
import { ROUTES } from '../../../utils/constants';
import { api } from '../../../services/api';

const RegisterForm = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit, setFieldValue } = useForm(
    {
      nombreCompleto: '',
      cedula: '',
      celular: '',
      email: '',
      fechaNacimiento: '',
      departamento: '',
      municipio: '',
      direccion: '',
      password: '',
      confirmPassword: '',
    },
    {
      nombreCompleto: [validators.required, validators.nombreCompleto],
      cedula: [validators.required, validators.cedula],
      celular: [validators.required, validators.celular],
      email: [validators.required, validators.email],
      fechaNacimiento: [validators.required, validators.date.notFuture, validators.date.minAge(18)],
      departamento: [validators.required],
      municipio: [validators.required],
      direccion: [validators.required, validators.direccion],
      password: [validators.required, validators.password, (val) => validators.notEqualTo('cedula', 'cédula')(val, values)],
      confirmPassword: [validators.required, (val) => validators.passwordMatch(val, values.password)],
    }
  );

  const selectedDept = departments.find(d => d.nombre === values.departamento);
  const municipios = selectedDept?.municipios || [];

  const handleDepartmentChange = (e) => {
    handleChange(e);
    setFieldValue('municipio', '');
  };

  const passwordStrength = validators.passwordStrength(values.password);

  const onSubmit = async (formValues) => {
    if (!acceptTerms) {
      showToast({ type: 'error', title: 'Error', message: 'Debes aceptar los términos y condiciones' });
      return;
    }
    try {
      await api.register(formValues);
      showToast({
        type: 'success',
        title: '¡Cuenta creada!',
        message: '¡Cuenta creada exitosamente! Te enviamos un correo de confirmación',
      });
      if (onNavigate) onNavigate('login'); else navigate(ROUTES.LOGIN);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 mb-3">
          <HeartPulse size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Crear Cuenta</h1>
        <p className="text-sm text-gray-500">Regístrate para acceder al portal</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'gradient-primary' : 'bg-gray-200'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos Personales</h2>

            <Input
              label="Nombre Completo"
              name="nombreCompleto"
              placeholder="Ej: María Rodríguez García"
              value={values.nombreCompleto}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.nombreCompleto}
              touched={touched.nombreCompleto}
              required
              icon={<User size={18} />}
            />

            <Input
              label="Número de Cédula"
              name="cedula"
              placeholder="Ej: 1234567890"
              value={values.cedula}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.cedula}
              touched={touched.cedula}
              required
              icon={<IdCard size={18} />}
            />

            <Input
              label="Número de Celular"
              name="celular"
              placeholder="Ej: 3001234567"
              value={values.celular}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.celular}
              touched={touched.celular}
              required
              icon={<Phone size={18} />}
            />

            <Input
              label="Correo Electrónico"
              name="email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              required
              icon={<Mail size={18} />}
            />

            <DatePicker
              label="Fecha de Nacimiento"
              name="fechaNacimiento"
              value={values.fechaNacimiento}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.fechaNacimiento}
              touched={touched.fechaNacimiento}
              required
              max={new Date().toISOString().split('T')[0]}
            />

            <Select
              label="Departamento"
              name="departamento"
              value={values.departamento}
              onChange={handleDepartmentChange}
              onBlur={handleBlur}
              options={departments.map(d => ({ value: d.nombre, label: d.nombre }))}
              error={errors.departamento}
              touched={touched.departamento}
              required
              placeholder="Selecciona un departamento"
              icon={<MapPin size={18} />}
            />

            <Select
              label="Municipio"
              name="municipio"
              value={values.municipio}
              onChange={handleChange}
              onBlur={handleBlur}
              options={municipios.map(m => ({ value: m, label: m }))}
              error={errors.municipio}
              touched={touched.municipio}
              required
              disabled={!values.departamento}
              placeholder={values.departamento ? 'Selecciona un municipio' : 'Selecciona primero un departamento'}
            />

            <Input
              label="Dirección"
              name="direccion"
              placeholder="Ej: Cra 10 #20-30, Barrio Centro"
              value={values.direccion}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.direccion}
              touched={touched.direccion}
              required
              icon={<MapPin size={18} />}
              helperText="Formato sugerido: Cra 10 #20-30, Barrio Centro"
            />

            <Button
              type="button"
              variant="primary"
              fullWidth
              className="mt-2 gradient-primary border-0 h-12"
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Seguridad</h2>

            <Input
              label="Contraseña"
              name="password"
              type="password"
              placeholder="Crea una contraseña segura"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              touched={touched.password}
              required
              icon={<Lock size={18} />}
            />

            {values.password && (
              <div className="mb-4 -mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.level
                          ? passwordStrength.color === 'error' ? 'bg-error'
                            : passwordStrength.color === 'warning' ? 'bg-warning'
                            : 'bg-success'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  passwordStrength.color === 'error' ? 'text-error'
                    : passwordStrength.color === 'warning' ? 'text-warning'
                    : 'text-success'
                }`}>
                  Fortaleza: {passwordStrength.label}
                </p>
              </div>
            )}

            <Input
              label="Confirmar Contraseña"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              required
              icon={<Lock size={18} />}
            />

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600">
                Acepto los <a href="#" className="text-primary-600 font-medium">Términos de Servicio</a> y la{' '}
                <a href="#" className="text-primary-600 font-medium">Política de Privacidad</a>
              </span>
            </label>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                icon={<ChevronLeft size={18} />}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSubmitting}
                disabled={!acceptTerms}
                className="flex-[2] gradient-primary border-0 h-12"
              >
                Crear Cuenta
              </Button>
            </div>
          </div>
        )}
      </form>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('login') : navigate(ROUTES.LOGIN)}
            className="text-primary-600 font-semibold hover:text-primary-700 transition-colors cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </p>
      </div>
    </>
  );
};

export default RegisterForm;
