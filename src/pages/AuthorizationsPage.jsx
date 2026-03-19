import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, ClipboardCopy, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Calendar, MapPin, Stethoscope,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import usePagination from '../hooks/usePagination';
import { formatDate } from '../utils/formatters';
import { ROUTES } from '../utils/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADO_TABS = [
  { value: '',           label: 'Todas' },
  { value: 'pendiente',  label: 'Pendientes' },
  { value: 'aprobada',   label: 'Aprobadas' },
  { value: 'rechazada',  label: 'Rechazadas' },
  { value: 'vencida',    label: 'Vencidas' },
];

const TIPO_OPTIONS = [
  { value: '',                     label: 'Todos los tipos' },
  { value: 'examen',               label: 'Examen' },
  { value: 'procedimiento',        label: 'Procedimiento' },
  { value: 'consulta_especialista',label: 'Consulta Especialista' },
  { value: 'imagen',               label: 'Imagen Diagnóstica' },
  { value: 'cirugia',              label: 'Cirugía' },
];

const TIPO_LABELS = {
  examen:                'Examen',
  procedimiento:         'Procedimiento',
  consulta_especialista: 'Consulta Especialista',
  imagen:                'Imagen Diagnóstica',
  cirugia:               'Cirugía',
};

const estadoBadge = (estado) => {
  switch (estado) {
    case 'aprobada':  return 'success';
    case 'pendiente': return 'warning';
    case 'rechazada': return 'error';
    case 'vencida':   return 'neutral';
    default:          return 'neutral';
  }
};

const estadoLabel = (estado) =>
  ({ aprobada: 'Aprobada', pendiente: 'Pendiente', rechazada: 'Rechazada', vencida: 'Vencida' }[estado] || estado);

// ─── Card component ───────────────────────────────────────────────────────────

