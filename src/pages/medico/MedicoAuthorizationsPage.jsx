import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, Plus, Check, X, AlertTriangle, User, Calendar,
  MapPin, Stethoscope, ClipboardCopy,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate, formatDateShort } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: 'examen',                label: 'Examen de laboratorio' },
  { value: 'procedimiento',         label: 'Procedimiento' },
  { value: 'consulta_especialista', label: 'Consulta con especialista' },
  { value: 'imagen',                label: 'Imagen diagnóstica' },
  { value: 'cirugia',               label: 'Cirugía' },
];

const TIPO_LABELS = {
  examen:                'Examen',
  procedimiento:         'Procedimiento',
  consulta_especialista: 'Consulta Especialista',
  imagen:                'Imagen Diagnóstica',
  cirugia:               'Cirugía',
};

const PRIORIDAD_OPTIONS = [
  { value: 'normal',      label: 'Normal' },
  { value: 'prioritario', label: 'Prioritario' },
  { value: 'urgente',     label: 'Urgente' },
];

const ESTADO_VARIANT = { pendiente: 'warning', aprobada: 'success', rechazada: 'error', vencida: 'neutral' };
const ESTADO_LABEL   = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', vencida: 'Vencida' };

const EMPTY_FORM = {
  userId: '',
  tipo: 'examen',
  descripcion: '',
  diagnosticoRelacionado: '',
  prioridad: 'normal',
  sedeId: '',
  notasMedico: '',
};

// ─── New Authorization Modal ──────────────────────────────────────────────────

