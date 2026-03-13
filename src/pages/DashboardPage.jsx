import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus, Calendar, FileText, Pill,
  MapPin, Clock, User, ChevronRight, Check, Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { ROUTES, STATE_VARIANTS, STATE_LABELS } from '../utils/constants';
import { formatDateShort, formatTime, getGreeting, getCurrentDateFormatted } from '../utils/formatters';
import { medications } from '../data/medications';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appointments, fetchAppointments, isLoading } = useAppointments();
  const { showToast } = useToast();
  const [takenMeds, setTakenMeds] = useState({});
  const [loadingMeds, setLoadingMeds] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Get upcoming confirmed/pending appointments
  const upcomingAppointments = appointments
    .filter(a => a.estado === 'confirmada' || a.estado === 'pendiente')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const nextAppointment = upcomingAppointments[0];

  const recentAppointments = appointments
    .filter(a => a.estado === 'completada')
    .slice(0, 3);

  const quickActions = [
    { icon: CalendarPlus, label: 'Agendar Cita', path: ROUTES.NEW_APPOINTMENT, color: 'from-primary-500 to-primary-600' },
    { icon: Calendar, label: 'Mis Citas', path: ROUTES.APPOINTMENTS, color: 'from-secondary-500 to-secondary-600' },
    { icon: FileText, label: 'Historial', path: ROUTES.MEDICAL_HISTORY, color: 'from-indigo-500 to-indigo-600' },
    { icon: Pill, label: 'Medicamentos', path: ROUTES.MEDICATIONS, color: 'from-emerald-500 to-emerald-600' },
  ];

  const handleMarkTaken = (medId, horario) => {
    setTakenMeds(prev => ({ ...prev, [`${medId}-${horario}`]: true }));
    showToast({ type: 'success', title: '✓ Dosis registrada', message: 'Dosis registrada correctamente' });
  };

  // Get today's medication schedule
  const todayMeds = medications.flatMap(med =>
    med.horarios.map(h => ({
      ...med,
      horario: h,
      key: `${med.id}-${h}`,
    }))
  ).sort((a, b) => a.horario.localeCompare(b.horario));

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {getGreeting()}, {user?.nombre} 👋
          </h1>
          <p className="text-gray-500 text-sm">{getCurrentDateFormatted()}</p>
        </div>
      </div>

      {/* Next appointment */}
      {isLoading ? (
        <Skeleton variant="card" />
      ) : nextAppointment ? (
        <Card className="gradient-primary text-white relative overflow-hidden" hover>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <p className="text-white/80 text-sm font-medium mb-2">📅 Próxima Cita</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Stethoscope size={20} />
                  {nextAppointment.especialidadNombre}
                </h3>
                <p className="text-white/90 flex items-center gap-2 mt-1">
                  <User size={16} /> {nextAppointment.medico}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1.5 text-white/90">
                    <Calendar size={14} />
                    {formatDateShort(nextAppointment.fecha)}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/90">
                    <Clock size={14} />
                    {formatTime(nextAppointment.hora)}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/90">
                    <MapPin size={14} />
                    {nextAppointment.sede}
                  </span>
                </div>
              </div>
              <Badge variant={STATE_VARIANTS[nextAppointment.estado]} dot>
                {STATE_LABELS[nextAppointment.estado]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 border border-white/30"
                onClick={() => navigate(ROUTES.APPOINTMENTS)}>
                Ver detalles
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="Calendar"
          title="No tienes citas programadas"
          description="Agenda una cita con tu médico para comenzar"
          action={{
            label: 'Agendar Cita',
            onClick: () => navigate(ROUTES.NEW_APPOINTMENT),
            icon: 'Plus',
          }}
        />
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(action => (
          <Card
            key={action.path}
            hover
            padding="p-4"
            className="text-center group"
            onClick={() => navigate(action.path)}
          >
            <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <action.icon size={22} className="text-white" />
            </div>
            <p className="text-sm font-medium text-gray-700">{action.label}</p>
          </Card>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's medications */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Pill size={20} className="text-primary-500" />
              Medicamentos de Hoy
            </h2>
            <Button variant="link" size="sm" onClick={() => navigate(ROUTES.MEDICATIONS)}
              icon={<ChevronRight size={16} />} iconPosition="right">
              Ver todos
            </Button>
          </div>

          {todayMeds.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Sin medicamentos para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayMeds.slice(0, 4).map(med => {
                const isTaken = takenMeds[med.key];
                return (
                  <div key={med.key}
                    className={`flex items-center justify-between p-3 rounded-xl border ${isTaken ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isTaken ? 'bg-success text-white' : 'bg-primary-100 text-primary-600'}`}>
                        {isTaken ? <Check size={16} /> : <Clock size={14} />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isTaken ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                          {med.nombre} {med.dosis}
                        </p>
                        <p className="text-xs text-gray-500">{formatTime(med.horario)}</p>
                      </div>
                    </div>
                    {!isTaken && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkTaken(med.id, med.horario)}>
                        Marcar
                      </Button>
                    )}
                    {isTaken && (
                      <span className="text-xs text-success font-medium">✓ Tomado</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent appointments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={20} className="text-secondary-500" />
              Actividad Reciente
            </h2>
            <Button variant="link" size="sm" onClick={() => navigate(ROUTES.APPOINTMENTS)}
              icon={<ChevronRight size={16} />} iconPosition="right">
              Ver todas
            </Button>
          </div>

          {recentAppointments.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Sin actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map(apt => (
                <div key={apt.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
                    <Stethoscope size={16} className="text-secondary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{apt.especialidadNombre}</p>
                    <p className="text-xs text-gray-500">{apt.medico} • {formatDateShort(apt.fecha)}</p>
                  </div>
                  <Badge variant={STATE_VARIANTS[apt.estado]} className="text-[10px]">
                    {STATE_LABELS[apt.estado]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
