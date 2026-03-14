import { describe, it, expect } from 'vitest';
import { validators } from './validators';

// ── required ─────────────────────────────────────────────────────────────────
describe('validators.required', () => {
  it('falla con string vacío', () => {
    expect(validators.required('')).toBeTruthy();
  });
  it('falla con null', () => {
    expect(validators.required(null)).toBeTruthy();
  });
  it('falla con undefined', () => {
    expect(validators.required(undefined)).toBeTruthy();
  });
  it('falla con solo espacios', () => {
    expect(validators.required('   ')).toBeTruthy();
  });
  it('pasa con valor normal', () => {
    expect(validators.required('Juan')).toBeNull();
  });
  it('pasa con un solo espacio interno (no solo espacios)', () => {
    expect(validators.required('a b')).toBeNull();
  });
});

// ── email ─────────────────────────────────────────────────────────────────────
describe('validators.email', () => {
  it('pasa con email válido', () => {
    expect(validators.email('user@example.com')).toBeNull();
  });
  it('pasa con null (campo opcional)', () => {
    expect(validators.email(null)).toBeNull();
  });
  it('falla sin @', () => {
    expect(validators.email('userexample.com')).toBeTruthy();
  });
  it('falla sin dominio', () => {
    expect(validators.email('user@')).toBeTruthy();
  });
  it('falla con espacios', () => {
    expect(validators.email('user @example.com')).toBeTruthy();
  });
  it('falla sin TLD', () => {
    expect(validators.email('user@example')).toBeTruthy();
  });
  it('pasa con subdominio', () => {
    expect(validators.email('user@mail.example.co')).toBeNull();
  });
});

// ── cedula ────────────────────────────────────────────────────────────────────
describe('validators.cedula', () => {
  it('pasa con cédula válida de 10 dígitos', () => {
    expect(validators.cedula('1234567890')).toBeNull();
  });
  it('pasa con null (campo opcional)', () => {
    expect(validators.cedula(null)).toBeNull();
  });
  it('falla con espacios', () => {
    expect(validators.cedula('123 456 789')).toBeTruthy();
  });
  it('falla con letras', () => {
    expect(validators.cedula('12abc67890')).toBeTruthy();
  });
  it('falla con menos de 6 dígitos', () => {
    expect(validators.cedula('12345')).toBeTruthy();
  });
  it('falla con más de 12 dígitos', () => {
    expect(validators.cedula('1234567890123')).toBeTruthy();
  });
  it('pasa con 6 dígitos (mínimo)', () => {
    expect(validators.cedula('123456')).toBeNull();
  });
  it('pasa con 12 dígitos (máximo)', () => {
    expect(validators.cedula('123456789012')).toBeNull();
  });
});

// ── celular ───────────────────────────────────────────────────────────────────
describe('validators.celular', () => {
  it('pasa con celular colombiano válido', () => {
    expect(validators.celular('3001234567')).toBeNull();
  });
  it('pasa con null (campo opcional)', () => {
    expect(validators.celular(null)).toBeNull();
  });
  it('falla con letras', () => {
    expect(validators.celular('300123456a')).toBeTruthy();
  });
  it('falla con menos de 10 dígitos', () => {
    expect(validators.celular('300123456')).toBeTruthy();
  });
  it('falla con más de 10 dígitos', () => {
    expect(validators.celular('30012345678')).toBeTruthy();
  });
  it('falla si no empieza con 3', () => {
    expect(validators.celular('2001234567')).toBeTruthy();
  });
  it('pasa con prefijos 310, 311, 320, 350', () => {
    expect(validators.celular('3101234567')).toBeNull();
    expect(validators.celular('3111234567')).toBeNull();
    expect(validators.celular('3201234567')).toBeNull();
    expect(validators.celular('3501234567')).toBeNull();
  });
});

