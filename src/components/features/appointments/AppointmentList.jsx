import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, AlertTriangle, Clock } from 'lucide-react';
import usePagination from '../../../hooks/usePagination';
import Pagination from '../../ui/Pagination';
import { useAppointments } from '../../../context/AppointmentContext';
import { useToast } from '../../../context/ToastContext';
import AppointmentCard from './AppointmentCard';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import DatePicker from '../../ui/DatePicker';
import EmptyState from '../../ui/EmptyState';
import Skeleton from '../../ui/Skeleton';
import Spinner from '../../ui/Spinner';
import { api } from '../../../services/api';
import { ROUTES, STATE_VARIANTS, STATE_LABELS, MAX_RESCHEDULES } from '../../../utils/constants';
import { formatDateFull, formatTime } from '../../../utils/formatters';

const AppointmentList = () => {
  const navigate = useNavigate();
  const { appointments, fetchAppointments, cancelAppointment, rescheduleAppointment, isLoading } = useAppointments();
  const { showToast } = useToast();
  
  const [filterState, setFilterState] = useState('todas');
  const [filterDate, setFilterDate] = useState('todas');
  const [filterSpecialty, setFilterSpecialty] = useState('todas');
  
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  const [detailModal, setDetailModal] = useState(null);
  
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    if (rescheduleModal && rescheduleDate) {
      const load = async () => {
        setLoadingTimes(true);
        setRescheduleTime('');
        const times = await api.getAvailableTimes(rescheduleModal.medicoId, rescheduleDate);
        setAvailableTimes(times);
        setLoadingTimes(false);
      };
      load();
    }
  }, [rescheduleModal, rescheduleDate]);

  const stateFilters = [
    { value: 'todas', label: 'Todas' },
    { value: 'confirmada', label: 'Confirmadas' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'completada', label: 'Completadas' },
    { value: 'cancelada', label: 'Canceladas' },
  ];

  const dateFilters = [
    { value: 'todas', label: 'Todas las fechas' },
    { value: 'proximas', label: 'Próximas' },
    { value: 'pasadas', label: 'Pasadas' },
    { value: 'este-mes', label: 'Este mes' },
  ];

  const specialtyOptions = [
    { value: 'todas', label: 'Todas las especialidades' },
    ...Array.from(new Map(appointments.map(a => [a.especialidad, a.especialidadNombre])).entries())
      .map(([value, label]) => ({ value, label })),
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const filtered = appointments.filter(a => {
    if (filterState !== 'todas' && a.estado !== filterState) return false;
    if (filterSpecialty !== 'todas' && a.especialidad !== filterSpecialty) return false;
    if (filterDate !== 'todas') {
      const aptDate = new Date(a.fecha + 'T00:00:00');
      if (filterDate === 'proximas' && aptDate < today) return false;
      if (filterDate === 'pasadas' && aptDate >= today) return false;
      if (filterDate === 'este-mes' && (aptDate < startOfMonth || aptDate > endOfMonth)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const hasActiveFilters = filterState !== 'todas' || filterDate !== 'todas' || filterSpecialty !== 'todas';

  const pagination = usePagination(sorted, 8);

  const clearFilters = () => {
    setFilterState('todas');
    setFilterDate('todas');
    setFilterSpecialty('todas');
    pagination.reset();
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showToast({ type: 'warning', title: 'Atención', message: 'Por favor, indica el motivo de la cancelación' });
      return;
    }
    setCancelling(true);
    try {
      await cancelAppointment(cancelModal.id, cancelReason);
      showToast({ type: 'info', title: 'Cita cancelada', message: 'Tu cita ha sido cancelada' });
      setCancelModal(null);
      setCancelReason('');
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setCancelling(false);
    }
  };

  const canModify = (apt) => apt.estado === 'confirmada' || apt.estado === 'pendiente';
  const canReschedule = (apt) => canModify(apt) && (apt.reagendamientos || 0) < MAX_RESCHEDULES;
  
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

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      showToast({ type: 'warning', title: 'Atención', message: 'Selecciona la nueva fecha y hora' });
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleAppointment(rescheduleModal.id, rescheduleDate, rescheduleTime);
      showToast({ type: 'success', title: 'Cita reagendada', message: 'Tu cita ha sido reagendada exitosamente' });
      setRescheduleModal(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setAvailableTimes([]);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {stateFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterState(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterState === f.value
                  ? 'gradient-primary text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={15} className="text-gray-400 flex-shrink-0" />
          {dateFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterDate(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterDate === f.value
                  ? 'bg-secondary-100 text-secondary-700 border border-secondary-300'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block" />
          <select
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
          >
            {specialtyOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-error border border-error/30 hover:bg-error-light transition-all cursor-pointer whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="card" />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="Calendar"
          title="No tienes citas"
          description={!hasActiveFilters ? 'Agenda tu primera cita médica' : 'No hay citas que coincidan con los filtros seleccionados'}
          action={!hasActiveFilters ? {
            label: 'Agendar Cita',
            onClick: () => navigate(ROUTES.NEW_APPOINTMENT),
            icon: 'Plus',
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {pagination.paginated.map(apt => (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                onDetail={setDetailModal}
                onReschedule={(apt) => { setRescheduleModal(apt); setRescheduleDate(''); setRescheduleTime(''); setAvailableTimes([]); }}
                onCancel={setCancelModal}
                canModify={canModify}
                canReschedule={canReschedule}
              />
            ))}
          </div>
          <Pagination {...pagination} />
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => { setCancelModal(null); setCancelReason(''); }}
        title="Cancelar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCancelModal(null); setCancelReason(''); }}>
              Volver
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Confirmar Cancelación
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 bg-warning-light rounded-xl mb-4">
          <AlertTriangle size={20} className="text-warning-dark flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning-dark">
            ¿Estás seguro de cancelar esta cita? Esta acción no se puede deshacer.
          </p>
        </div>
        {cancelModal && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
            <p className="font-medium">{cancelModal.especialidadNombre}</p>
            <p className="text-gray-500">{cancelModal.medico} • {formatDateFull(cancelModal.fecha)} • {formatTime(cancelModal.hora)}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cancelación</label>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Describe el motivo de la cancelación..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Detalles de la Cita"
        size="md"
      >
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Especialidad</p>
                <p className="text-sm font-medium">{detailModal.especialidadNombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Estado</p>
                <Badge variant={STATE_VARIANTS[detailModal.estado]} dot>
                  {STATE_LABELS[detailModal.estado]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Médico</p>
                <p className="text-sm font-medium">{detailModal.medico}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sede</p>
                <p className="text-sm font-medium">{detailModal.sede}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-sm font-medium">{formatDateFull(detailModal.fecha)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Hora</p>
                <p className="text-sm font-medium">{formatTime(detailModal.hora)}</p>
              </div>
            </div>
            {detailModal.diagnostico && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Diagnóstico</p>
                <p className="text-sm text-blue-800">{detailModal.diagnostico}</p>
              </div>
            )}
            {detailModal.notas && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm text-gray-700">{detailModal.notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleModal}
        onClose={() => { setRescheduleModal(null); setRescheduleDate(''); setRescheduleTime(''); setAvailableTimes([]); }}
        title="Reagendar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setRescheduleModal(null); setRescheduleDate(''); setRescheduleTime(''); setAvailableTimes([]); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={rescheduling}
              disabled={!rescheduleDate || !rescheduleTime}
              onClick={handleReschedule}
              className="gradient-primary border-0"
            >
              Confirmar Reagendamiento
            </Button>
          </>
        }
      >
        {rescheduleModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm mb-2">
              <p className="font-medium">{rescheduleModal.especialidadNombre}</p>
              <p className="text-gray-500">{rescheduleModal.medico} • {formatDateFull(rescheduleModal.fecha)} • {formatTime(rescheduleModal.hora)}</p>
              {rescheduleModal.reagendamientos > 0 && (
                <p className="text-xs text-warning-dark mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Reagendamientos usados: {rescheduleModal.reagendamientos}/{MAX_RESCHEDULES}
                </p>
              )}
            </div>
            <div>
              <DatePicker
                label="Nueva fecha"
                name="rescheduleDate"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
              />
            </div>
            {rescheduleDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={15} className="inline mr-1" /> Nuevo horario
                </label>
                {loadingTimes ? (
                  <Spinner className="py-3" />
                ) : availableTimes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">No hay horarios disponibles para esta fecha</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => setRescheduleTime(time)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          rescheduleTime === time
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
      </Modal>
    </div>
  );
};

export default AppointmentList;
