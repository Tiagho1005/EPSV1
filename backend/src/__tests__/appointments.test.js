const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'dev-secret-only-for-local-dev';

// ── Mock de la base de datos (in-memory) ────────────────────────────────────
let mockStore;

jest.mock('../config/db', () => ({
  getStore: () => mockStore,
  save: jest.fn(),
  initDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/mailer', () => ({
  sendRecoveryEmail: jest.fn().mockResolvedValue({}),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue({}),
  isConfigured: false,
}));

const app = require('../app');

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeToken = (userId = 'user-1', role = 'paciente') =>
  jwt.sign({ userId, role, jti: 'test-jti-' + userId }, JWT_SECRET, { expiresIn: '1h' });

const makeAppointment = (overrides = {}) => ({
  id: 'apt-1',
  user_id: 'user-1',
  especialidad_id: 'medicina-general',
  especialidad_nombre: 'Medicina General',
  medico: 'Dr. Carlos Mendoza',
  medico_id: 'doc-1',
  sede: 'Sede Norte',
  sede_id: 'norte',
  fecha: '2026-12-20',
  hora: '10:00',
  estado: 'confirmada',
  reagendamientos: 0,
  notas: '',
  diagnostico: null,
  motivo_cancelacion: null,
  ...overrides,
});

const resetStore = (appointments = []) => {
  mockStore = {
    users: [{
      id: 'user-1',
      cedula: '1234567890',
      nombre: 'Maria',
      apellido: 'Rodriguez',
      email: 'maria@test.com',
      password_hash: bcrypt.hashSync('Password123!', 10),
      activo: true,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      reset_code: null,
      reset_code_expires: null,
      fecha_registro: '2024-01-01',
      role: 'paciente',
    }],
    appointments,
    medications: [],
    medication_taken_log: [],
    renewal_requests: [],
  };
};

const authHeader = (userId = 'user-1') => ({
  Authorization: `Bearer ${makeToken(userId)}`,
});

const newAptPayload = (overrides = {}) => ({
  especialidad: 'medicina-general',
  especialidadNombre: 'Medicina General',
  medico: 'Dr. Carlos Mendoza',
  medicoId: 'doc-1',
  sede: 'Sede Norte',
  sedeId: 'norte',
  fecha: '2026-12-20',
  hora: '10:00',
  ...overrides,
});

// ── Tests: GET /api/appointments ─────────────────────────────────────────────
describe('GET /api/appointments', () => {
  beforeEach(() => resetStore([
    makeAppointment({ user_id: 'user-1' }),
    makeAppointment({ id: 'apt-2', user_id: 'other-user' }), // de otro usuario
  ]));

  it('retorna solo las citas del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('apt-1');
  });

  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });
});

// ── Tests: POST /api/appointments ────────────────────────────────────────────
describe('POST /api/appointments', () => {
  beforeEach(() => resetStore());

  it('crea una cita correctamente', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader())
      .send(newAptPayload());

    expect(res.status).toBe(201);
    expect(res.body.medico).toBe('Dr. Carlos Mendoza');
    expect(res.body.estado).toBe('confirmada');
    expect(mockStore.appointments).toHaveLength(1);
  });

  it('genera un ID único para la cita', async () => {
    await request(app)
      .post('/api/appointments')
      .set(authHeader())
      .send(newAptPayload());

    expect(mockStore.appointments[0].id).toBeDefined();
    expect(mockStore.appointments[0].id).not.toBe('');
  });

  it('rechaza si el médico ya tiene cita en ese horario', async () => {
    // Primera cita (confirmada)
    resetStore([makeAppointment({ estado: 'confirmada' })]);

    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader())
      .send(newAptPayload()); // mismo médico + fecha + hora

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/no está disponible/i);
  });

  it('permite reservar si la cita previa está cancelada', async () => {
    resetStore([makeAppointment({ estado: 'cancelada' })]);

    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader())
      .send(newAptPayload());

    expect(res.status).toBe(201);
  });

  it('envía email de confirmación al crear la cita', async () => {
    const { sendAppointmentConfirmation } = require('../config/mailer');
    await request(app)
      .post('/api/appointments')
      .set(authHeader())
      .send(newAptPayload());

    // El email se envía de forma async (fire-and-forget), esperamos un tick
    await new Promise(r => setTimeout(r, 50));
    expect(sendAppointmentConfirmation).toHaveBeenCalled();
  });
});

// ── Tests: PATCH /api/appointments/:id/cancel ───────────────────────────────
describe('PATCH /api/appointments/:id/cancel', () => {
  it('cancela una cita con motivo', async () => {
    resetStore([makeAppointment({ fecha: '2026-12-20', hora: '10:00' })]);

    const res = await request(app)
      .patch('/api/appointments/apt-1/cancel')
      .set(authHeader())
      .send({ motivo: 'No puedo asistir' });

    expect(res.status).toBe(200);
    expect(mockStore.appointments[0].estado).toBe('cancelada');
    expect(mockStore.appointments[0].motivo_cancelacion).toBe('No puedo asistir');
  });

  it('rechaza cancelar una cita con menos de 24 horas de anticipación', async () => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 12); // 12h desde ahora
    const fecha = tomorrow.toISOString().split('T')[0];
    const hora = `${String(tomorrow.getHours()).padStart(2, '0')}:00`;

    resetStore([makeAppointment({ fecha, hora })]);

    const res = await request(app)
      .patch('/api/appointments/apt-1/cancel')
      .set(authHeader())
      .send({ motivo: 'urgencia' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/24 horas/i);
  });

  it('retorna 404 si la cita no existe', async () => {
    resetStore([]);
    const res = await request(app)
      .patch('/api/appointments/no-existe/cancel')
      .set(authHeader())
      .send({ motivo: 'test' });

    expect(res.status).toBe(404);
  });

  it('no permite cancelar la cita de otro usuario', async () => {
    resetStore([makeAppointment({ user_id: 'other-user' })]);

    const res = await request(app)
      .patch('/api/appointments/apt-1/cancel')
      .set(authHeader('user-1'))
      .send({ motivo: 'test' });

    expect(res.status).toBe(404);
  });

  it('rechaza cancelar una cita ya cancelada', async () => {
    resetStore([makeAppointment({ estado: 'cancelada', fecha: '2026-12-20' })]);

    const res = await request(app)
      .patch('/api/appointments/apt-1/cancel')
      .set(authHeader())
      .send({ motivo: 'test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya está cancelada/i);
  });
});

// ── Tests: PATCH /api/appointments/:id/reschedule ───────────────────────────
describe('PATCH /api/appointments/:id/reschedule', () => {
  beforeEach(() => resetStore([makeAppointment()]));

  it('reagenda la cita e incrementa contador', async () => {
    const res = await request(app)
      .patch('/api/appointments/apt-1/reschedule')
      .set(authHeader())
      .send({ newDate: '2026-12-28', newTime: '14:00' });

    expect(res.status).toBe(200);
    expect(mockStore.appointments[0].fecha).toBe('2026-12-28');
    expect(mockStore.appointments[0].hora).toBe('14:00');
    expect(mockStore.appointments[0].reagendamientos).toBe(1);
  });
});
