import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { ROUTES } from '../utils/constants';
import { getGreeting, getCurrentDateFormatted } from '../utils/formatters';
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
  const [takenMeds, setTakenMeds] = useState({});
  const [medications, setMedications] = useState([]);
  const [medsLoading, setMedsLoading] = useState(true);

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
    </div>
  );
};

export default DashboardPage;

