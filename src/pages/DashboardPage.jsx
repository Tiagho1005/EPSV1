import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';
import { ROUTES } from '../utils/constants';
import { getGreeting, getCurrentDateFormatted, formatDate } from '../utils/formatters';
import { api } from '../services/api';

// Feature Components
import NextAppointmentCard from '../components/features/dashboard/NextAppointmentCard';
import QuickActions from '../components/features/dashboard/QuickActions';
import TodayMedicationsList from '../components/features/dashboard/TodayMedicationsList';
import RecentActivityList from '../components/features/dashboard/RecentActivityList';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appointments, fetchAppointments, isLoading } = useAppointments();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const [takenMeds, setTakenMeds] = useState({});
  const [medications, setMedications] = useState([]);
  const [medsLoading, setMedsLoading] = useState(true);
  const [healthSummary, setHealthSummary] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    api.getMedications()
      .then(data => setMedications(data))
      .catch(() => setMedications([]))
      .finally(() => setMedsLoading(false));
  }, []);

  useEffect(() => {
    api.getTodayTakenDoses()
      .then(data => setTakenMeds(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.getHealthSummary()
      .then(data => setHealthSummary(data))
      .catch(() => setHealthSummary(null))
      .finally(() => setHealthLoading(false));
  }, []);

  // Get upcoming confirmed/pending appointments
  const upcomingAppointments = appointments
    .filter(a => a.estado === 'confirmada' || a.estado === 'pendiente')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const nextAppointment = upcomingAppointments[0];

  const recentAppointments = appointments
    .filter(a => a.estado === 'completada')
    .slice(0, 3);

  const handleMarkTaken = async (medId, horario) => {
    try {
      await api.markMedicationTaken(medId, horario);
      setTakenMeds(prev => ({ ...prev, [`${medId}-${horario}`]: true }));
      showToast({ type: 'success', title: '✓ Dosis registrada', message: 'Dosis registrada correctamente' });
      const med = medications.find(m => m.id === medId);
      addNotification({
        title: 'Dosis registrada',
        message: `${med?.nombre || 'Medicamento'} · dosis de las ${horario} marcada como tomada`,
        type: 'success',
      });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo registrar la dosis. Intenta de nuevo.' });
    }
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
        <NextAppointmentCard 
          appointment={nextAppointment} 
          onDetailClick={() => navigate(ROUTES.APPOINTMENTS)} 
        />
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
      <QuickActions onNavigate={path => navigate(path)} />

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's medications */}
        {medsLoading ? (
          <Skeleton variant="card" />
        ) : (
          <TodayMedicationsList
            medications={todayMeds}
            takenMeds={takenMeds}
            onMarkTaken={handleMarkTaken}
            onSeeAll={() => navigate(ROUTES.MEDICATIONS)}
          />
        )}

        {/* Recent appointments */}
        <RecentActivityList
          appointments={recentAppointments}
          onSeeAll={() => navigate(ROUTES.APPOINTMENTS)}
        />
      </div>

      {/* Health summary widget */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <HeartPulse size={18} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Mi Salud</h3>
          </div>
          <button
            onClick={() => navigate(ROUTES.HEALTH)}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
          >
            Ver todo <ArrowRight size={13} />
          </button>
        </div>

        {healthLoading ? (
          <Skeleton lines={2} />
        ) : !healthSummary || !['presion_arterial', 'glucosa', 'peso'].some(t => healthSummary[t]?.ultimo) ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
              Registra tus signos vitales para verlos aquí
            </p>
            <button
              onClick={() => navigate(ROUTES.HEALTH)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
            >
              Ir a Mi Salud →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { tipo: 'presion_arterial', label: 'Presión', fmt: v => v ? `${v.sistolica}/${v.diastolica}` : '—', unit: 'mmHg' },
              { tipo: 'glucosa',          label: 'Glucosa', fmt: v => v ? `${v.valor}` : '—',                    unit: 'mg/dL' },
              { tipo: 'peso',             label: 'Peso',    fmt: v => v ? `${v.valor}` : '—',                    unit: 'kg' },
            ].map(({ tipo, label, fmt, unit }) => {
              const entry = healthSummary?.[tipo];
              const v = entry?.ultimo?.valor;
              const status = (() => {
                if (!v) return 'neutral';
                if (tipo === 'presion_arterial') return (v.sistolica >= 140 || v.diastolica >= 90) ? 'red' : (v.sistolica >= 130 || v.diastolica >= 85) ? 'yellow' : 'green';
                if (tipo === 'glucosa') return (v.valor < 70 || v.valor > 126) ? 'red' : v.valor > 100 ? 'yellow' : 'green';
                return 'neutral';
              })();
              const dotColor = { green: 'bg-green-500', yellow: 'bg-amber-400', red: 'bg-red-500', neutral: 'bg-gray-300 dark:bg-slate-600' }[status];

              return (
                <div key={tipo} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{fmt(v)}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{v ? unit : ''}</p>
                  {entry?.ultimo && (
                    <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-0.5">{formatDate(entry.ultimo.fecha)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;

