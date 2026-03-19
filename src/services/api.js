const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Internal state for multi-step password reset flow
let _resetIdentifier = null;
let _resetToken = null;

const getToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem('eps_session') || '{}');
    return session.token || null;
  } catch {
    return null;
  }
};

const request = async (method, path, body = null, auth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Error de conexión. Verifica tu conexión a internet.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Respuesta inesperada del servidor. Intenta más tarde.');
  }

  if (!res.ok) throw new Error(data.error || 'Error en el servidor');
  return data;
};

export const api = {
  // Auth
  login: (cedula, password, portal) =>
    request('POST', '/auth/login', { cedula, password, portal }, false),

  register: (userData) =>
    request('POST', '/auth/register', userData, false),

  logout: () =>
    request('POST', '/auth/logout', null, true).catch(() => {}), // silenciar si falla (token ya expirado)

  recoverPassword: async (identifier) => {
    _resetIdentifier = identifier;
    return request('POST', '/auth/recover-password', { identifier }, false);
  },

  verifyCode: async (code) => {
    const data = await request('POST', '/auth/verify-code', { identifier: _resetIdentifier, code }, false);
    _resetToken = data.resetToken;
    return { success: true };
  },

  resetPassword: (newPassword) =>
    request('POST', '/auth/reset-password', { resetToken: _resetToken, newPassword }, false),

  // Appointments
  getAppointments: () => request('GET', '/appointments'),
  createAppointment: (data) => request('POST', '/appointments', data),
  cancelAppointment: (id, motivo) =>
    request('PATCH', `/appointments/${id}/cancel`, { motivo }),
  rescheduleAppointment: (id, newDate, newTime) =>
    request('PATCH', `/appointments/${id}/reschedule`, { newDate, newTime }),

  // Medical History
  getMedicalHistory: () => request('GET', '/medical-history'),

  // Medications
  getMedications: () => request('GET', '/medications'),
  getTodayTakenDoses: () => request('GET', '/medications/taken-today'),
  markMedicationTaken: (medicationId, horario) =>
    request('POST', `/medications/${medicationId}/taken`, { horario }),
  requestRenewal: (medicationId) =>
    request('POST', `/medications/${medicationId}/renewal`),

  // Profile
  updateProfile: (profileData) => request('PUT', '/profile', profileData),
  changePassword: (currentPassword, newPassword) =>
    request('POST', '/profile/change-password', { currentPassword, newPassword }),

  // Doctors
  getDoctors: (especialidadId) =>
    request('GET', `/doctors${especialidadId ? `?especialidadId=${especialidadId}` : ''}`),
  getAvailableTimes: (doctorId, date) =>
    request('GET', `/doctors/${doctorId}/available-times?date=${date}`),

  // Locations
  getLocations: (doctorId) =>
    request('GET', `/locations${doctorId ? `?doctorId=${doctorId}` : ''}`),

  // Specialties
  getSpecialties: () => request('GET', '/specialties'),

  // Departments (no auth — used in registration)
  getDepartments: () => request('GET', '/departments', null, false),

  // Medico
  getMedicoDashboard: () => request('GET', '/medico/dashboard'),
  getMedicoAppointments: (date, status) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request('GET', `/medico/appointments${qs ? `?${qs}` : ''}`);
  },
  completeMedicoAppointment: (id, diagnostico, notas, recetas, examenes) =>
    request('PATCH', `/medico/appointments/${id}/complete`, { diagnostico, notas, recetas, examenes }),
  getMedicoPatient: (userId) => request('GET', `/medico/patients/${userId}`),
  getMedicoRenewals: () => request('GET', '/medico/renewals'),
  processMedicoRenewal: (id, action, nota) =>
    request('PATCH', `/medico/renewals/${id}`, { action, nota }),
  prescribeMedication: (data) => request('POST', '/medico/prescriptions', data),

  // Authorizations - Paciente
  getAuthorizations: (estado, tipo) => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return request('GET', `/authorizations${qs ? `?${qs}` : ''}`);
  },
  getAuthorization: (id) => request('GET', `/authorizations/${id}`),

  // Authorizations - Médico
  getMedicoAuthorizations: (estado, tipo) => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return request('GET', `/authorizations/medico${qs ? `?${qs}` : ''}`);
  },
  createAuthorization: (data) => request('POST', '/authorizations', data),
  processAuthorization: (id, action, notas) =>
    request('PATCH', `/authorizations/${id}/process`, { action, notas }),

  // Health Metrics
  getHealthMetrics: (tipo, desde, hasta) => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return request('GET', `/health-metrics${qs ? `?${qs}` : ''}`);
  },
  getHealthSummary: () => request('GET', '/health-metrics/summary'),
  addHealthMetric: (data) => request('POST', '/health-metrics', data),
  deleteHealthMetric: (id) => request('DELETE', `/health-metrics/${id}`),
  getMedicoPatientMetrics: (userId, tipo) => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return request('GET', `/health-metrics/patient/${userId}${qs ? `?${qs}` : ''}`);
  },

  // Admin
  getAdminDashboard: () => request('GET', '/admin/dashboard'),

  getAdminUsers: (role, search, activo) => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    if (activo !== undefined) params.set('activo', activo);
    const qs = params.toString();
    return request('GET', `/admin/users${qs ? `?${qs}` : ''}`);
  },
  toggleUserActive: (id) => request('PATCH', `/admin/users/${id}/toggle-active`),
  changeUserRole: (id, role, medicoId) => request('PATCH', `/admin/users/${id}/change-role`, { role, medicoId }),

  getAdminDoctors: () => request('GET', '/admin/doctors'),
  createDoctor: (data) => request('POST', '/admin/doctors', data),
  updateDoctor: (id, data) => request('PUT', `/admin/doctors/${id}`, data),
  deleteDoctor: (id) => request('DELETE', `/admin/doctors/${id}`),

  getAdminLocations: () => request('GET', '/admin/locations'),
  createLocation: (data) => request('POST', '/admin/locations', data),
  updateLocation: (id, data) => request('PUT', `/admin/locations/${id}`, data),
  deleteLocation: (id) => request('DELETE', `/admin/locations/${id}`),

  updateReminderPreferences: (prefs) => request('PUT', '/profile/reminder-preferences', prefs),
  sendChatMessage: (message, history) => request('POST', '/chat', { message, history }),

  getAdminSpecialties: () => request('GET', '/admin/specialties'),
  createSpecialty: (data) => request('POST', '/admin/specialties', data),
  updateSpecialty: (id, data) => request('PUT', `/admin/specialties/${id}`, data),
  deleteSpecialty: (id) => request('DELETE', `/admin/specialties/${id}`),
};
