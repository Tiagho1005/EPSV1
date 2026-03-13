import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

const toDate = (str) => (str ? new Date(str + 'T00:00:00') : null);

// view: 'days' | 'months' | 'years'
const DatePicker = ({
  label,
  name,
  value = '',
  onChange,
  onBlur,
  min,
  max,
  required = false,
  disabled = false,
  error,
  touched,
  placeholder = 'dd/mm/aaaa',
  className = '',
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initView = () => {
    if (value) {
      const [y, m] = value.split('-');
      return { year: +y, month: +m - 1 };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(initView);
  const [mode, setMode] = useState('days'); // 'days' | 'months' | 'years'
  const [decadeStart, setDecadeStart] = useState(() => Math.floor((initView().year) / 12) * 12);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-');
      setTimeout(() => setView({ year: +y, month: +m - 1 }), 0);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setMode('days');
        onBlur?.({ target: { name, value } });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, name, value, onBlur]);

  const minDate = toDate(min);
  const maxDate = toDate(max);
  const selectedDate = toDate(value);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const offset = (firstDow + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getDateFromDay = (day) => (day ? new Date(view.year, view.month, day) : null);
  const isDayDisabled = (day) => {
    const d = getDateFromDay(day);
    if (!d) return true;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };
  const isDaySelected = (day) => {
    if (!day || !selectedDate) return false;
    return getDateFromDay(day).getTime() === selectedDate.getTime();
  };
  const isDayToday = (day) => {
    if (!day) return false;
    return getDateFromDay(day).getTime() === today.getTime();
  };

  const selectDay = (day) => {
    if (!day || isDayDisabled(day)) return;
    const m = String(view.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${view.year}-${m}-${d}`;
    onChange({ target: { name, value: dateStr } });
    setOpen(false);
    setMode('days');
    onBlur?.({ target: { name, value: dateStr } });
  };

  const goToToday = () => {
    const canSelect = (!minDate || today >= minDate) && (!maxDate || today <= maxDate);
    if (canSelect) {
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dateStr = `${today.getFullYear()}-${m}-${d}`;
      onChange({ target: { name, value: dateStr } });
      setOpen(false);
      setMode('days');
      onBlur?.({ target: { name, value: dateStr } });
    } else {
      setView({ year: today.getFullYear(), month: today.getMonth() });
      setMode('days');
    }
  };

  // ── Month navigation ───────────────────────────────────────────────────────
  const prevMonth = () => setView(v => {
    let m = v.month - 1, y = v.year;
    if (m < 0) { m = 11; y--; }
    return { year: y, month: m };
  });
  const nextMonth = () => setView(v => {
    let m = v.month + 1, y = v.year;
    if (m > 11) { m = 0; y++; }
    return { year: y, month: m };
  });

  // ── Month picker ───────────────────────────────────────────────────────────
  const selectMonth = (monthIdx) => {
    setView(v => ({ ...v, month: monthIdx }));
    setMode('days');
  };

  // ── Year picker ────────────────────────────────────────────────────────────
  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i);
  const selectYear = (year) => {
    setView(v => ({ ...v, year }));
    setDecadeStart(Math.floor(year / 12) * 12);
    setMode('months');
  };

  // ── Display value ──────────────────────────────────────────────────────────
  const displayValue = value ? value.split('-').reverse().join('/') : '';
  const hasError = touched && error;
  const isValid = touched && !error && value;

  let triggerBorder = 'border-gray-300 hover:border-primary-400';
  if (open) triggerBorder = 'border-primary-500 ring-2 ring-primary-500/30';
  if (hasError) triggerBorder = 'border-error ring-2 ring-error/20 bg-error-light';
  if (isValid && !open) triggerBorder = 'border-success';
  if (disabled) triggerBorder = 'border-gray-200 bg-gray-100 cursor-not-allowed';

  // ── Header label per mode ──────────────────────────────────────────────────
  const headerLabel = mode === 'days'
    ? `${MONTH_NAMES[view.month]} ${view.year}`
    : mode === 'months'
      ? `${view.year}`
      : `${decadeStart} – ${decadeStart + 11}`;

  const toggleMode = () => {
    if (mode === 'days') { setMode('months'); }
    else if (mode === 'months') { setDecadeStart(Math.floor(view.year / 12) * 12); setMode('years'); }
    else { setMode('days'); }
  };

  const prevNav = () => {
    if (mode === 'days') prevMonth();
    else if (mode === 'months') setView(v => ({ ...v, year: v.year - 1 }));
    else setDecadeStart(s => s - 12);
  };
  const nextNav = () => {
    if (mode === 'days') nextMonth();
    else if (mode === 'months') setView(v => ({ ...v, year: v.year + 1 }));
    else setDecadeStart(s => s + 12);
  };

  return (
    <div className={`mb-4 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setMode('days'); } }}
        className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border ${triggerBorder} bg-white text-left transition-all duration-200 focus:outline-none`}
        aria-expanded={open}
      >
        <CalendarDays size={18} className={`flex-shrink-0 ${open ? 'text-primary-500' : 'text-gray-400'}`} />
        <span className={`flex-1 text-sm ${displayValue ? 'text-gray-800' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {hasError && <AlertCircle size={18} className="text-error flex-shrink-0" />}
        {isValid && <CheckCircle size={18} className="text-success flex-shrink-0" />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 origin-top animate-scale-in">

          {/* Header: prev / title / next */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevNav}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-primary-50 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors cursor-pointer select-none"
            >
              {headerLabel}
              <ChevronRight
                size={14}
                className={`transition-transform ${mode !== 'days' ? 'rotate-90' : '-rotate-90'}`}
              />
            </button>
            <button
              type="button"
              onClick={nextNav}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* ── Days view ── */}
          {mode === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1 select-none">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  const disabled = isDayDisabled(day);
                  const selected = isDaySelected(day);
                  const todayDay = isDayToday(day);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!day || disabled}
                      onClick={() => selectDay(day)}
                      className={[
                        'h-8 w-full rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none',
                        !day ? 'invisible' : '',
                        selected
                          ? 'gradient-primary text-white shadow-md'
                          : todayDay
                            ? 'border-2 border-primary-400 text-primary-600 font-bold'
                            : !disabled
                              ? 'text-gray-700 hover:bg-primary-50 hover:text-primary-600 cursor-pointer'
                              : 'text-gray-300 cursor-not-allowed',
                      ].join(' ')}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={goToToday}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 cursor-pointer"
                >
                  Hoy
                </button>
              </div>
            </>
          )}

          {/* ── Months view ── */}
          {mode === 'months' && (
            <div className="grid grid-cols-3 gap-2 mt-1">
              {MONTH_SHORT.map((m, idx) => {
                const isSelectedMonth = selectedDate && selectedDate.getFullYear() === view.year && selectedDate.getMonth() === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMonth(idx)}
                    className={[
                      'py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                      isSelectedMonth
                        ? 'gradient-primary text-white shadow-md'
                        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600',
                    ].join(' ')}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Years view ── */}
          {mode === 'years' && (
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {years.map(yr => {
                const isSelectedYear = selectedDate?.getFullYear() === yr;
                const isCurrentYear = today.getFullYear() === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => selectYear(yr)}
                    className={[
                      'py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                      isSelectedYear
                        ? 'gradient-primary text-white shadow-md'
                        : isCurrentYear
                          ? 'border-2 border-primary-400 text-primary-600 font-bold'
                          : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600',
                    ].join(' ')}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hasError && (
        <p className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DatePicker;
