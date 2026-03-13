const BASE_URL = 'http://localhost:3001/api';

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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en el servidor');
  return data;
};

export const api = {
  // Auth
  login: (cedula, password) =>
    request('POST', '/auth/login', { cedula, password }, false),

  register: (userData) =>
    request('POST', '/auth/register', userData, false),

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
};
