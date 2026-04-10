// ============================================================
//  ApiClient — cliente HTTP sin estado global implícito
//
//  Seguridad:
//  • credentials: 'include' → el navegador envía la cookie httpOnly
//    automáticamente en cada request; el cliente nunca toca el JWT.
//  • No hay lógica de token en el cliente: el servidor lo gestiona
//    a través de la cookie eps_token.
//
//  Testabilidad:
//  • Instanciar directamente con baseURL para tests:
//    new ApiClient({ baseURL: 'http://localhost:3001/api' })
//  • Mockear global.fetch para aislar la lógica de negocio.
// ============================================================

export class ApiClient {
  /**
   * @param {object} config
   * @param {string} config.baseURL - URL base de la API
   */
  constructor({ baseURL }) {
    this.baseURL = baseURL;
  }

  // ── Transporte ──────────────────────────────────────────────

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };

    let res;
    try {
      res = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        // Incluye la cookie httpOnly automáticamente.
        // El JWT nunca pasa por JavaScript — lo gestiona el navegador.
        credentials: 'include',
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
  }

  // ── Auth ────────────────────────────────────────────────────

  login(cedula, password) {
    return this.request('POST', '/auth/login', { cedula, password });
  }

  /**
   * Verifica si hay sesión activa y devuelve el usuario actual.
   * Llamado al montar la app para restaurar la sesión sin localStorage.
   */
  getMe() {
    return this.request('GET', '/auth/me');
  }

  register(userData) {
    return this.request('POST', '/auth/register', userData);
  }

  logout() {
    return this.request('POST', '/auth/logout').catch(() => {});
  }

  recoverPassword(identifier) {
    return this.request('POST', '/auth/recover-password', { identifier });
  }

  verifyCode(identifier, code) {
    return this.request('POST', '/auth/verify-code', { identifier, code });
  }

  resetPassword(resetToken, newPassword) {
    return this.request('POST', '/auth/reset-password', { resetToken, newPassword });
  }

  // ── Appointments ────────────────────────────────────────────

  getAppointments() {
    return this.request('GET', '/appointments');
  }

  createAppointment(data) {
    return this.request('POST', '/appointments', data);
  }

  cancelAppointment(id, motivo) {
    return this.request('PATCH', `/appointments/${id}/cancel`, { motivo });
  }

  rescheduleAppointment(id, newDate, newTime) {
    return this.request('PATCH', `/appointments/${id}/reschedule`, { newDate, newTime });
  }

  // ── Medical History ─────────────────────────────────────────

  getMedicalHistory() {
    return this.request('GET', '/medical-history');
  }

  // ── Medications ─────────────────────────────────────────────

  getMedications() {
    return this.request('GET', '/medications');
  }

  getTodayTakenDoses() {
    return this.request('GET', '/medications/taken-today');
  }

  markMedicationTaken(medicationId, horario) {
    return this.request('POST', `/medications/${medicationId}/taken`, { horario });
  }

  requestRenewal(medicationId) {
    return this.request('POST', `/medications/${medicationId}/renewal`);
  }

  // ── Profile ─────────────────────────────────────────────────

  updateProfile(profileData) {
    return this.request('PUT', '/profile', profileData);
  }

  changePassword(currentPassword, newPassword) {
    return this.request('POST', '/profile/change-password', { currentPassword, newPassword });
  }

  updateReminderPreferences(prefs) {
    return this.request('PUT', '/profile/reminder-preferences', prefs);
  }

  // ── Doctors ─────────────────────────────────────────────────

  getDoctors(especialidadId) {
    return this.request('GET', `/doctors${especialidadId ? `?especialidadId=${especialidadId}` : ''}`);
  }

  getAvailableTimes(doctorId, date) {
    return this.request('GET', `/doctors/${doctorId}/available-times?date=${date}`);
  }

  // ── Locations ───────────────────────────────────────────────

  getLocations(doctorId) {
    return this.request('GET', `/locations${doctorId ? `?doctorId=${doctorId}` : ''}`);
  }

  // ── Specialties ─────────────────────────────────────────────

  getSpecialties() {
    return this.request('GET', '/specialties');
  }

  // ── Departments ─────────────────────────────────────────────

  getDepartments() {
    return this.request('GET', '/departments');
  }

  // ── Médico ───────────────────────────────────────────────────

  getMedicoDashboard() {
    return this.request('GET', '/medico/dashboard');
  }

  getMedicoAppointments(date, status) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.request('GET', `/medico/appointments${qs ? `?${qs}` : ''}`);
  }

  completeMedicoAppointment(id, diagnostico, notas, recetas, examenes) {
    return this.request('PATCH', `/medico/appointments/${id}/complete`, { diagnostico, notas, recetas, examenes });
  }

  getMedicoPatient(userId) {
    return this.request('GET', `/medico/patients/${userId}`);
  }

  getMedicoRenewals() {
    return this.request('GET', '/medico/renewals');
  }

  processMedicoRenewal(id, action, nota) {
    return this.request('PATCH', `/medico/renewals/${id}`, { action, nota });
  }

  prescribeMedication(data) {
    return this.request('POST', '/medico/prescriptions', data);
  }

  // ── Authorizations — Paciente ────────────────────────────────

  getAuthorizations(estado, tipo) {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return this.request('GET', `/authorizations${qs ? `?${qs}` : ''}`);
  }

  getAuthorization(id) {
    return this.request('GET', `/authorizations/${id}`);
  }

  // ── Authorizations — Médico ──────────────────────────────────

  getMedicoAuthorizations(estado, tipo) {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return this.request('GET', `/authorizations/medico${qs ? `?${qs}` : ''}`);
  }

  createAuthorization(data) {
    return this.request('POST', '/authorizations', data);
  }

  processAuthorization(id, action, notas) {
    return this.request('PATCH', `/authorizations/${id}/process`, { action, notas });
  }

  // ── Health Metrics ───────────────────────────────────────────

  getHealthMetrics(tipo, desde, hasta) {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return this.request('GET', `/health-metrics${qs ? `?${qs}` : ''}`);
  }

  getHealthSummary() {
    return this.request('GET', '/health-metrics/summary');
  }

  addHealthMetric(data) {
    return this.request('POST', '/health-metrics', data);
  }

  deleteHealthMetric(id) {
    return this.request('DELETE', `/health-metrics/${id}`);
  }

  getMedicoPatientMetrics(userId, tipo) {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return this.request('GET', `/health-metrics/patient/${userId}${qs ? `?${qs}` : ''}`);
  }

  // ── Admin ────────────────────────────────────────────────────

  getAdminDashboard() {
    return this.request('GET', '/admin/dashboard');
  }

  getAdminUsers(role, search, activo) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    if (activo !== undefined) params.set('activo', activo);
    const qs = params.toString();
    return this.request('GET', `/admin/users${qs ? `?${qs}` : ''}`);
  }

  toggleUserActive(id) {
    return this.request('PATCH', `/admin/users/${id}/toggle-active`);
  }

  changeUserRole(id, role, medicoId) {
    return this.request('PATCH', `/admin/users/${id}/change-role`, { role, medicoId });
  }

  getAdminDoctors() {
    return this.request('GET', '/admin/doctors');
  }

  createDoctor(data) {
    return this.request('POST', '/admin/doctors', data);
  }

  updateDoctor(id, data) {
    return this.request('PUT', `/admin/doctors/${id}`, data);
  }

  deleteDoctor(id) {
    return this.request('DELETE', `/admin/doctors/${id}`);
  }

  getAdminLocations() {
    return this.request('GET', '/admin/locations');
  }

  createLocation(data) {
    return this.request('POST', '/admin/locations', data);
  }

  updateLocation(id, data) {
    return this.request('PUT', `/admin/locations/${id}`, data);
  }

  deleteLocation(id) {
    return this.request('DELETE', `/admin/locations/${id}`);
  }

  getAdminSpecialties() {
    return this.request('GET', '/admin/specialties');
  }

  createSpecialty(data) {
    return this.request('POST', '/admin/specialties', data);
  }

  updateSpecialty(id, data) {
    return this.request('PUT', `/admin/specialties/${id}`, data);
  }

  deleteSpecialty(id) {
    return this.request('DELETE', `/admin/specialties/${id}`);
  }

  // ── Chat ─────────────────────────────────────────────────────

  sendChatMessage(message, history) {
    return this.request('POST', '/chat', { message, history });
  }
}
