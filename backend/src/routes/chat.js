const router = require('express').Router();
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

router.use(auth);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes. Espera un momento.' },
});
router.use(chatLimiter);

const systemPrompt = `Eres el asistente virtual del portal EPS - Portal del Afiliado, un sistema de gestión de salud en Colombia.
Tu nombre es 'Asistente EPS'. Responde siempre en español y de forma amigable y profesional.

El portal tiene estas funcionalidades:
- Agendar, cancelar y reagendar citas médicas
- Consultar historial médico (diagnósticos, recetas, exámenes)
- Gestionar medicamentos con tracking de dosis y renovación de recetas
- Autorizaciones médicas (exámenes, procedimientos, consultas con especialistas)
- Descargar certificados (afiliación, historial, autorizaciones, comprobantes de cita)
- Dashboard de salud con seguimiento de signos vitales (presión, glucosa, peso, etc.)
- Notificaciones por email y en la app

Especialidades disponibles: Medicina General, Odontología, Pediatría, Ginecología, Cardiología, Dermatología, Oftalmología, Psicología.
Sedes: Norte (Calle 100 #15-20), Centro (Carrera 7 #32-16), Sur (Autopista Sur #68-50), Occidental (Calle 13 #50-25).

Reglas:
- Si preguntan cómo hacer algo en el portal, da instrucciones paso a paso.
- Si preguntan sobre salud, da información general pero SIEMPRE recomienda consultar con su médico.
- NUNCA des diagnósticos médicos ni recomendaciones de tratamiento específicas.
- Si no sabes algo, di que no tienes esa información y sugiere contactar a la línea de atención.
- Responde de forma concisa (máximo 3-4 oraciones por respuesta a menos que requiera pasos detallados).`;

router.post('/', async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Chatbot no disponible. Contacta al administrador.' });
    }

    const messages = [];
    if (Array.isArray(history)) {
      history.slice(-10).forEach(h => {
        if ((h.role === 'user' || h.role === 'assistant') && h.content) {
          messages.push({ role: h.role, content: h.content });
        }
      });
    }
    messages.push({ role: 'user', content: message.trim() });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error Anthropic API: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'No pude procesar tu mensaje. Inténtalo de nuevo.';

    logger.info(`[Chat] user=${req.user.userId} tokens=${data.usage?.input_tokens}+${data.usage?.output_tokens}`);
    res.json({ reply });
  } catch (err) { next(err); }
});

module.exports = router;
