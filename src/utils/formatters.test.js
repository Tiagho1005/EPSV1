import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateFull,
  formatTime,
  formatPhone,
  getInitials,
  capitalize,
  getDaysRemaining,
  getDayOfWeek,
} from './formatters';

// ── formatDate ────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('formatea una fecha válida en español', () => {
    expect(formatDate('2024-11-10')).toBe('10 de Noviembre de 2024');
  });
  it('retorna cadena vacía con null', () => {
    expect(formatDate(null)).toBe('');
  });
  it('retorna cadena vacía con undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });
  it('maneja el mes de Enero (índice 0)', () => {
    expect(formatDate('2024-01-15')).toBe('15 de Enero de 2024');
  });
  it('maneja el mes de Diciembre (índice 11)', () => {
    expect(formatDate('2024-12-31')).toBe('31 de Diciembre de 2024');
  });
  it('maneja el año bisiesto (29 de Febrero)', () => {
    expect(formatDate('2024-02-29')).toBe('29 de Febrero de 2024');
  });
});

// ── formatDateShort ───────────────────────────────────────────────────────────
describe('formatDateShort', () => {
  it('retorna formato corto con día de semana', () => {
    // 2024-11-10 es Domingo
    const result = formatDateShort('2024-11-10');
    expect(result).toContain('10');
    expect(result).toContain('Nov');
    expect(result).toMatch(/^(Dom|Lun|Mar|Mié|Jue|Vie|Sáb)/);
  });
  it('retorna cadena vacía con null', () => {
    expect(formatDateShort(null)).toBe('');
  });
});

// ── formatDateFull ────────────────────────────────────────────────────────────
describe('formatDateFull', () => {
  it('incluye el nombre del día completo, día, mes y año', () => {
    const result = formatDateFull('2024-11-10');
    expect(result).toContain('2024');
    expect(result).toContain('Noviembre');
    expect(result).toContain('10');
    expect(result).toMatch(/^(Domingo|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado)/);
  });
  it('retorna cadena vacía con null', () => {
    expect(formatDateFull(null)).toBe('');
  });
});

// ── formatTime ────────────────────────────────────────────────────────────────
describe('formatTime', () => {
  it('convierte 08:00 a formato 12h AM', () => {
    expect(formatTime('08:00')).toBe('8:00 AM');
  });
  it('convierte 12:00 a 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });
  it('convierte 13:00 a 1:00 PM', () => {
    expect(formatTime('13:00')).toBe('1:00 PM');
  });
  it('convierte 00:00 (medianoche) a 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });
  it('convierte 23:30 a 11:30 PM', () => {
    expect(formatTime('23:30')).toBe('11:30 PM');
  });
  it('retorna cadena vacía con null', () => {
    expect(formatTime(null)).toBe('');
  });
  it('retorna cadena vacía con string vacío', () => {
    expect(formatTime('')).toBe('');
  });
  it('preserva los minutos de la hora original', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
    expect(formatTime('14:45')).toBe('2:45 PM');
  });
});

// ── formatPhone ───────────────────────────────────────────────────────────────
describe('formatPhone', () => {
  it('formatea número de 10 dígitos con espacios', () => {
    expect(formatPhone('3001234567')).toBe('300 123 4567');
  });
  it('retorna el número sin cambios si no tiene 10 dígitos', () => {
    expect(formatPhone('12345')).toBe('12345');
  });
  it('retorna cadena vacía con null', () => {
    expect(formatPhone(null)).toBe('');
  });
});

// ── getInitials ───────────────────────────────────────────────────────────────
describe('getInitials', () => {
  it('retorna las 2 primeras iniciales', () => {
    expect(getInitials('Maria Rodriguez')).toBe('MR');
  });
  it('retorna solo 2 iniciales aunque haya más palabras', () => {
    expect(getInitials('Ana Maria Lopez Garcia')).toBe('AM');
  });
  it('retorna inicial única si es solo una palabra', () => {
    expect(getInitials('Maria')).toBe('M');
  });
  it('retorna cadena vacía con null', () => {
    expect(getInitials(null)).toBe('');
  });
  it('retorna cadena vacía con string vacío', () => {
    expect(getInitials('')).toBe('');
  });
  it('retorna en mayúsculas', () => {
    expect(getInitials('juan perez')).toBe('JP');
  });
});

// ── capitalize ────────────────────────────────────────────────────────────────
describe('capitalize', () => {
  it('capitaliza la primera letra', () => {
    expect(capitalize('hola')).toBe('Hola');
  });
  it('no modifica las letras siguientes', () => {
    expect(capitalize('hOLA MUNDO')).toBe('HOLA MUNDO');
  });
  it('retorna cadena vacía con null', () => {
    expect(capitalize(null)).toBe('');
  });
  it('retorna cadena vacía con string vacío', () => {
    expect(capitalize('')).toBe('');
  });
});

// ── getDaysRemaining ──────────────────────────────────────────────────────────
describe('getDaysRemaining', () => {
  it('retorna 0 con null', () => {
    expect(getDaysRemaining(null)).toBe(0);
  });
  it('retorna 0 para fechas pasadas', () => {
    expect(getDaysRemaining('2000-01-01')).toBe(0);
  });
  it('retorna valor positivo para fechas futuras', () => {
    expect(getDaysRemaining('2099-12-31')).toBeGreaterThan(0);
  });
  it('retorna aproximadamente 1 para mañana', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    expect(getDaysRemaining(dateStr)).toBe(1);
  });
});

// ── getDayOfWeek ──────────────────────────────────────────────────────────────
describe('getDayOfWeek', () => {
  it('retorna el día de la semana en minúsculas', () => {
    // 2024-11-10 es domingo
    expect(getDayOfWeek('2024-11-10')).toBe('domingo');
  });
  it('retorna lunes para el 2024-11-11', () => {
    expect(getDayOfWeek('2024-11-11')).toBe('lunes');
  });
  it('retorna sábado para el 2024-11-09', () => {
    expect(getDayOfWeek('2024-11-09')).toBe('sábado');
  });
});
