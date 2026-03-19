import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart, Droplets, Scale, Activity, Thermometer, Wind,
  Plus, Trash2, TrendingUp, Check, X as XIcon,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import usePagination from '../hooks/usePagination';
import { formatDate } from '../utils/formatters';

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG = {
  presion_arterial:   { label: 'Presión Arterial',   icon: Heart,        unit: 'mmHg', color: '#8B5CF6', color2: '#06B6D4', badgeVariant: 'primary' },
  glucosa:            { label: 'Glucosa',             icon: Droplets,     unit: 'mg/dL',color: '#06B6D4',                   badgeVariant: 'info'    },
  peso:               { label: 'Peso',                icon: Scale,        unit: 'kg',   color: '#8B5CF6',                   badgeVariant: 'secondary'},
  frecuencia_cardiaca:{ label: 'Frecuencia Cardíaca', icon: Activity,     unit: 'bpm',  color: '#EF4444',                   badgeVariant: 'error'   },
  temperatura:        { label: 'Temperatura',         icon: Thermometer,  unit: '°C',   color: '#F59E0B',                   badgeVariant: 'warning' },
  oximetria:          { label: 'Oximetría',           icon: Wind,         unit: '%',    color: '#10B981',                   badgeVariant: 'success' },
};

const UNIDADES = {
  presion_arterial: 'mmHg', glucosa: 'mg/dL', peso: 'kg',
  frecuencia_cardiaca: 'bpm', temperatura: '°C', oximetria: '%',
};

const REFERENCE_LINES_CONFIG = {
  presion_arterial:   [{ y: 140, label: 'HTA sis.',   stroke: '#ef4444', sd: '5 3' }, { y: 90, label: 'HTA dia.', stroke: '#f97316', sd: '5 3' }],
  glucosa:            [{ y: 126, label: 'Límite',     stroke: '#ef4444', sd: '5 3' }, { y: 100, label: 'Normal',   stroke: '#22c55e', sd: '4 2' }, { y: 70, label: 'Mín.',  stroke: '#f97316', sd: '5 3' }],
  frecuencia_cardiaca:[{ y: 100, label: 'Máx. normal',stroke: '#ef4444', sd: '5 3' }, { y: 60,  label: 'Mín. normal', stroke: '#f97316', sd: '5 3' }],
  temperatura:        [{ y: 38,  label: 'Fiebre',     stroke: '#ef4444', sd: '5 3' }, { y: 37.5,label: 'Subfebril', stroke: '#f97316', sd: '5 3' }],
  oximetria:          [{ y: 95,  label: 'Mín. normal',stroke: '#f97316', sd: '5 3' }, { y: 90,  label: 'Crítico',  stroke: '#ef4444', sd: '5 3' }],
  peso:               [],
};

const RANGE_OPTIONS = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatus = (tipo, ultimo) => {
  if (!ultimo) return 'neutral';
  const v = ultimo.valor;
  switch (tipo) {
    case 'presion_arterial':
      if (v.sistolica >= 140 || v.diastolica >= 90) return 'error';
      if (v.sistolica >= 130 || v.diastolica >= 85) return 'warning';
      return 'success';
    case 'glucosa': {
      const g = v.valor;
      if (g < 70 || g > 126) return 'error';
      if (g > 100) return 'warning';
      return 'success';
    }
    case 'frecuencia_cardiaca': {
      const fc = v.valor;
      if (fc < 50 || fc > 110) return 'error';
      if (fc < 60 || fc > 100) return 'warning';
      return 'success';
    }
    case 'temperatura': {
      const t = v.valor;
      if (t < 35.5 || t > 38) return 'error';
      if (t > 37.5) return 'warning';
      return 'success';
    }
    case 'oximetria': {
      const o = v.valor;
      if (o < 90) return 'error';
      if (o < 95) return 'warning';
      return 'success';
    }
    default: return 'neutral';
  }
};

const formatValue = (tipo, valor, unidad) => {
  if (!valor) return '—';
  if (tipo === 'presion_arterial') return `${valor.sistolica}/${valor.diastolica} ${unidad}`;
  return `${valor.valor} ${unidad}`;
};

const formatPromedio = (tipo, data) => {
  if (!data?.promedio) return null;
  if (tipo === 'presion_arterial') return `${data.promedio.sistolica}/${data.promedio.diastolica} mmHg`;
  return `${data.promedio} ${TIPO_CONFIG[tipo].unit}`;
};

const getRangeDate = (range) => {
  const now = new Date();
  const from = new Date(now);
  if (range === '7d') from.setDate(from.getDate() - 7);
  else if (range === '30d') from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { desde: fmt(from), hasta: fmt(now) };
};

const getTodayAndTime = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    fecha: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

