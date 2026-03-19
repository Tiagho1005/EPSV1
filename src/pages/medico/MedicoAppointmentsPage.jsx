import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, ChevronDown, ChevronUp, Search, Pill, HeartPulse } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const [form, setForm] = useState({ diagnostico: '', notas: '', recetas: '', examenes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [patientDetail, setPatientDetail] = useState(null);
  const [patientMetrics, setPatientMetrics] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [prescribingApt, setPrescribingApt] = useState(null);
  const [prescribingSubmitting, setPrescribingSubmitting] = useState(false);
  const initialPrescriptionForm = { nombre: '', dosis: '', presentacion: 'Tableta', frecuencia: '', horarios: '', duracionDias: '', instrucciones: '', renovable: false };
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionForm);

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
      setPatientMetrics(null);
      return;
    }
    setExpandedId(apt.id);
    setPatientDetail(null);
    setPatientMetrics(null);
    try {
      setLoadingPatient(true);
      const [detail, metrics] = await Promise.allSettled([
        api.getMedicoPatient(apt.paciente.id),
        api.getMedicoPatientMetrics(apt.paciente.id),
      ]);
      if (detail.status === 'fulfilled') setPatientDetail(detail.value);
      if (metrics.status === 'fulfilled') setPatientMetrics(metrics.value);
      else setPatientMetrics([]);
    } catch {
      // silent
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleComplete = async () => {
    if (!form.diagnostico.trim()) return;
    setSubmitting(true);
    try {
      const recetasArray = form.recetas.split('\n').map(r => r.trim()).filter(Boolean);
      const examenesArray = form.examenes.split('\n').map(e => e.trim()).filter(Boolean);
      await api.completeMedicoAppointment(completing, form.diagnostico, form.notas, recetasArray, examenesArray);
      showToast({ type: 'success', title: 'Cita completada', message: 'El diagnóstico fue registrado exitosamente.' });
      setCompleting(null);
      setForm({ diagnostico: '', notas: '', recetas: '', examenes: '' });
      load();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrescribe = async () => {
    const { nombre, dosis, frecuencia, horarios, duracionDias } = prescriptionForm;
    if (!nombre.trim() || !dosis.trim() || !frecuencia.trim() || !horarios.trim() || !duracionDias) return;
    setPrescribingSubmitting(true);
    try {
      await api.prescribeMedication({
        userId: prescribingApt.paciente.id,
        nombre: nombre.trim(),
        dosis: dosis.trim(),
        presentacion: prescriptionForm.presentacion,
        frecuencia: frecuencia.trim(),
        horarios: horarios.split(',').map(h => h.trim()).filter(Boolean),
        duracionDias: Number(duracionDias),
        instrucciones: prescriptionForm.instrucciones.trim(),
        renovable: prescriptionForm.renovable,
      });
      showToast({ type: 'success', title: 'Medicamento prescrito', message: 'El medicamento fue agregado al paciente.' });
      setPrescribingApt(null);
      setPrescriptionForm(initialPrescriptionForm);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setPrescribingSubmitting(false);
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

                      {/* Health metrics panel */}
                      {patientMetrics !== null && (() => {
                        const byTipo = (tipo) => patientMetrics
                          .filter(m => m.tipo === tipo)
                          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                        const paRecs = byTipo('presion_arterial');
                        const glucRecs = byTipo('glucosa');
                        const pesoRecs = byTipo('peso');
                        const hasAny = paRecs.length > 0 || glucRecs.length > 0 || pesoRecs.length > 0;

                        const getPAStatus = (v) => !v ? 'neutral' : (v.sistolica >= 140 || v.diastolica >= 90) ? 'red' : (v.sistolica >= 130 || v.diastolica >= 85) ? 'yellow' : 'green';
                        const getGlucStatus = (v) => !v ? 'neutral' : (v.valor < 70 || v.valor > 126) ? 'red' : v.valor > 100 ? 'yellow' : 'green';
                        const dotColor = { green: 'bg-green-500', yellow: 'bg-amber-400', red: 'bg-red-500', neutral: 'bg-gray-300' };

                        const chartData = paRecs.slice(0, 10).reverse().map(m => ({
                          fecha: new Date(m.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
                          Sistólica: m.valor.sistolica,
                          Diastólica: m.valor.diastolica,
                        }));

                        return (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <HeartPulse size={14} className="text-primary-500" />
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signos Vitales</p>
                            </div>
                            {!hasAny ? (
                              <p className="text-sm text-gray-400 text-center py-2">El paciente no ha registrado signos vitales</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  {[
                                    { label: 'Presión', recs: paRecs, fmt: v => v ? `${v.sistolica}/${v.diastolica}` : '—', unit: 'mmHg', getStatus: getPAStatus },
                                    { label: 'Glucosa', recs: glucRecs, fmt: v => v ? `${v.valor}` : '—', unit: 'mg/dL', getStatus: getGlucStatus },
                                    { label: 'Peso', recs: pesoRecs, fmt: v => v ? `${v.valor}` : '—', unit: 'kg', getStatus: () => 'neutral' },
                                  ].map(({ label, recs, fmt, unit, getStatus }) => {
                                    const v = recs[0]?.valor;
                                    const status = getStatus(v);
                                    return (
                                      <div key={label} className="text-center bg-white rounded-lg p-2">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status]}`} />
                                          <span className="text-xs text-gray-500">{label}</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-800">{fmt(v)}</p>
                                        {v && <p className="text-[10px] text-gray-400">{unit}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                                {paRecs.length >= 3 && (
                                  <div className="h-36">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="Sistólica" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                                        <Line type="monotone" dataKey="Diastólica" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Existing diagnosis/notes */}
                      {apt.diagnostico && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnóstico</p>
                          <p className="text-gray-800 text-sm">{apt.diagnostico}</p>
                          {apt.notas && <p className="text-gray-600 text-sm mt-1">{apt.notas}</p>}
                        </div>
                      )}

                      {/* Action buttons */}
                      {(apt.estado === 'confirmada' || apt.estado === 'completada') && (
                        <div className="flex gap-2 flex-wrap">
                          {apt.estado === 'confirmada' && (
                            <Button
                              size="sm"
                              icon={<CheckCircle size={16} />}
                              onClick={() => { setCompleting(apt.id); setForm({ diagnostico: '', notas: '', recetas: '', examenes: '' }); }}
                            >
                              Completar Consulta
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Pill size={16} />}
                            onClick={() => { setPrescribingApt(apt); setPrescriptionForm(initialPrescriptionForm); }}
                          >
                            Prescribir Medicamento
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recetas (una por línea)</label>
            <textarea
              value={form.recetas}
              onChange={e => setForm(f => ({ ...f, recetas: e.target.value }))}
              rows={3}
              placeholder="Ej: Losartán 50mg - 1 tableta cada 12 horas por 30 días"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exámenes ordenados (uno por línea)</label>
            <textarea
              value={form.examenes}
              onChange={e => setForm(f => ({ ...f, examenes: e.target.value }))}
              rows={3}
              placeholder="Ej: Hemograma completo"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
        </div>
      </Modal>
      {/* Prescription modal */}
      <Modal
        isOpen={!!prescribingApt}
        onClose={() => { setPrescribingApt(null); setPrescriptionForm(initialPrescriptionForm); }}
        title="Prescribir Medicamento"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPrescribingApt(null)}>Cancelar</Button>
            <Button
              onClick={handlePrescribe}
              loading={prescribingSubmitting}
              disabled={!prescriptionForm.nombre.trim() || !prescriptionForm.dosis.trim() || !prescriptionForm.frecuencia.trim() || !prescriptionForm.horarios.trim() || !prescriptionForm.duracionDias}
              icon={<Pill size={16} />}
            >
              Prescribir
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-error">*</span></label>
              <input
                type="text"
                value={prescriptionForm.nombre}
                onChange={e => setPrescriptionForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Losartán"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosis <span className="text-error">*</span></label>
              <input
                type="text"
                value={prescriptionForm.dosis}
                onChange={e => setPrescriptionForm(f => ({ ...f, dosis: e.target.value }))}
                placeholder="Ej: 50mg"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
              <select
                value={prescriptionForm.presentacion}
                onChange={e => setPrescriptionForm(f => ({ ...f, presentacion: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {['Tableta', 'Cápsula', 'Jarabe', 'Inyección', 'Crema', 'Otro'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días) <span className="text-error">*</span></label>
              <input
                type="number"
                min="1"
                value={prescriptionForm.duracionDias}
                onChange={e => setPrescriptionForm(f => ({ ...f, duracionDias: e.target.value }))}
                placeholder="Ej: 30"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia <span className="text-error">*</span></label>
            <input
              type="text"
              value={prescriptionForm.frecuencia}
              onChange={e => setPrescriptionForm(f => ({ ...f, frecuencia: e.target.value }))}
              placeholder="Ej: Cada 8 horas"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horarios <span className="text-error">*</span></label>
            <input
              type="text"
              value={prescriptionForm.horarios}
              onChange={e => setPrescriptionForm(f => ({ ...f, horarios: e.target.value }))}
              placeholder="Ej: 08:00, 16:00, 00:00"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
            <textarea
              value={prescriptionForm.instrucciones}
              onChange={e => setPrescriptionForm(f => ({ ...f, instrucciones: e.target.value }))}
              rows={2}
              placeholder="Ej: Tomar con alimentos"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={prescriptionForm.renovable}
              onChange={e => setPrescriptionForm(f => ({ ...f, renovable: e.target.checked }))}
              className="rounded"
            />
            Permite renovación
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default MedicoAppointmentsPage;