const AuthorizationCard = ({ auth, expanded, onToggle }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(auth.codigo_autorizacion).then(() => {
      showToast({ type: 'success', title: 'Copiado', message: 'Código copiado al portapapeles' });
    }).catch(() => {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo copiar el código' });
    });
  };

  return (
    <Card
      hover
      className={`transition-all ${expanded ? 'ring-2 ring-primary-200 dark:ring-primary-700' : ''}`}
    >
      {/* ── Header row (clickable) ── */}
      <button
        onClick={onToggle}
        className="w-full text-left cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={estadoBadge(auth.estado)} dot>
                {estadoLabel(auth.estado)}
              </Badge>
              {auth.prioridad === 'urgente' && (
                <Badge variant="error">
                  <AlertTriangle size={11} className="mr-0.5" />
                  Urgente
                </Badge>
              )}
              {auth.prioridad === 'prioritario' && (
                <Badge variant="warning">Prioritario</Badge>
              )}
              <Badge variant="secondary">
                {TIPO_LABELS[auth.tipo] || auth.tipo}
              </Badge>
            </div>

            {/* Description */}
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base leading-snug">
              {auth.descripcion}
            </h3>

            {/* Diagnosis */}
            {auth.diagnostico_relacionado && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {auth.diagnostico_relacionado}
              </p>
            )}

            {/* Doctor / Sede / Fecha */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Stethoscope size={12} />
                {auth.medico_nombre}
              </span>
              {auth.sede_nombre && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {auth.sede_nombre}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Solicitada el {formatDate(auth.fecha_solicitud)}
              </span>
            </div>

            {/* Approval code (visible without expand) */}
            {auth.estado === 'aprobada' && auth.codigo_autorizacion && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Código:</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-300 font-mono tracking-wide">
                    {auth.codigo_autorizacion}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="ml-1 text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors cursor-pointer"
                    title="Copiar código"
                  >
                    <ClipboardCopy size={14} />
                  </button>
                </div>
                {auth.fecha_vencimiento && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <Clock size={12} />
                    Vence el {formatDate(auth.fecha_vencimiento)}
                  </span>
                )}
              </div>
            )}

            {/* Notes block */}
            {auth.notas_autorizacion && (
              <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">Nota de autorización</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">{auth.notas_autorizacion}</p>
              </div>
            )}
          </div>

          {/* Expand chevron */}
          <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 mt-1">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 animate-fade-in-up space-y-4">
          {/* Doctor notes */}
          {auth.notas_medico && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <Stethoscope size={16} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  Notas del médico
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{auth.notas_medico}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Estado del proceso
            </p>
            <div className="flex items-start gap-0">
              {/* Step 1 — Solicitada */}
              <TimelineStep
                label="Solicitada"
                date={auth.fecha_solicitud}
                active
              />
              <TimelineLine active={!!auth.fecha_respuesta} />
              {/* Step 2 — Procesada */}
              <TimelineStep
                label={auth.estado === 'rechazada' ? 'Rechazada' : 'Aprobada'}
                date={auth.fecha_respuesta}
                active={!!auth.fecha_respuesta}
                variant={auth.estado === 'rechazada' ? 'error' : 'success'}
              />
              <TimelineLine active={auth.estado === 'aprobada' && !!auth.fecha_vencimiento} />
              {/* Step 3 — Vence */}
              <TimelineStep
                label="Vence"
                date={auth.fecha_vencimiento}
                active={auth.estado === 'aprobada' && !!auth.fecha_vencimiento}
                variant="warning"
              />
            </div>
          </div>

          {/* CTA for approved */}
          {auth.estado === 'aprobada' && (
            <div className="pt-2">
              <Button
                variant="primary"
                icon={<Calendar size={16} />}
                onClick={() => navigate(ROUTES.NEW_APPOINTMENT)}
                className="w-full sm:w-auto"
              >
                Agendar cita con esta autorización
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Timeline helpers ─────────────────────────────────────────────────────────

const TimelineStep = ({ label, date, active, variant = 'primary' }) => {
  const dotColors = {
    primary: active ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600',
    success: active ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600',
    error:   active ? 'bg-red-500'   : 'bg-gray-200 dark:bg-slate-600',
    warning: active ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-600',
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0 w-20 sm:w-28">
      <div className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-800 ${dotColors[variant]}`} />
      <p className={`text-xs font-medium mt-1.5 ${active ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-slate-600'}`}>
        {label}
      </p>
      {date && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5 leading-tight">
          {formatDate(date)}
        </p>
      )}
    </div>
  );
};

const TimelineLine = ({ active }) => (
  <div className={`flex-1 h-0.5 mt-1.5 mx-1 ${active ? 'bg-primary-300 dark:bg-primary-700' : 'bg-gray-200 dark:bg-slate-700'}`} />
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AuthorizationsPage = () => {
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const pagination = usePagination(authorizations, 6);

  const fetchAuthorizations = useCallback(async (estado, tipo) => {
    setLoading(true);
    try {
      const data = await api.getAuthorizations(estado || undefined, tipo || undefined);
      setAuthorizations(data);
      setExpandedId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthorizations(estadoFilter, tipoFilter);
  }, [estadoFilter, tipoFilter, fetchAuthorizations]);

  const handleToggle = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mis Autorizaciones</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Consulta y da seguimiento a tus autorizaciones médicas
        </p>
      </div>

      {/* Estado tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {ESTADO_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setEstadoFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              estadoFilter === tab.value
                ? 'gradient-primary text-white shadow-md'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tipo select */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
          Tipo:
        </label>
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
        >
          {TIPO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="card" />)}
        </div>
      ) : authorizations.length === 0 ? (
        <EmptyState
          icon="FileCheck"
          title="No tienes autorizaciones"
          description="Tus autorizaciones médicas aparecerán aquí cuando tu médico las genere"
        />
      ) : (
        <div className="space-y-4">
          {pagination.paginated.map(auth => (
            <AuthorizationCard
              key={auth.id}
              auth={auth}
              expanded={expandedId === auth.id}
              onToggle={() => handleToggle(auth.id)}
            />
          ))}

          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
};

export default AuthorizationsPage;
