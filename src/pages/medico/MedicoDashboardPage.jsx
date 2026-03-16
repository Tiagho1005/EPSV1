import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, RefreshCw, Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROUTES, STATE_VARIANTS, STATE_LABELS } from '../../utils/constants';
import { formatTime, formatDateShort } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card className="flex items-center gap-4 p-5">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </Card>
);

const MedicoDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMedicoDashboard();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner className="py-16" />;
  if (error) return <div className="text-error text-center py-16">{error}</div>;

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{greeting}, {user?.nombre} 👋</h2>
        <p className="text-gray-500 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Citas hoy" value={data.todayTotal} color="bg-primary-500" />
        <StatCard icon={CheckCircle} label="Completadas hoy" value={data.completedToday} color="bg-success" />
        <StatCard icon={Clock} label="Pendientes hoy" value={data.pendingToday} color="bg-warning" />
        <StatCard icon={RefreshCw} label="Renovaciones" value={data.pendingRenewals} color="bg-secondary-500" />
      </div>

      {/* Upcoming appointments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Próximas Consultas</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.MEDICO_APPOINTMENTS)}>
            Ver todas <ChevronRight size={16} />
          </Button>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={40} className="mx-auto mb-2 opacity-40" />
            <p>No tienes consultas próximas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcoming.map(apt => (
              <div
                key={apt.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(ROUTES.MEDICO_APPOINTMENTS)}
              >
                <div className="text-center w-16 flex-shrink-0">
                  <p className="text-sm font-bold text-primary-600">{formatTime(apt.hora)}</p>
                  <p className="text-xs text-gray-500">{formatDateShort(apt.fecha)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{apt.paciente.nombreCompleto}</p>
                  <p className="text-sm text-gray-500 truncate">{apt.especialidad_nombre} · {apt.sede}</p>
                </div>
                <Badge variant={STATE_VARIANTS[apt.estado]}>
                  {STATE_LABELS[apt.estado]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Renewals alert */}
      {data.pendingRenewals > 0 && (
        <Card className="border-l-4 border-secondary-500 bg-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="text-secondary-600" />
              <div>
                <p className="font-semibold text-gray-800">
                  {data.pendingRenewals} solicitud{data.pendingRenewals !== 1 ? 'es' : ''} de renovación pendiente{data.pendingRenewals !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">Revisa y aprueba las solicitudes de tus pacientes</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(ROUTES.MEDICO_RENEWALS)}>
              Revisar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MedicoDashboardPage;