const prepareChartData = (metrics, tipo) =>
  [...metrics]
    .sort((a, b) => a.fecha !== b.fecha ? a.fecha.localeCompare(b.fecha) : a.hora.localeCompare(b.hora))
    .map(m => ({
      label: m.fecha.slice(5).replace('-', '/'),
      fecha: m.fecha,
      hora: m.hora,
      notas: m.notas,
      ...(tipo === 'presion_arterial'
        ? { sistolica: m.valor.sistolica, diastolica: m.valor.diastolica }
        : { valor: m.valor.valor }),
    }));

// ─── Summary card ─────────────────────────────────────────────────────────────

const STATUS_LABEL = { success: 'Normal', warning: 'Atención', error: 'Alto', neutral: '—' };
const STATUS_PILL  = {
  success: 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  warning: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  error:   'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  neutral: 'text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400',
};
const STATUS_DOT = { success: 'bg-green-500', warning: 'bg-amber-500', error: 'bg-red-500', neutral: 'bg-gray-400' };

const SummaryCard = ({ tipo, data, onRegister }) => {
  const cfg = TIPO_CONFIG[tipo];
  const Icon = cfg.icon;
  const status = getStatus(tipo, data?.ultimo);
  const hasData = !!data?.ultimo;
  const prom = formatPromedio(tipo, data);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        {hasData && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_PILL[status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{cfg.label}</p>

      {hasData ? (
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {formatValue(tipo, data.ultimo.valor, data.ultimo.unidad)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatDate(data.ultimo.fecha)} · {data.ultimo.hora}
          </p>
          {prom && (
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1.5 font-medium">
              Promedio 30d: {prom}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold text-gray-200 dark:text-slate-700">—</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sin registros</p>
          <button
            onClick={onRegister}
            className="mt-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
          >
            + Registrar
          </button>
        </div>
      )}
    </Card>
  );
};

// ─── Custom Recharts tooltip ───────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, tipo }) => {
  if (!active || !payload?.length) return null;
  const cfg = TIPO_CONFIG[tipo];
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg p-3 text-sm min-w-[130px]">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
        {payload[0]?.payload?.fecha} {payload[0]?.payload?.hora}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value} {cfg?.unit}
        </p>
      ))}
      {payload[0]?.payload?.notas && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
          {payload[0].payload.notas}
        </p>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { tipo: 'presion_arterial', sistolica: '', diastolica: '', valor: '', ayunas: false, notas: '' };

const HealthDashboardPage = () => {
  const { showToast } = useToast();
  const { isDark } = useTheme();

  const [summary, setSummary]           = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [chartTipo, setChartTipo]       = useState('presion_arterial');
  const [chartRange, setChartRange]     = useState('30d');
  const [chartData, setChartData]       = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [showModal, setShowModal]       = useState(false);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const pagination = usePagination(history, 10);
  const axisColor = isDark ? '#94a3b8' : '#9ca3af';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await api.getHealthSummary();
      setSummary(data);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el resumen' });
    } finally {
      setLoadingSummary(false);
    }
  }, [showToast]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getHealthMetrics();
      setHistory(data);
    } catch {
      // silencioso
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

  // ── Save ───────────────────────────────────────────────────────────────────

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
        tipo: formData.tipo,
        valor: valorToSend,
        unidad: UNIDADES[formData.tipo],
        notas,
        fecha: formData.fecha,
        hora: formData.hora,
      });
      showToast({ type: 'success', title: 'Medición guardada', message: `${TIPO_CONFIG[formData.tipo].label} registrada correctamente` });
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

  // ── Delete ─────────────────────────────────────────────────────────────────

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

  // ── Form field helper ──────────────────────────────────────────────────────

  const field = (label, children) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );

  const numInput = (name, placeholder, step = '1') => (
    <input
      type="number"
      step={step}
      min="0"
      placeholder={placeholder}
      value={formData[name]}
      onChange={e => setFormData(f => ({ ...f, [name]: e.target.value }))}
      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
    />
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Seguimiento de Salud</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Registra y monitorea tus signos vitales</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          className="gradient-primary border-0 flex-shrink-0"
          onClick={() => openModal()}
        >
          Registrar Medición
        </Button>
      </div>

      {/* ── Sección 1: Resumen ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={15} /> Signos Vitales
        </h2>
        {loadingSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(TIPO_CONFIG).map(tipo => (
              <SummaryCard
                key={tipo}
                tipo={tipo}
                data={summary?.[tipo]}
                onRegister={() => openModal(tipo)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sección 2: Gráfico de tendencia ── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tendencia</h2>

          {/* Range selector */}
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setChartRange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  chartRange === opt.value
                    ? 'gradient-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={tipo}
                onClick={() => setChartTipo(tipo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  chartTipo === tipo
                    ? 'gradient-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <Icon size={13} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-64">
          {loadingChart ? (
            <div className="h-full flex items-center justify-center">
              <Spinner />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TrendingUp size={32} className="text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos en este período</p>
                <button
                  onClick={() => openModal(chartTipo)}
                  className="mt-2 text-xs text-primary-500 hover:underline cursor-pointer"
                >
                  Registrar primera medición
                </button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickLine={{ stroke: axisColor }}
                  axisLine={{ stroke: axisColor }}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickLine={{ stroke: axisColor }}
                  axisLine={{ stroke: axisColor }}
                  domain={['auto', 'auto']}
                  unit={` ${TIPO_CONFIG[chartTipo]?.unit}`}
                  width={65}
                />
                <Tooltip content={<ChartTooltip tipo={chartTipo} />} />
                {chartTipo === 'presion_arterial' && <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />}

                {/* Reference lines */}
                {(REFERENCE_LINES_CONFIG[chartTipo] || []).map(ref => (
                  <ReferenceLine
                    key={ref.y}
                    y={ref.y}
                    label={{ value: ref.label, fill: ref.stroke, fontSize: 10, position: 'insideTopRight' }}
                    stroke={ref.stroke}
                    strokeDasharray={ref.sd}
                    strokeWidth={1.5}
                  />
                ))}

                {chartTipo === 'presion_arterial' ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="sistolica"
                      name="Sistólica"
                      stroke={TIPO_CONFIG.presion_arterial.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: TIPO_CONFIG.presion_arterial.color }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolica"
                      name="Diastólica"
                      stroke={TIPO_CONFIG.presion_arterial.color2}
                      strokeWidth={2}
                      dot={{ r: 4, fill: TIPO_CONFIG.presion_arterial.color2 }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="valor"
                    name={TIPO_CONFIG[chartTipo]?.label}
                    stroke={TIPO_CONFIG[chartTipo]?.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: TIPO_CONFIG[chartTipo]?.color }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Sección 4: Historial ── */}
      <Card>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Historial de Mediciones</h2>

        {loadingHistory ? (
          <Skeleton variant="table" lines={6} />
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sin mediciones registradas</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hora</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Notas</th>
                    <th className="py-2.5 px-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {pagination.paginated.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDate(m.fecha)}</td>
                      <td className="py-3 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.hora}</td>
                      <td className="py-3 px-3">
                        <Badge variant={TIPO_CONFIG[m.tipo]?.badgeVariant || 'neutral'}>
                          {TIPO_CONFIG[m.tipo]?.label || m.tipo}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {formatValue(m.tipo, m.valor, m.unidad)}
                      </td>
                      <td className="py-3 px-3 text-gray-400 dark:text-gray-500 text-xs max-w-[160px] truncate hidden sm:table-cell">
                        {m.notas || '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {deleteConfirm === m.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">¿Eliminar?</span>
                            <button
                              onClick={() => handleDelete(m.id)}
                              disabled={deleting}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <XIcon size={14} />
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(m.id)}
                            className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination {...pagination} />
            </div>
          </>
        )}
      </Card>

      {/* ── Modal: Registrar Medición ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Medición"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              className="gradient-primary border-0"
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tipo */}
          {field('Tipo de medición',
            <select
              value={formData.tipo}
              onChange={e => setFormData(f => ({ ...f, tipo: e.target.value, valor: '', sistolica: '', diastolica: '', ayunas: false }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
            >
              {Object.entries(TIPO_CONFIG).map(([v, cfg]) => (
                <option key={v} value={v}>{cfg.label} ({cfg.unit})</option>
              ))}
            </select>
          )}

          {/* Dynamic value fields */}
          {formData.tipo === 'presion_arterial' ? (
            <div className="grid grid-cols-2 gap-3">
              {field('Sistólica (mmHg)', numInput('sistolica', 'ej. 120'))}
              {field('Diastólica (mmHg)', numInput('diastolica', 'ej. 80'))}
            </div>
          ) : (
            <div>
              {field(`Valor (${UNIDADES[formData.tipo]})`, numInput('valor', `ej. ${formData.tipo === 'temperatura' ? '36.5' : formData.tipo === 'peso' ? '65.0' : '—'}`, formData.tipo === 'temperatura' || formData.tipo === 'peso' ? '0.1' : '1'))}
              {formData.tipo === 'glucosa' && (
                <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ayunas}
                    onChange={e => setFormData(f => ({ ...f, ayunas: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary-600"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">¿En ayunas?</span>
                </label>
              )}
            </div>
          )}

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            {field('Fecha',
              <input
                type="date"
                value={formData.fecha}
                onChange={e => setFormData(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            )}
            {field('Hora',
              <input
                type="time"
                value={formData.hora}
                onChange={e => setFormData(f => ({ ...f, hora: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            )}
          </div>

          {/* Notas */}
          {field('Notas (opcional)',
            <textarea
              value={formData.notas}
              onChange={e => setFormData(f => ({ ...f, notas: e.target.value }))}
              placeholder="Ej. En reposo, después del ejercicio, en ayunas..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
          )}
        </div>
      </Modal>

    </div>
  );
};

export default HealthDashboardPage;