// ── password ──────────────────────────────────────────────────────────────────
describe('validators.password', () => {
  it('pasa con contraseña fuerte completa', () => {
    expect(validators.password('Password123!')).toBeNull();
  });
  it('pasa con null (campo opcional)', () => {
    expect(validators.password(null)).toBeNull();
  });
  it('falla con menos de 8 caracteres', () => {
    expect(validators.password('P1!aBc')).toMatch(/8 caracteres/);
  });
  it('falla sin mayúscula', () => {
    expect(validators.password('password123!')).toMatch(/mayúscula/i);
  });
  it('falla sin minúscula', () => {
    expect(validators.password('PASSWORD123!')).toMatch(/minúscula/i);
  });
  it('falla sin número', () => {
    expect(validators.password('PasswordABC!')).toMatch(/número/i);
  });
  it('falla sin carácter especial', () => {
    expect(validators.password('Password123')).toMatch(/especial/i);
  });
  it('falla con espacios', () => {
    expect(validators.password('Pass word1!')).toMatch(/espacios/i);
  });
  it('acumula todos los errores a la vez', () => {
    const result = validators.password('abc');
    // Debe incluir múltiples errores en un solo string
    expect(result).toContain('8 caracteres');
    expect(result).toContain('mayúscula');
  });
});

// ── passwordStrength ──────────────────────────────────────────────────────────
describe('validators.passwordStrength', () => {
  it('retorna nivel 0 con null', () => {
    expect(validators.passwordStrength(null).level).toBe(0);
  });
  it('clasifica como débil con solo letras cortas', () => {
    const r = validators.passwordStrength('abc');
    expect(r.label).toBe('Débil');
  });
  it('clasifica como media', () => {
    const r = validators.passwordStrength('Password1');
    expect(['Media', 'Débil']).toContain(r.label); // 4 criterios = Media
  });
  it('clasifica como fuerte con todos los criterios', () => {
    const r = validators.passwordStrength('Password123!');
    expect(r.label).toBe('Fuerte');
    expect(r.level).toBe(5);
  });
});

// ── passwordMatch ─────────────────────────────────────────────────────────────
describe('validators.passwordMatch', () => {
  it('pasa cuando las contraseñas coinciden', () => {
    expect(validators.passwordMatch('abc123', 'abc123')).toBeNull();
  });
  it('falla cuando no coinciden', () => {
    expect(validators.passwordMatch('abc123', 'abc124')).toBeTruthy();
  });
  it('pasa con null (campo vacío)', () => {
    expect(validators.passwordMatch(null, 'abc123')).toBeNull();
  });
});

// ── notEqualTo ────────────────────────────────────────────────────────────────
describe('validators.notEqualTo', () => {
  it('falla si la nueva contraseña es igual a la cédula', () => {
    const fn = validators.notEqualTo('cedula', 'cédula');
    expect(fn('1234567890', { cedula: '1234567890' })).toBeTruthy();
  });
  it('pasa si son diferentes', () => {
    const fn = validators.notEqualTo('cedula', 'cédula');
    expect(fn('Password123!', { cedula: '1234567890' })).toBeNull();
  });
  it('pasa si alguno es null', () => {
    const fn = validators.notEqualTo('cedula', 'cédula');
    expect(fn(null, { cedula: '1234567890' })).toBeNull();
  });
});

// ── nombreCompleto ────────────────────────────────────────────────────────────
describe('validators.nombreCompleto', () => {
  it('pasa con nombre y apellido', () => {
    expect(validators.nombreCompleto('Maria Rodriguez')).toBeNull();
  });
  it('pasa con null', () => {
    expect(validators.nombreCompleto(null)).toBeNull();
  });
  it('falla con solo nombre (sin apellido)', () => {
    expect(validators.nombreCompleto('Maria')).toBeTruthy();
  });
  it('falla con menos de 3 caracteres', () => {
    expect(validators.nombreCompleto('AB')).toBeTruthy();
  });
  it('falla con números en el nombre', () => {
    expect(validators.nombreCompleto('Maria123 Rodriguez')).toBeTruthy();
  });
  it('pasa con nombres con tildes y ñ', () => {
    expect(validators.nombreCompleto('José Ñoño García')).toBeNull();
  });
  it('falla si excede 100 caracteres', () => {
    const longName = 'A'.repeat(50) + ' ' + 'B'.repeat(51);
    expect(validators.nombreCompleto(longName)).toBeTruthy();
  });
});

