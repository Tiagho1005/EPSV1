import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  TIPO_CONFIG, UNIDADES, EMPTY_FORM,
  getRangeDate, getTodayAndTime, prepareChartData,
} from '../utils/healthMetricsConfig';

/**
 * Encapsula toda la lógica de negocio del panel de salud:
 * carga de datos, guardado, borrado y estado de los modales.
 *
 * El componente de página solo recibe este hook y renderiza JSX.
 */
export const useHealthMetrics = () => {
  const { showToast } = useToast();

  // ── Resumen (tarjetas de signos vitales) ──────────────────────
  const [summary, setSummary]               = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // ── Gráfico de tendencia ──────────────────────────────────────
  const [chartTipo, setChartTipo]           = useState('presion_arterial');
  const [chartRange, setChartRange]         = useState('30d');
  const [chartData, setChartData]           = useState([]);
  const [loadingChart, setLoadingChart]     = useState(false);

  // ── Historial ─────────────────────────────────────────────────
  const [history, setHistory]               = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── Modal de registro ─────────────────────────────────────────
  const [showModal, setShowModal]           = useState(false);
  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);

  // ── Confirmación de borrado ───────────────────────────────────
  const [deleteConfirm, setDeleteConfirm]   = useState(null);
  const [deleting, setDeleting]             = useState(false);

  // ── Fetches ───────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      setSummary(await api.getHealthSummary());
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el resumen' });
    } finally {
      setLoadingSummary(false);
    }
  }, [showToast]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      setHistory(await api.getHealthMetrics());
    } catch {
      // silencioso — no interrumpir UX por fallo del historial
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchChart = useCallback(async () => {
    setLoadingChart(true);
    try {
      const { desde, hasta } = getRangeDate(chartRange);
      const data = await api.getHealthMetrics(chartTipo, desde, hasta);
      setChartData(prepareChartData(data, chartTipo));
    } catch {
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
  }, [chartTipo, chartRange]);

  useEffect(() => { fetchSummary(); fetchHistory(); }, [fetchSummary, fetchHistory]);
  useEffect(() => { fetchChart(); }, [fetchChart]);

  // ── Acciones ──────────────────────────────────────────────────

  const openModal = (tipoInicial) => {
    const { fecha, hora } = getTodayAndTime();
    setFormData({ ...EMPTY_FORM, tipo: tipoInicial || 'presion_arterial', fecha, hora });
    setShowModal(true);
  };

  const handleSave = async () => {
    let valorToSend;
    if (formData.tipo === 'presion_arterial') {
      if (!formData.sistolica || !formData.diastolica) {
        showToast({ type: 'warning', title: 'Faltan datos', message: 'Ingresa sistólica y diastólica' });
        return;
      }
      valorToSend = { sistolica: +formData.sistolica, diastolica: +formData.diastolica };
    } else {
      if (formData.valor === '') {
        showToast({ type: 'warning', title: 'Faltan datos', message: 'Ingresa el valor de la medición' });
        return;
      }
      valorToSend = { valor: +formData.valor };
    }

    let notas = formData.notas.trim();
    if (formData.tipo === 'glucosa' && formData.ayunas) {
      notas = ['En ayunas', notas].filter(Boolean).join('. ');
    }

    setSaving(true);
    try {
      await api.addHealthMetric({
        tipo:   formData.tipo,
        valor:  valorToSend,
        unidad: UNIDADES[formData.tipo],
        notas,
        fecha:  formData.fecha,
        hora:   formData.hora,
      });
      showToast({
        type: 'success',
        title: 'Medición guardada',
        message: `${TIPO_CONFIG[formData.tipo].label} registrada correctamente`,
      });
      setShowModal(false);
      fetchSummary();
      fetchHistory();
      fetchChart();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.deleteHealthMetric(id);
      showToast({ type: 'info', title: 'Eliminado', message: 'Medición eliminada' });
      setDeleteConfirm(null);
      fetchSummary();
      fetchHistory();
      fetchChart();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return {
    // Data
    summary, loadingSummary,
    history, loadingHistory,
    chartData, loadingChart,
    // Chart controls
    chartTipo, setChartTipo,
    chartRange, setChartRange,
    // Modal
    showModal, setShowModal,
    formData, setFormData,
    saving,
    // Delete
    deleteConfirm, setDeleteConfirm,
    deleting,
    // Handlers
    openModal,
    handleSave,
    handleDelete,
  };
};
