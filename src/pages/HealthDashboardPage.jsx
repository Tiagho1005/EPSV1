import React from 'react';
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
import { useTheme } from '../context/ThemeContext';
import usePagination from '../hooks/usePagination';
import { formatDate } from '../utils/formatters';
import { useHealthMetrics } from '../hooks/useHealthMetrics';
import {
  TIPO_CONFIG, UNIDADES, REFERENCE_LINES_CONFIG, RANGE_OPTIONS,
  STATUS_LABEL, STATUS_PILL, STATUS_DOT,
  getStatus, formatValue, formatPromedio,
} from '../utils/healthMetricsConfig';

// ─── Sub-componentes presentacionales ────────────────────────────────────────

const SummaryCard = ({ tipo, data, onRegister }) => {
  const cfg    = TIPO_CONFIG[tipo];
  const Icon   = cfg.icon;
  const status = getStatus(tipo, data?.ultimo);
  const hasData = !!data?.ultimo;
  const prom   = formatPromedio(tipo, data);

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

// ─── Página ───────────────────────────────────────────────────────────────────

const HealthDashboardPage = () => {
  const { isDark } = useTheme();
  const {
    summary, loadingSummary,
    history, loadingHistory,
    chartData, loadingChart,
    chartTipo, setChartTipo,
    chartRange, setChartRange,
    showModal, setShowModal,
    formData, setFormData,
    saving,
    deleteConfirm, setDeleteConfirm,
    deleting,
    openModal,
    handleSave,
    handleDelete,
  } = useHealthMetrics();

  const pagination = usePagination(history, 10);
  const axisColor  = isDark ? '#94a3b8' : '#9ca3af';
  const gridColor  = isDark ? '#334155' : '#e5e7eb';

  // Helpers de render (solo UI, sin lógica de negocio)
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

      {/* ── Resumen de signos vitales ── */}
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

      {/* ── Gráfico de tendencia ── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tendencia</h2>
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

        <div className="h-64">
          {loadingChart ? (
            <div className="h-full flex items-center justify-center"><Spinner /></div>
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
                <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} tickLine={{ stroke: axisColor }} axisLine={{ stroke: axisColor }} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={{ stroke: axisColor }} axisLine={{ stroke: axisColor }} domain={['auto', 'auto']} unit={` ${TIPO_CONFIG[chartTipo]?.unit}`} width={65} />
                <Tooltip content={<ChartTooltip tipo={chartTipo} />} />
                {chartTipo === 'presion_arterial' && <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />}
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
                    <Line type="monotone" dataKey="sistolica" name="Sistólica"  stroke={TIPO_CONFIG.presion_arterial.color}  strokeWidth={2} dot={{ r: 4, fill: TIPO_CONFIG.presion_arterial.color  }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolica" name="Diastólica" stroke={TIPO_CONFIG.presion_arterial.color2} strokeWidth={2} dot={{ r: 4, fill: TIPO_CONFIG.presion_arterial.color2 }} activeDot={{ r: 6 }} />
                  </>
                ) : (
                  <Line type="monotone" dataKey="valor" name={TIPO_CONFIG[chartTipo]?.label} stroke={TIPO_CONFIG[chartTipo]?.color} strokeWidth={2} dot={{ r: 4, fill: TIPO_CONFIG[chartTipo]?.color }} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Historial ── */}
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
                    {['Fecha','Hora','Tipo','Valor'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
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
                        <Badge variant={TIPO_CONFIG[m.tipo]?.badgeVariant || 'neutral'}>{TIPO_CONFIG[m.tipo]?.label || m.tipo}</Badge>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {formatValue(m.tipo, m.valor, m.unidad)}
                      </td>
                      <td className="py-3 px-3 text-gray-400 dark:text-gray-500 text-xs max-w-[160px] truncate hidden sm:table-cell">{m.notas || '—'}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {deleteConfirm === m.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">¿Eliminar?</span>
                            <button onClick={() => handleDelete(m.id)} disabled={deleting} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer disabled:opacity-50">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                              <XIcon size={14} />
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4"><Pagination {...pagination} /></div>
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
            <Button variant="primary" loading={saving} onClick={handleSave} className="gradient-primary border-0">Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
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
                  <input type="checkbox" checked={formData.ayunas} onChange={e => setFormData(f => ({ ...f, ayunas: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">¿En ayunas?</span>
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {field('Fecha',
              <input type="date" value={formData.fecha} onChange={e => setFormData(f => ({ ...f, fecha: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            )}
            {field('Hora',
              <input type="time" value={formData.hora} onChange={e => setFormData(f => ({ ...f, hora: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            )}
          </div>

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
