import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const INITIAL_PRESCRIPTION = {
  nombre: '', dosis: '', presentacion: 'Tableta',
  frecuencia: '', horarios: '', duracionDias: '',
  instrucciones: '', renovable: false,
};

const EMPTY_COMPLETION_FORM = { diagnostico: '', notas: '', recetas: '', examenes: '' };

/**
 * Encapsula toda la lógica de la página de consultas del médico:
 * carga de citas, expansión de filas, completar consulta y prescribir medicamentos.
 */
export const useMedicoAppointments = () => {
  const { showToast } = useToast();

  // ── Lista de citas ────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // ── Filtros ───────────────────────────────────────────────────
  const [dateFilter, setDateFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Expansión de fila con datos del paciente ──────────────────
  const [expandedId, setExpandedId]         = useState(null);
  const [patientDetail, setPatientDetail]   = useState(null);
  const [patientMetrics, setPatientMetrics] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // ── Modal: completar consulta ─────────────────────────────────
  const [completing, setCompleting]   = useState(null);
  const [form, setForm]               = useState(EMPTY_COMPLETION_FORM);
  const [submitting, setSubmitting]   = useState(false);

  // ── Modal: prescribir medicamento ─────────────────────────────
  const [prescribingApt, setPrescribingApt]             = useState(null);
  const [prescriptionForm, setPrescriptionForm]         = useState(INITIAL_PRESCRIPTION);
  const [prescribingSubmitting, setPrescribingSubmitting] = useState(false);

  // ── Carga de citas ────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMedicoAppointments(dateFilter || undefined, statusFilter || undefined);
      setAppointments(res);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Expansión de fila ─────────────────────────────────────────

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
    setLoadingPatient(true);
    try {
      const [detail, metrics] = await Promise.allSettled([
        api.getMedicoPatient(apt.paciente.id),
        api.getMedicoPatientMetrics(apt.paciente.id),
      ]);
      if (detail.status  === 'fulfilled') setPatientDetail(detail.value);
      if (metrics.status === 'fulfilled') setPatientMetrics(metrics.value);
      else setPatientMetrics([]);
    } catch {
      // silencioso
    } finally {
      setLoadingPatient(false);
    }
  };

  // ── Completar consulta ────────────────────────────────────────

  const openCompleteModal = (aptId) => {
    setCompleting(aptId);
    setForm(EMPTY_COMPLETION_FORM);
  };

  const closeCompleteModal = () => {
    setCompleting(null);
    setForm(EMPTY_COMPLETION_FORM);
  };

  const handleComplete = async () => {
    if (!form.diagnostico.trim()) return;
    setSubmitting(true);
    try {
      const recetasArray  = form.recetas.split('\n').map(r => r.trim()).filter(Boolean);
      const examenesArray = form.examenes.split('\n').map(e => e.trim()).filter(Boolean);
      await api.completeMedicoAppointment(completing, form.diagnostico, form.notas, recetasArray, examenesArray);
      showToast({ type: 'success', title: 'Cita completada', message: 'El diagnóstico fue registrado exitosamente.' });
      closeCompleteModal();
      load();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Prescribir medicamento ────────────────────────────────────

  const openPrescribeModal = (apt) => {
    setPrescribingApt(apt);
    setPrescriptionForm(INITIAL_PRESCRIPTION);
  };

  const closePrescribeModal = () => {
    setPrescribingApt(null);
    setPrescriptionForm(INITIAL_PRESCRIPTION);
  };

  const handlePrescribe = async () => {
    const { nombre, dosis, frecuencia, horarios, duracionDias } = prescriptionForm;
    if (!nombre.trim() || !dosis.trim() || !frecuencia.trim() || !horarios.trim() || !duracionDias) return;
    setPrescribingSubmitting(true);
    try {
      await api.prescribeMedication({
        userId:       prescribingApt.paciente.id,
        nombre:       nombre.trim(),
        dosis:        dosis.trim(),
        presentacion: prescriptionForm.presentacion,
        frecuencia:   frecuencia.trim(),
        horarios:     horarios.split(',').map(h => h.trim()).filter(Boolean),
        duracionDias: Number(duracionDias),
        instrucciones:prescriptionForm.instrucciones.trim(),
        renovable:    prescriptionForm.renovable,
      });
      showToast({ type: 'success', title: 'Medicamento prescrito', message: 'El medicamento fue agregado al paciente.' });
      closePrescribeModal();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setPrescribingSubmitting(false);
    }
  };

  return {
    // Lista
    appointments, loading, error,
    // Filtros
    dateFilter, setDateFilter,
    statusFilter, setStatusFilter,
    // Expansión
    expandedId,
    patientDetail, patientMetrics, loadingPatient,
    // Completar
    completing, form, setForm, submitting,
    openCompleteModal, closeCompleteModal, handleComplete,
    // Prescribir
    prescribingApt, prescriptionForm, setPrescriptionForm, prescribingSubmitting,
    openPrescribeModal, closePrescribeModal, handlePrescribe,
    // Utils
    today: new Date().toISOString().split('T')[0],
  };
};
