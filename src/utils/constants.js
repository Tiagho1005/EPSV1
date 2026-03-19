export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RECOVER_PASSWORD: '/recover-password',
  TERMS: '/terminos',
  PRIVACY: '/privacidad',
  DASHBOARD: '/dashboard',
  APPOINTMENTS: '/appointments',
  NEW_APPOINTMENT: '/appointments/new',
  MEDICAL_HISTORY: '/medical-history',
  MEDICATIONS: '/medications',
  AUTHORIZATIONS: '/authorizations',
  CERTIFICATES: '/certificates',
  HEALTH: '/health',
  HEALTH_DASHBOARD: '/health',
  PROFILE: '/profile',
  HELP: '/help',
  MEDICO_DASHBOARD: '/medico/dashboard',
  MEDICO_APPOINTMENTS: '/medico/appointments',
  MEDICO_RENEWALS: '/medico/renewals',
  MEDICO_AUTHORIZATIONS: '/medico/authorizations',
};

export const APPOINTMENT_STATES = {
  CONFIRMADA: 'confirmada',
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
};

export const STATE_LABELS = {
  confirmada: 'Confirmada',
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const STATE_VARIANTS = {
  confirmada: 'success',
  pendiente: 'warning',
  completada: 'info',
  cancelada: 'error',
};

export const AUTHORIZATION_STATES = {
  PENDIENTE: 'pendiente',
  APROBADA:  'aprobada',
  RECHAZADA: 'rechazada',
  VENCIDA:   'vencida',
};

export const AUTH_STATE_LABELS = {
  pendiente: 'Pendiente',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
  vencida:   'Vencida',
};

export const AUTH_STATE_VARIANTS = {
  pendiente: 'warning',
  aprobada:  'success',
  rechazada: 'error',
  vencida:   'secondary',
};

export const AUTHORIZATION_TYPES = {
  examen:                'Examen de laboratorio',
  procedimiento:         'Procedimiento',
  consulta_especialista: 'Consulta con especialista',
  imagen:                'Imagen diagnóstica',
  cirugia:               'Cirugía',
};

export const MAX_LOGIN_ATTEMPTS = 5;
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 25 * 60 * 1000;
export const MAX_ACTIVE_APPOINTMENTS = 5;
export const MAX_RESCHEDULES = 2;
export const MIN_ADVANCE_HOURS = 24;
export const MAX_ADVANCE_DAYS = 90;
export const CODE_EXPIRY_MINUTES = 10;
export const RESEND_CODE_SECONDS = 60;
