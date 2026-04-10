import React from 'react';
import { HeartPulse } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Helpers de dominio (sin estado ni efectos) ────────────────

const byTipo = (metrics, tipo) =>
  metrics
    .filter(m => m.tipo === tipo)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const getPAStatus = (v) =>
  !v ? 'neutral'
  : (v.sistolica >= 140 || v.diastolica >= 90) ? 'red'
  : (v.sistolica >= 130 || v.diastolica >= 85) ? 'yellow'
  : 'green';

const getGlucStatus = (v) =>
  !v ? 'neutral'
  : (v.valor < 70 || v.valor > 126) ? 'red'
  : v.valor > 100 ? 'yellow'
  : 'green';

const DOT_COLOR = {
  green: 'bg-green-500', yellow: 'bg-amber-400',
  red:   'bg-red-500',   neutral: 'bg-gray-300',
};

const VITALS = [
  { label: 'Presión', tipoKey: 'presion_arterial', fmt: v => v ? `${v.sistolica}/${v.diastolica}` : '—', unit: 'mmHg', getStatus: getPAStatus  },
  { label: 'Glucosa', tipoKey: 'glucosa',           fmt: v => v ? `${v.valor}` : '—',                    unit: 'mg/dL', getStatus: getGlucStatus },
  { label: 'Peso',    tipoKey: 'peso',              fmt: v => v ? `${v.valor}` : '—',                    unit: 'kg',    getStatus: () => 'neutral' },
];

// ── Componente ────────────────────────────────────────────────

/**
 * Panel de signos vitales del paciente para la vista del médico.
 * Recibe el array raw de métricas y se encarga de filtrarlo y presentarlo.
 *
 * @param {{ metrics: Array }} props
 */
const PatientVitalsPanel = ({ metrics }) => {
  const paRecs   = byTipo(metrics, 'presion_arterial');
  const glucRecs = byTipo(metrics, 'glucosa');
  const pesoRecs = byTipo(metrics, 'peso');
  const hasAny   = paRecs.length > 0 || glucRecs.length > 0 || pesoRecs.length > 0;

  const recsMap = {
    presion_arterial: paRecs,
    glucosa:          glucRecs,
    peso:             pesoRecs,
  };

  const chartData = paRecs.slice(0, 10).reverse().map(m => ({
    fecha:     new Date(m.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
    Sistólica: m.valor.sistolica,
    Diastólica:m.valor.diastolica,
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
            {VITALS.map(({ label, tipoKey, fmt, unit, getStatus }) => {
              const recs   = recsMap[tipoKey];
              const v      = recs[0]?.valor;
              const status = getStatus(v);
              return (
                <div key={label} className="text-center bg-white rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[status]}`} />
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
                  <Line type="monotone" dataKey="Sistólica"  stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Diastólica" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PatientVitalsPanel;
