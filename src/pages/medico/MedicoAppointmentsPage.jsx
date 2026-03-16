import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { api } from '../../services/api';
import { STATE_VARIANTS, STATE_LABELS } from '../../utils/constants';
import { formatDateShort, formatTime } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';

const MedicoAppointmentsPage = () => {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [completing, setCompleting] = useState(null); // appointment id being completed
  const [form, setForm] = useState({ diagnostico: '', notas: '' });
  const [submitting, setSubmitting] = useState(false);
  const [patientDetail, setPatientDetail] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMedicoAppointments(dateFilter || undefined, statusFilter || undefined);
      setAppointments(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleExpand = async (apt) => {
    if (expandedId === apt.id) {
      setExpandedId(null);
      setPatientDetail(null);
      return;
    }
    setExpandedId(apt.id);
    setPatientDetail(null);
    try {
      setLoadingPatient(true);
      const detail = await api.getMedicoPatient(apt.paciente.id);
      setPatientDetail(detail);
    } catch {
      // silent — patient detail is optional
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleComplete = async () => {
    if (!form.diagnostico.trim()) return;
    setSubmitting(true);
    try {
      await api.completeMedicoAppointment(completing, form.diagnostico, form.notas);
      showToast({ type: 'success', title: 'Cita completada', message: 'El diagnóstico fue registrado exitosamente.' });
      setCompleting(null);
      setForm({ diagnostico: '', notas: '' });
      load();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Mis Consultas</h2>
        <p className="text-gray-500">Gestiona y revisa el historial de tus consultas</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Fecha:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs text-primary-600 hover:underline">Limpiar</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Estado:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">Todos</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDateFilter(today)}>Hoy</Button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Spinner className="py-12" />
      ) : error ? (
        <div className="text-error text-center py-8">{error}</div>
      ) : appointments.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay consultas</p>
            <p className="text-sm">Prueba con otros filtros</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <Card key={apt.id} className="overflow-hidden">
              {/* Main row */}
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => handleExpand(apt)}
              >
                <div className="text-center w-16 flex-shrink-0">
                  <p className="font-bold text-primary-600">{formatTime(apt.hora)}</p>
                  <p className="text-xs text-gray-500">{formatDateShort(apt.fecha)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-gray-400 flex-shrink-0" />
                    <p className="font-semibold text-gray-800 truncate">{apt.paciente.nombreCompleto}</p>
                    <span className="text-xs text-gray-400">CC {apt.paciente.cedula}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={13} />{apt.especialidad_nombre}</span>
                    <span className="flex items-center gap-1"><MapPin size={13} />{apt.sede}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={STATE_VARIANTS[apt.estado]}>{STATE_LABELS[apt.estado]}</Badge>
                  {expandedId === apt.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === apt.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  {loadingPatient ? (
                    <Spinner className="py-4" />
                  ) : (
                    <div className="space-y-4">
                      {/* Patient info */}
                      {patientDetail && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Teléfono</p>
                            <p className="font-medium text-gray-800">{patientDetail.paciente.celular || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ciudad</p>
                            <p className="font-medium text-gray-800">{patientDetail.paciente.municipio || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Consultas previas</p>
                            <p className="font-medium text-gray-800">{patientDetail.citas.filter(c => c.estado === 'completada').length}</p>
                          </div>
                        </div>
                      )}

                      {/* Existing diagnosis/notes */}
                      {apt.diagnostico && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnóstico</p>
                          <p className="text-gray-800 text-sm">{apt.diagnostico}</p>
                          {apt.notas && <p className="text-gray-600 text-sm mt-1">{apt.notas}</p>}
                        </div>
                      )}

                      {/* Complete button */}
                      {apt.estado === 'confirmada' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            icon={<CheckCircle size={16} />}
                            onClick={() => { setCompleting(apt.id); setForm({ diagnostico: '', notas: '' }); }}
                          >
                            Completar Consulta
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Complete modal */}
      <Modal
        isOpen={!!completing}
        onClose={() => { setCompleting(null); setForm({ diagnostico: '', notas: '' }); }}
        title="Completar Consulta"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleting(null)}>Cancelar</Button>
            <Button
              onClick={handleComplete}
              loading={submitting}
              disabled={!form.diagnostico.trim()}
              icon={<CheckCircle size={16} />}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnóstico <span className="text-error">*</span>
            </label>
            <textarea
              value={form.diagnostico}
              onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))}
              rows={3}
              placeholder="Describe el diagnóstico del paciente..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={3}
              placeholder="Indicaciones, recomendaciones, próximos pasos..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MedicoAppointmentsPage;
