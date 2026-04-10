// ============================================================
//  Health Metrics — configuración y helpers puros
//  Sin efectos secundarios, sin estado, sin llamadas a API.
//  Importable por hooks, páginas y componentes por igual.
// ============================================================

import {
  Heart, Droplets, Scale, Activity, Thermometer, Wind,
} from 'lucide-react';

// ── Configuración por tipo ────────────────────────────────────

export const TIPO_CONFIG = {
  presion_arterial:    { label: 'Presión Arterial',   icon: Heart,       unit: 'mmHg', color: '#8B5CF6', color2: '#06B6D4', badgeVariant: 'primary'   },
  glucosa:             { label: 'Glucosa',             icon: Droplets,    unit: 'mg/dL',color: '#06B6D4',                    badgeVariant: 'info'      },
  peso:                { label: 'Peso',                icon: Scale,       unit: 'kg',   color: '#8B5CF6',                    badgeVariant: 'secondary' },
  frecuencia_cardiaca: { label: 'Frecuencia Cardíaca', icon: Activity,    unit: 'bpm',  color: '#EF4444',                    badgeVariant: 'error'     },
  temperatura:         { label: 'Temperatura',         icon: Thermometer, unit: '°C',   color: '#F59E0B',                    badgeVariant: 'warning'   },
  oximetria:           { label: 'Oximetría',           icon: Wind,        unit: '%',    color: '#10B981',                    badgeVariant: 'success'   },
};

export const UNIDADES = {
  presion_arterial: 'mmHg', glucosa: 'mg/dL', peso: 'kg',
  frecuencia_cardiaca: 'bpm', temperatura: '°C', oximetria: '%',
};

export const REFERENCE_LINES_CONFIG = {
  presion_arterial:    [{ y: 140, label: 'HTA sis.',    stroke: '#ef4444', sd: '5 3' }, { y: 90,  label: 'HTA dia.',    stroke: '#f97316', sd: '5 3' }],
  glucosa:             [{ y: 126, label: 'Límite',      stroke: '#ef4444', sd: '5 3' }, { y: 100, label: 'Normal',      stroke: '#22c55e', sd: '4 2' }, { y: 70, label: 'Mín.', stroke: '#f97316', sd: '5 3' }],
  frecuencia_cardiaca: [{ y: 100, label: 'Máx. normal', stroke: '#ef4444', sd: '5 3' }, { y: 60,  label: 'Mín. normal', stroke: '#f97316', sd: '5 3' }],
  temperatura:         [{ y: 38,  label: 'Fiebre',      stroke: '#ef4444', sd: '5 3' }, { y: 37.5,label: 'Subfebril',  stroke: '#f97316', sd: '5 3' }],
  oximetria:           [{ y: 95,  label: 'Mín. normal', stroke: '#f97316', sd: '5 3' }, { y: 90,  label: 'Crítico',    stroke: '#ef4444', sd: '5 3' }],
  peso:                [],
};

export const RANGE_OPTIONS = [
  { value: '7d',  label: '7 días'  },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

export const EMPTY_FORM = {
  tipo: 'presion_arterial', sistolica: '', diastolica: '',
  valor: '', ayunas: false, notas: '',
};

// ── Status visual ─────────────────────────────────────────────

export const STATUS_LABEL = { success: 'Normal', warning: 'Atención', error: 'Alto', neutral: '—' };
export const STATUS_PILL  = {
  success: 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  warning: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  error:   'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  neutral: 'text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400',
};
export const STATUS_DOT = {
  success: 'bg-green-500', warning: 'bg-amber-500', error: 'bg-red-500', neutral: 'bg-gray-400',
};

// ── Funciones puras ───────────────────────────────────────────

/**
 * Determina el estado clínico de una medición.
 * @returns {'success'|'warning'|'error'|'neutral'}
 */
export const getStatus = (tipo, ultimo) => {
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

/** Formatea el valor de una medición para mostrar en UI. */
export const formatValue = (tipo, valor, unidad) => {
  if (!valor) return '—';
  if (tipo === 'presion_arterial') return `${valor.sistolica}/${valor.diastolica} ${unidad}`;
  return `${valor.valor} ${unidad}`;
};

/** Formatea el promedio de un resumen para mostrar en UI. */
export const formatPromedio = (tipo, data) => {
  if (!data?.promedio) return null;
  if (tipo === 'presion_arterial') return `${data.promedio.sistolica}/${data.promedio.diastolica} mmHg`;
  return `${data.promedio} ${TIPO_CONFIG[tipo].unit}`;
};

/** Calcula las fechas de inicio y fin para un rango dado. */
export const getRangeDate = (range) => {
  const now  = new Date();
  const from = new Date(now);
  if (range === '7d')       from.setDate(from.getDate() - 7);
  else if (range === '30d') from.setDate(from.getDate() - 30);
  else                      from.setDate(from.getDate() - 90);
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { desde: fmt(from), hasta: fmt(now) };
};

/** Devuelve la fecha y hora actuales formateadas para el formulario. */
export const getTodayAndTime = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    fecha: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    hora:  `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

/** Transforma una lista de mediciones al formato esperado por Recharts. */
export const prepareChartData = (metrics, tipo) =>
  [...metrics]
    .sort((a, b) =>
      a.fecha !== b.fecha ? a.fecha.localeCompare(b.fecha) : a.hora.localeCompare(b.hora)
    )
    .map(m => ({
      label:  m.fecha.slice(5).replace('-', '/'),
      fecha:  m.fecha,
      hora:   m.hora,
      notas:  m.notas,
      ...(tipo === 'presion_arterial'
        ? { sistolica: m.valor.sistolica, diastolica: m.valor.diastolica }
        : { valor: m.valor.valor }),
    }));