// ── minLength / maxLength ─────────────────────────────────────────────────────
describe('validators.minLength / maxLength', () => {
  it('minLength: pasa si cumple el mínimo', () => {
    expect(validators.minLength(3)('abc')).toBeNull();
  });
  it('minLength: falla si es menor al mínimo', () => {
    expect(validators.minLength(5)('abc')).toBeTruthy();
  });
  it('minLength: pasa con null', () => {
    expect(validators.minLength(3)(null)).toBeNull();
  });
  it('maxLength: pasa si cumple el máximo', () => {
    expect(validators.maxLength(10)('hello')).toBeNull();
  });
  it('maxLength: falla si excede el máximo', () => {
    expect(validators.maxLength(3)('abcd')).toBeTruthy();
  });
});

// ── direccion ─────────────────────────────────────────────────────────────────
describe('validators.direccion', () => {
  it('pasa con dirección válida', () => {
    expect(validators.direccion('Cra 15 #82-45, Apto 301')).toBeNull();
  });
  it('pasa con null', () => {
    expect(validators.direccion(null)).toBeNull();
  });
  it('falla con dirección muy corta', () => {
    expect(validators.direccion('Cra 15')).toBeTruthy();
  });
  it('falla si excede 200 caracteres', () => {
    expect(validators.direccion('A'.repeat(201))).toBeTruthy();
  });
});

// ── date.notFuture ────────────────────────────────────────────────────────────
describe('validators.date.notFuture', () => {
  it('falla con fecha futura', () => {
    expect(validators.date.notFuture('2099-12-31')).toBeTruthy();
  });
  it('pasa con fecha pasada', () => {
    expect(validators.date.notFuture('1990-01-01')).toBeNull();
  });
  it('pasa con null', () => {
    expect(validators.date.notFuture(null)).toBeNull();
  });
});

// ── date.notPast ──────────────────────────────────────────────────────────────
describe('validators.date.notPast', () => {
  it('falla con fecha pasada', () => {
    expect(validators.date.notPast('2000-01-01')).toBeTruthy();
  });
  it('pasa con fecha futura', () => {
    expect(validators.date.notPast('2099-12-31')).toBeNull();
  });
  it('pasa con null', () => {
    expect(validators.date.notPast(null)).toBeNull();
  });
});

// ── date.minAge ───────────────────────────────────────────────────────────────
describe('validators.date.minAge', () => {
  const yearsAgo = (n) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().split('T')[0];
  };

  it('pasa cuando el usuario tiene exactamente 18 años', () => {
    expect(validators.date.minAge(18)(yearsAgo(18))).toBeNull();
  });
  it('falla cuando el usuario tiene 17 años', () => {
    expect(validators.date.minAge(18)(yearsAgo(17))).toBeTruthy();
  });
  it('pasa con null', () => {
    expect(validators.date.minAge(18)(null)).toBeNull();
  });
});

// ── date.maxAge ───────────────────────────────────────────────────────────────
describe('validators.date.maxAge', () => {
  const yearsAgo = (n) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().split('T')[0];
  };

  it('falla cuando la edad supera el máximo', () => {
    expect(validators.date.maxAge(120)(yearsAgo(121))).toBeTruthy();
  });
  it('pasa con edad razonable', () => {
    expect(validators.date.maxAge(120)(yearsAgo(50))).toBeNull();
  });
  it('pasa con null', () => {
    expect(validators.date.maxAge(120)(null)).toBeNull();
  });
});
