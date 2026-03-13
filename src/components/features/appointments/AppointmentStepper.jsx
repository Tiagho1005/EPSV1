import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Star, MapPin,
  Clock, CalendarDays, Check, Building, Stethoscope, UserCheck
} from 'lucide-react';
import { useAppointments } from '../../../context/AppointmentContext';
import { useToast } from '../../../context/ToastContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Stepper from '../../ui/Stepper';
import DatePicker from '../../ui/DatePicker';
import Spinner from '../../ui/Spinner';
import SpecialtySelector from './SpecialtySelector';
import { api } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { formatDateFull, formatTime } from '../../../utils/formatters';

const stepperSteps = [
  { label: 'Especialidad', icon: 'Stethoscope' },
  { label: 'Médico', icon: 'UserCheck' },
  { label: 'Sede', icon: 'Building' },
  { label: 'Fecha y Hora', icon: 'CalendarDays' },
];

const AppointmentStepper = () => {
  const navigate = useNavigate();
  const { createAppointment } = useAppointments();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selections
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Data
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await api.getSpecialties();
      setSpecialties(data);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedSpecialty) {
      const load = async () => {
        setLoading(true);
        const data = await api.getDoctors(selectedSpecialty.id);
        setDoctors(data);
        setLoading(false);
      };
      load();
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedDoctor) {
      const load = async () => {
        setLoading(true);
        const data = await api.getLocations(selectedDoctor.id);
        setLocations(data);
        setLoading(false);
      };
      load();
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      const load = async () => {
        setLoading(true);
        const times = await api.getAvailableTimes(selectedDoctor.id, selectedDate);
        setAvailableTimes(times);
        setLoading(false);
      };
      load();
    }
  }, [selectedDoctor, selectedDate]);

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  };

  const canContinue = () => {
    switch (currentStep) {
      case 0: return !!selectedSpecialty;
      case 1: return !!selectedDoctor;
      case 2: return !!selectedLocation;
      case 3: return selectedDate && selectedTime;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      if (currentStep === 1) { setSelectedDoctor(null); setDoctors([]); }
      if (currentStep === 2) { setSelectedLocation(null); setLocations([]); }
      if (currentStep === 3) { setSelectedDate(''); setSelectedTime(''); setAvailableTimes([]); }
    }
  };

  const handleSubmit = async () => {
    if (!acceptTerms) {
      showToast({ type: 'warning', title: 'Atención', message: 'Debes aceptar las condiciones de cancelación' });
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        especialidad: selectedSpecialty.id,
        especialidadNombre: selectedSpecialty.nombre,
        medico: selectedDoctor.nombre,
        medicoId: selectedDoctor.id,
        sede: selectedLocation.nombre,
        sedeId: selectedLocation.id,
        fecha: selectedDate,
        hora: selectedTime,
      });
      showToast({
        type: 'success',
        title: '✓ Cita agendada',
        message: 'Tu cita ha sido agendada exitosamente. Te enviamos los detalles a tu correo.',
      });
      navigate(ROUTES.APPOINTMENTS);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const showConfirmation = currentStep === 3 && selectedDate && selectedTime;

  return (
    <>
      <Card>
        <Stepper steps={stepperSteps} currentStep={currentStep} />
      </Card>

      <Card>
        {currentStep === 0 && (
          <SpecialtySelector
            specialties={specialties}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedSpecialty={selectedSpecialty}
            onSelect={setSelectedSpecialty}
          />
        )}

        {currentStep === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Selecciona un médico
              <span className="text-sm font-normal text-gray-400 ml-2">({selectedSpecialty?.nombre})</span>
            </h2>
            {loading ? <Spinner className="py-8" /> : (
              <div className="space-y-3">
                {doctors.map(doc => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                          isSelected ? 'gradient-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {doc.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                            {doc.nombre}
                          </p>
                          <p className="text-sm text-gray-500">{doc.experiencia} años de experiencia</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-medium text-gray-700">{doc.rating}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona una sede</h2>
            {loading ? <Spinner className="py-8" /> : (
              <div className="space-y-3">
                {locations.map(loc => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'gradient-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Building size={20} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                            {loc.nombre}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={12} /> {loc.direccion}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {loc.horario}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && !showConfirmation && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona fecha y hora</h2>
            <div className="mb-6">
              <DatePicker
                label="Fecha"
                name="fecha"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                min={getMinDate()}
                max={getMaxDate()}
              />
            </div>
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-1" /> Horarios disponibles
                </label>
                {loading ? <Spinner className="py-4" /> : availableTimes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No hay horarios disponibles para esta fecha</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          selectedTime === time
                            ? 'gradient-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-gray-200'
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
             )}
          </div>
        )}

        {showConfirmation && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Check size={32} className="text-success" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Confirma tu Cita</h2>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-2"><Stethoscope size={14} /> Especialidad</span>
                <span className="text-sm font-medium">{selectedSpecialty?.nombre}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-2"><UserCheck size={14} /> Médico</span>
                <span className="text-sm font-medium">{selectedDoctor?.nombre}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-2"><Building size={14} /> Sede</span>
                <span className="text-sm font-medium">{selectedLocation?.nombre}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-2"><CalendarDays size={14} /> Fecha</span>
                <span className="text-sm font-medium">{formatDateFull(selectedDate)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-2"><Clock size={14} /> Hora</span>
                <span className="text-sm font-medium">{formatTime(selectedTime)}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600">
                Entiendo que debo cancelar con al menos 24 horas de anticipación
              </span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedTime('')} className="flex-1">
                ← Volver
              </Button>
              <Button
                variant="primary"
                className="flex-[2] gradient-primary border-0"
                loading={submitting}
                onClick={handleSubmit}
                icon={<Check size={18} />}
              >
                Confirmar Cita
              </Button>
            </div>
          </div>
        )}

        {!showConfirmation && (
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => navigate(ROUTES.DASHBOARD) : handleBack}
              icon={<ChevronLeft size={18} />}
            >
              {currentStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            {currentStep < 3 && (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canContinue()}
                icon={<ChevronRight size={18} />}
                iconPosition="right"
                className="gradient-primary border-0"
              >
                Continuar
              </Button>
            )}
          </div>
        )}
      </Card>
    </>
  );
};

export default AppointmentStepper;
