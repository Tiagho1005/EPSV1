import React from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, ChevronDown, ChevronUp, Pill } from 'lucide-react';
import { STATE_VARIANTS, STATE_LABELS } from '../../utils/constants';
import { formatDateShort, formatTime } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import PatientVitalsPanel from '../../components/features/medico/PatientVitalsPanel';
import { useMedicoAppointments } from '../../hooks/useMedicoAppointments';

const MedicoAppointmentsPage = () => {
  const {
    appointments, loading, error,
    dateFilter, setDateFilter,
    statusFilter, setStatusFilter,
    expandedId, handleExpand,
    patientDetail, patientMetrics, loadingPatient,
    completing, form, setForm, submitting,
    openCompleteModal, closeCompleteModal, handleComplete,
    prescribingApt, prescriptionForm, setPrescriptionForm, prescribingSubmitting,
    openPrescribeModal, closePrescribeModal, handlePrescribe,
    today,
  } = useMedicoAppointments();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Mis Consultas</h2>
        <p className="text-gray-500">Gestiona y revisa el historial de tus consultas</p>
      </div>

      {/* Filtros */}
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

      {/* Lista de citas */}
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
              {/* Fila principal */}
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleExpand(apt)}>
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

              {/* Panel expandido */}
              {expandedId === apt.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  {loadingPatient ? (
                    <Spinner className="py-4" />
                  ) : (
                    <div className="space-y-4">
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

                      {patientMetrics !== null && (
                        <PatientVitalsPanel metrics={patientMetrics} />
                      )}

                      {apt.diagnostico && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnóstico</p>
                          <p className="text-gray-800 text-sm">{apt.diagnostico}</p>
                          {apt.notas && <p className="text-gray-600 text-sm mt-1">{apt.notas}</p>}
                        </div>
                      )}

                      {(apt.estado === 'confirmada' || apt.estado === 'completada') && (
                        <div className="flex gap-2 flex-wrap">
                          {apt.estado === 'confirmada' && (
                            <Button size="sm" icon={<CheckCircle size={16} />} onClick={() => openCompleteModal(apt.id)}>
                              Completar Consulta
                            </Button>
                          )}
                          <Button size="sm" variant="outline" icon={<Pill size={16} />} onClick={() => openPrescribeModal(apt)}>
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

      {/* Modal: completar consulta */}
      <Modal
        isOpen={!!completing}
        onClose={closeCompleteModal}
        title="Completar Consulta"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeCompleteModal}>Cancelar</Button>
            <Button onClick={handleComplete} loading={submitting} disabled={!form.diagnostico.trim()} icon={<CheckCircle size={16} />}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            { key: 'diagnostico', label: 'Diagnóstico', required: true, rows: 3, placeholder: 'Describe el diagnóstico del paciente...' },
            { key: 'notas',       label: 'Notas adicionales', rows: 3,    placeholder: 'Indicaciones, recomendaciones, próximos pasos...' },
            { key: 'recetas',     label: 'Recetas (una por línea)', rows: 3, placeholder: 'Ej: Losartán 50mg - 1 tableta cada 12 horas por 30 días' },
            { key: 'examenes',    label: 'Exámenes ordenados (uno por línea)', rows: 3, placeholder: 'Ej: Hemograma completo' },
          ].map(({ key, label, required, rows, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-error">*</span>}
              </label>
              <textarea
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={rows}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal: prescribir medicamento */}
      <Modal
        isOpen={!!prescribingApt}
        onClose={closePrescribeModal}
        title="Prescribir Medicamento"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closePrescribeModal}>Cancelar</Button>
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
            {[
              { key: 'nombre', label: 'Nombre',     required: true, placeholder: 'Ej: Losartán' },
              { key: 'dosis',  label: 'Dosis',      required: true, placeholder: 'Ej: 50mg'     },
            ].map(({ key, label, required, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-error">*</span>}</label>
                <input type="text" value={prescriptionForm[key]} onChange={e => setPrescriptionForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
              <select value={prescriptionForm.presentacion} onChange={e => setPrescriptionForm(f => ({ ...f, presentacion: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                {['Tableta','Cápsula','Jarabe','Inyección','Crema','Otro'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días) <span className="text-error">*</span></label>
              <input type="number" min="1" value={prescriptionForm.duracionDias} onChange={e => setPrescriptionForm(f => ({ ...f, duracionDias: e.target.value }))} placeholder="Ej: 30" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
          </div>

          {[
            { key: 'frecuencia', label: 'Frecuencia', required: true, placeholder: 'Ej: Cada 8 horas'       },
            { key: 'horarios',   label: 'Horarios',   required: true, placeholder: 'Ej: 08:00, 16:00, 00:00' },
          ].map(({ key, label, required, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-error">*</span>}</label>
              <input type="text" value={prescriptionForm[key]} onChange={e => setPrescriptionForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
            <textarea value={prescriptionForm.instrucciones} onChange={e => setPrescriptionForm(f => ({ ...f, instrucciones: e.target.value }))} rows={2} placeholder="Ej: Tomar con alimentos" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={prescriptionForm.renovable} onChange={e => setPrescriptionForm(f => ({ ...f, renovable: e.target.checked }))} className="rounded" />
            Permite renovación
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default MedicoAppointmentsPage;