const NewAuthorizationModal = ({ isOpen, onClose, onCreated }) => {
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const [form, setForm] = useState(EMPTY_FORM);
  const [patients, setPatients] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Load patients & sedes from appointments when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});

    const loadData = async () => {
      setLoadingPatients(true);
      try {
        const apts = await api.getMedicoAppointments();

        // Unique patients
        const patientMap = new Map();
        apts.forEach(a => {
          if (a.paciente && !patientMap.has(a.user_id)) {
            patientMap.set(a.user_id, {
              id: a.user_id,
              nombreCompleto: a.paciente.nombreCompleto,
              cedula: a.paciente.cedula,
            });
          }
        });
        setPatients([...patientMap.values()]);

        // Unique sedes
        const sedeMap = new Map();
        apts.forEach(a => {
          if (a.sede_id && !sedeMap.has(a.sede_id)) {
            sedeMap.set(a.sede_id, { id: a.sede_id, nombre: a.sede });
          }
        });
        setSedes([...sedeMap.values()]);
      } catch (err) {
        showToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los pacientes' });
      } finally {
        setLoadingPatients(false);
      }
    };

    loadData();
  }, [isOpen, showToast]);

  const validate = () => {
    const e = {};
    if (!form.userId) e.userId = 'Selecciona un paciente';
    if (!form.descripcion.trim()) e.descripcion = 'La descripción es requerida';
    if (!form.diagnosticoRelacionado.trim()) e.diagnosticoRelacionado = 'El diagnóstico es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createAuthorization({
        userId: form.userId,
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        diagnosticoRelacionado: form.diagnosticoRelacionado.trim(),
        prioridad: form.prioridad,
        sedeId: form.sedeId || undefined,
        notasMedico: form.notasMedico.trim() || undefined,
      });
      const autoApproved = form.prioridad === 'urgente' || form.prioridad === 'prioritario';
      showToast({
        type: 'success',
        title: 'Autorización generada',
        message: autoApproved
          ? 'La autorización fue generada y aprobada automáticamente.'
          : 'La autorización fue generada en estado pendiente.',
      });
      addNotification({
        title: 'Autorización generada',
        message: autoApproved
          ? `Autorización para "${form.descripcion.trim()}" aprobada automáticamente.`
          : `Autorización para "${form.descripcion.trim()}" generada. Pendiente de revisión.`,
        type: 'success',
      });
      onCreated();
      onClose();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const autoApproveNote = form.prioridad === 'urgente' || form.prioridad === 'prioritario';

  const inputCls = (field) =>
    `w-full px-3 py-2 rounded-lg text-sm border ${errors[field] ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500`;

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Autorización"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Generar Autorización</Button>
        </>
      }
    >
      {loadingPatients ? (
        <Spinner className="py-8" />
      ) : (
        <div className="space-y-4">
          {/* Paciente */}
          <div>
            <label className={labelCls}>Paciente <span className="text-red-500">*</span></label>
            <select
              value={form.userId}
              onChange={e => set('userId', e.target.value)}
              className={inputCls('userId')}
            >
              <option value="">— Selecciona un paciente —</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto} · CC {p.cedula}
                </option>
              ))}
            </select>
            {errors.userId && <p className="text-xs text-red-500 mt-1">{errors.userId}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label className={labelCls}>Tipo de autorización</label>
            <select
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              className={inputCls('tipo')}
            >
              {TIPO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción <span className="text-red-500">*</span></label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={2}
              placeholder="Ej: Hemograma completo + Perfil lipídico"
              className={`${inputCls('descripcion')} resize-none`}
            />
            {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion}</p>}
          </div>

          {/* Diagnóstico */}
          <div>
            <label className={labelCls}>Diagnóstico relacionado <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.diagnosticoRelacionado}
              onChange={e => set('diagnosticoRelacionado', e.target.value)}
              placeholder="Ej: Hipertensión arterial controlada"
              className={inputCls('diagnosticoRelacionado')}
            />
            {errors.diagnosticoRelacionado && (
              <p className="text-xs text-red-500 mt-1">{errors.diagnosticoRelacionado}</p>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className={labelCls}>Prioridad</label>
            <select
              value={form.prioridad}
              onChange={e => set('prioridad', e.target.value)}
              className={inputCls('prioridad')}
            >
              {PRIORIDAD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {autoApproveNote && (
              <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Con prioridad <strong>{form.prioridad}</strong> la autorización se aprobará automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* Sede */}
          {sedes.length > 0 && (
            <div>
              <label className={labelCls}>Sede</label>
              <select
                value={form.sedeId}
                onChange={e => set('sedeId', e.target.value)}
                className={inputCls('sedeId')}
              >
                <option value="">— Selecciona una sede —</option>
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas médico */}
          <div>
            <label className={labelCls}>Notas médicas <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={form.notasMedico}
              onChange={e => set('notasMedico', e.target.value)}
              rows={2}
              placeholder="Observaciones clínicas relevantes..."
              className={`${inputCls('notasMedico')} resize-none`}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MedicoAuthorizationsPage = () => {
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pendiente');
  const [tipoFilter, setTipoFilter] = useState('');
  const [processing, setProcessing] = useState(null);
  const [notas, setNotas] = useState({});
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMedicoAuthorizations();
      setAuthorizations(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, action) => {
    setProcessing(`${id}-${action}`);
    try {
      await api.processAuthorization(id, action, notas[id] || '');
      showToast({
        type: 'success',
        title: action === 'approve' ? 'Autorización aprobada' : 'Autorización rechazada',
        message: action === 'approve'
          ? 'La autorización fue aprobada por 30 días.'
          : 'La autorización fue rechazada.',
      });
      addNotification({
        title: action === 'approve' ? 'Autorización aprobada' : 'Autorización rechazada',
        message: action === 'approve'
          ? 'La autorización fue aprobada. El paciente será notificado por email.'
          : 'La autorización fue rechazada. El paciente será notificado por email.',
        type: action === 'approve' ? 'success' : 'info',
      });
      setNotas(prev => { const n = { ...prev }; delete n[id]; return n; });
      load();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast({ type: 'success', title: 'Copiado', message: 'Código copiado al portapapeles' });
    }).catch(() => {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo copiar el código' });
    });
  };

  // Filter tabs with counts
  const tabs = [
    { value: 'pendiente', label: 'Pendientes', count: authorizations.filter(a => a.estado === 'pendiente').length },
    { value: 'aprobada',  label: 'Aprobadas' },
    { value: 'rechazada', label: 'Rechazadas' },
    { value: 'all',       label: 'Todas' },
  ];

  const filtered = authorizations.filter(a => {
    if (filter !== 'all' && a.estado !== filter) return false;
    if (tipoFilter && a.tipo !== tipoFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Autorizaciones</h2>
          <p className="text-gray-500 dark:text-gray-400">Genera y gestiona autorizaciones para tus pacientes</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => setShowModal(true)}
        >
          Nueva Autorización
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              filter === tab.value
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 bg-white/30 rounded-full px-1.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tipo filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Tipo:</label>
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
        >
          <option value="">Todos los tipos</option>
          {TIPO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <Spinner className="py-12" />
      ) : error ? (
        <div className="text-error text-center py-8">{error}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay autorizaciones</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(auth => (
            <Card key={auth.id}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Info */}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ESTADO_VARIANT[auth.estado] || 'neutral'} dot>
                      {ESTADO_LABEL[auth.estado] || auth.estado}
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
                    <Badge variant="secondary">{TIPO_LABELS[auth.tipo] || auth.tipo}</Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateShort(auth.fecha_solicitud)}
                    </span>
                  </div>

                  {/* Patient */}
                  {auth.paciente && (
                    <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <User size={15} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="font-semibold">{auth.paciente.nombreCompleto}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">CC {auth.paciente.cedula}</span>
                    </div>
                  )}

                  {/* Description */}
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <Stethoscope size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{auth.descripcion}</span>
                      {auth.diagnostico_relacionado && (
                        <span className="text-gray-400 dark:text-gray-500"> — {auth.diagnostico_relacionado}</span>
                      )}
                    </div>
                  </div>

                  {/* Sede */}
                  {auth.sede_nombre && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <MapPin size={12} />
                      {auth.sede_nombre}
                    </div>
                  )}

                  {/* Approval code */}
                  {auth.estado === 'aprobada' && auth.codigo_autorizacion && (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1.5 w-fit">
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Código:</span>
                      <span className="text-sm font-bold text-green-800 dark:text-green-300 font-mono tracking-wide">
                        {auth.codigo_autorizacion}
                      </span>
                      <button
                        onClick={() => handleCopyCode(auth.codigo_autorizacion)}
                        className="text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors cursor-pointer ml-1"
                        title="Copiar código"
                      >
                        <ClipboardCopy size={13} />
                      </button>
                      {auth.fecha_vencimiento && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                          · Vence {formatDate(auth.fecha_vencimiento)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Auth notes */}
                  {auth.notas_autorizacion && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-500 dark:text-gray-400">Nota: </span>
                      {auth.notas_autorizacion}
                    </div>
                  )}
                </div>

                {/* Actions — only for pending */}
                {auth.estado === 'pendiente' && (
                  <div className="flex flex-col gap-2 sm:min-w-[200px]">
                    <textarea
                      placeholder="Nota de respuesta (opcional)..."
                      value={notas[auth.id] || ''}
                      onChange={e => setNotas(prev => ({ ...prev, [auth.id]: e.target.value }))}
                      rows={2}
                      className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        icon={<Check size={15} />}
                        loading={processing === `${auth.id}-approve`}
                        disabled={!!processing}
                        onClick={() => handleAction(auth.id, 'approve')}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        icon={<X size={15} />}
                        loading={processing === `${auth.id}-reject`}
                        disabled={!!processing}
                        onClick={() => handleAction(auth.id, 'reject')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Authorization Modal */}
      <NewAuthorizationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={load}
      />
    </div>
  );
};

export default MedicoAuthorizationsPage;
