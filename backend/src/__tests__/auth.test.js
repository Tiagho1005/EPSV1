const request = require('supertest');
const bcrypt = require('bcryptjs');

// ── Mock de la base de datos (in-memory) ────────────────────────────────────
let mockStore;

jest.mock('../config/db', () => ({
  getStore: () => mockStore,
  save: jest.fn(),
  initDB: jest.fn().mockResolvedValue(undefined),
}));

// Mock del mailer para no hacer llamadas SMTP reales
jest.mock('../config/mailer', () => ({
  sendRecoveryEmail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  isConfigured: false,
}));

const app = require('../app');

// ── Helpers ──────────────────────────────────────────────────────────────────
const HASH = bcrypt.hashSync('Password123!', 10);

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  cedula: '1234567890',
  nombre: 'Maria',
  apellido: 'Rodriguez',
  email: 'maria@test.com',
  celular: '3001234567',
  fecha_nacimiento: '1990-05-15',
  departamento: 'Cundinamarca',
  municipio: 'Bogota',
  direccion: 'Cra 15 #82-45',
  foto_url: null,
  password_hash: HASH,
  password_history: [],
  role: 'paciente',
  activo: true,
  intentos_fallidos: 0,
  bloqueado_hasta: null,
  reset_code: null,
  reset_code_expires: null,
  fecha_registro: '2024-01-01',
  ...overrides,
});

const resetStore = (userOverrides = {}) => {
  mockStore = {
    users: [makeUser(userOverrides)],
    appointments: [],
    medications: [],
    medication_taken_log: [],
    renewal_requests: [],
  };
};

// ── Tests: POST /api/auth/login ──────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => resetStore());

  it('retorna token con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.cedula).toBe('1234567890');
    expect(res.body.user.password_hash).toBeUndefined(); // no exponer hash
  });

  it('falla con cédula no registrada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '0000000000', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no esta registrado/i);
  });

  it('falla con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'WrongPass!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrectos/i);
  });

  it('incrementa intentos_fallidos en cada fallo', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'wrong' });

    expect(mockStore.users[0].intentos_fallidos).toBe(1);
  });

  it('bloquea la cuenta tras 5 intentos fallidos', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ cedula: '1234567890', password: 'wrong' });
    }
    expect(mockStore.users[0].bloqueado_hasta).not.toBeNull();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/bloqueada/i);
  });

  it('resetea intentos_fallidos al iniciar sesión con éxito', async () => {
    mockStore.users[0].intentos_fallidos = 3;
    await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'Password123!' });

    expect(mockStore.users[0].intentos_fallidos).toBe(0);
  });

  it('rechaza usuario inactivo', async () => {
    resetStore({ activo: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inactiva/i);
  });

  it('falla si faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890' });

    expect(res.status).toBe(400);
  });
});

// ── Tests: POST /api/auth/register ──────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => resetStore());

  const newUser = {
    cedula: '9876543210',
    password: 'Password123!',
    nombre: 'Juan',
    apellido: 'Perez',
    email: 'juan@test.com',
    celular: '3109876543',
    fechaNacimiento: '1995-03-20',
    departamento: 'Antioquia',
    municipio: 'Medellin',
    direccion: 'Calle 50 #30-20',
  };

  it('crea un nuevo usuario correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockStore.users).toHaveLength(2);
    // Verifica que la contraseña está hasheada
    const created = mockStore.users.find(u => u.cedula === '9876543210');
    expect(created.password_hash).not.toBe('Password123!');
    expect(bcrypt.compareSync('Password123!', created.password_hash)).toBe(true);
  });

  it('rechaza cédula duplicada', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newUser, cedula: '1234567890' }); // ya existe

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya esta registrada/i);
  });

  it('rechaza email duplicado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newUser, email: 'maria@test.com' }); // ya existe

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya esta registrado/i);
  });

  it('asigna rol "paciente" por defecto', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(newUser);

    const created = mockStore.users.find(u => u.cedula === '9876543210');
    expect(created.role).toBe('paciente');
  });
});

// ── Tests: POST /api/auth/logout ─────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  let token;

  beforeEach(async () => {
    resetStore();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '1234567890', password: 'Password123!' });
    token = loginRes.body.token;
  });

  it('cierra sesión exitosamente con token válido', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('el token queda invalidado después del logout', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Intentar usar el mismo token después del logout
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/sesión cerrada/i);
  });

  it('rechaza logout sin token', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});

// ── Tests: POST /api/auth/recover-password ──────────────────────────────────
describe('POST /api/auth/recover-password', () => {
  beforeEach(() => resetStore());

  it('siempre responde con éxito (no revela si el usuario existe)', async () => {
    const resExistente = await request(app)
      .post('/api/auth/recover-password')
      .send({ identifier: 'maria@test.com' });

    const resInexistente = await request(app)
      .post('/api/auth/recover-password')
      .send({ identifier: 'noexiste@test.com' });

    expect(resExistente.status).toBe(200);
    expect(resInexistente.status).toBe(200);
    expect(resExistente.body.success).toBe(true);
    expect(resInexistente.body.success).toBe(true);
  });

  it('guarda el código de recuperación en el usuario', async () => {
    await request(app)
      .post('/api/auth/recover-password')
      .send({ identifier: 'maria@test.com' });

    expect(mockStore.users[0].reset_code).toMatch(/^\d{6}$/);
    expect(mockStore.users[0].reset_code_expires).toBeDefined();
  });

  it('expone el código en dev (_devCode)', async () => {
    process.env.NODE_ENV = 'development';
    const res = await request(app)
      .post('/api/auth/recover-password')
      .send({ identifier: 'maria@test.com' });

    expect(res.body._devCode).toMatch(/^\d{6}$/);
    delete process.env.NODE_ENV;
  });

  it('acepta búsqueda por cédula también', async () => {
    await request(app)
      .post('/api/auth/recover-password')
      .send({ identifier: '1234567890' });

    expect(mockStore.users[0].reset_code).toBeDefined();
  });
});

// ── Tests: POST /api/auth/verify-code ───────────────────────────────────────
describe('POST /api/auth/verify-code', () => {
  beforeEach(() => {
    resetStore({
      reset_code: '123456',
      reset_code_expires: new Date(Date.now() + 5 * 60000).toISOString(),
    });
  });

  it('retorna resetToken con código correcto', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ identifier: 'maria@test.com', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeDefined();
  });

  it('rechaza código incorrecto', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ identifier: 'maria@test.com', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrecto/i);
  });

  it('rechaza código expirado', async () => {
    mockStore.users[0].reset_code_expires = new Date(Date.now() - 1000).toISOString();

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ identifier: 'maria@test.com', code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expirado/i);
  });
});
