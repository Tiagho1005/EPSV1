const nodemailer = require('nodemailer');

const isConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Crear transporter según configuración disponible
const createTransporter = () => {
  if (!isConfigured) {
    // En desarrollo sin config de email: usar Ethereal (bandeja de prueba)
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

let transporter = createTransporter();

/**
 * Envía un email de recuperación de contraseña con el código de verificación.
 * Si no hay configuración SMTP, usa Ethereal (solo para desarrollo).
 */
const sendRecoveryEmail = async ({ to, nombre, code }) => {
  if (!transporter) {
    // Crear cuenta Ethereal temporal para desarrollo
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const from = process.env.EMAIL_FROM || '"EPS Portal" <noreply@eps.com>';

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Código de recuperación de contraseña - EPS',
    text: `Hola ${nombre},\n\nTu código de verificación es: ${code}\n\nEste código expira en 10 minutos.\n\nSi no solicitaste esto, ignora este mensaje.\n\nEPS Portal del Afiliado`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EPS — Portal del Afiliado</h1>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">Recuperación de contraseña</h2>
        <p style="color: #64748b;">Hola <strong>${nombre}</strong>,</p>
        <p style="color: #64748b;">Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
        <div style="background: #F5F3FF; border: 2px solid #C4B5FD; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #7C3AED;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">⏱ Este código expira en <strong>10 minutos</strong>.</p>
        <p style="color: #94a3b8; font-size: 13px;">Si no solicitaste esto, puedes ignorar este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; text-align: center;">EPS — Portal del Afiliado</p>
      </div>
    `,
  });

  // En desarrollo sin SMTP real, mostrar URL de preview de Ethereal
  if (!isConfigured) {
    console.log(`[DEV] Email de recuperación enviado. Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

/**
 * Envía un email de confirmación de cita médica.
 */
const sendAppointmentConfirmation = async ({ to, nombre, appointment }) => {
  if (!transporter) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const from = process.env.EMAIL_FROM || '"EPS Portal" <noreply@eps.com>';

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Confirmación de cita médica - EPS',
    text: `Hola ${nombre},\n\nTu cita ha sido agendada exitosamente.\n\nDetalles:\n- Especialidad: ${appointment.especialidadNombre}\n- Médico: ${appointment.medico}\n- Sede: ${appointment.sede}\n- Fecha: ${appointment.fecha}\n- Hora: ${appointment.hora}\n\nRecuerda que puedes cancelar o reagendar con al menos 24 horas de anticipación.\n\nEPS Portal del Afiliado`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EPS — Portal del Afiliado</h1>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">✅ Cita confirmada</h2>
        <p style="color: #64748b;">Hola <strong>${nombre}</strong>, tu cita ha sido agendada exitosamente.</p>
        <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 14px;">Especialidad</td><td style="font-weight: 600; color: #1e293b; font-size: 14px;">${appointment.especialidadNombre}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 14px;">Médico</td><td style="font-weight: 600; color: #1e293b; font-size: 14px;">${appointment.medico}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 14px;">Sede</td><td style="font-weight: 600; color: #1e293b; font-size: 14px;">${appointment.sede}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 14px;">Fecha</td><td style="font-weight: 600; color: #1e293b; font-size: 14px;">${appointment.fecha}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 14px;">Hora</td><td style="font-weight: 600; color: #1e293b; font-size: 14px;">${appointment.hora}</td></tr>
          </table>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">⚠️ Recuerda cancelar con al menos <strong>24 horas de anticipación</strong> si no puedes asistir.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; text-align: center;">EPS — Portal del Afiliado</p>
      </div>
    `,
  });

  if (!isConfigured) {
    console.log(`[DEV] Email de confirmación de cita enviado. Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

module.exports = { sendRecoveryEmail, sendAppointmentConfirmation, isConfigured };
