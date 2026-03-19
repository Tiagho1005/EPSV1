import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { api } from '../../../services/api';

const localResponses = [
  { patterns: ['agendar', 'cita', 'reservar', 'pedir cita'],        response: 'Para agendar una cita, ve a "Agendar Cita" en el menú lateral. Selecciona la especialidad, médico, sede y horario.' },
  { patterns: ['cancelar', 'anular cita'],                           response: 'Puedes cancelar citas desde "Mis Citas". Recuerda hacerlo con al menos 24 horas de anticipación.' },
  { patterns: ['medicamento', 'medicina', 'dosis', 'pastilla'],      response: 'Ve a "Medicamentos" en el menú para ver tus medicamentos activos, registrar dosis y solicitar renovaciones.' },
  { patterns: ['autorización', 'autorizar', 'orden'],                response: 'Tus autorizaciones médicas están en "Autorizaciones" en el menú. Ahí puedes ver el estado y descargar el PDF de las aprobadas.' },
  { patterns: ['certificado', 'descargar', 'pdf', 'documento'],      response: 'Ve a "Certificados" en el menú para descargar tu certificado de afiliación, historial médico, autorizaciones y comprobantes de cita.' },
  { patterns: ['historial', 'diagnóstico', 'consulta anterior'],     response: 'Tu historial médico está en "Historial Médico" en el menú. Encontrarás diagnósticos, recetas y exámenes de todas tus consultas.' },
  { patterns: ['sede', 'dirección', 'dónde queda', 'ubicación'],     response: 'Nuestras sedes: Norte (Calle 100 #15-20), Centro (Carrera 7 #32-16), Sur (Autopista Sur #68-50), Occidental (Calle 13 #50-25). Horario: Lun-Vie 6:00-20:00, Sáb 7:00-14:00.' },
  { patterns: ['horario', 'hora', 'atención'],                       response: 'El horario de atención general es Lunes a Viernes de 6:00 a 20:00 y Sábados de 7:00 a 14:00. Algunas sedes pueden variar.' },
  { patterns: ['contraseña', 'clave', 'olvidé', 'recuperar'],        response: 'Para recuperar tu contraseña, ve a la página de login y haz clic en "¿Olvidaste tu contraseña?". Recibirás un código por email.' },
  { patterns: ['teléfono', 'llamar', 'contacto', 'línea'],           response: 'Línea de atención: 601-123-4567. Horario: Lun-Vie 6:00-20:00. También puedes escribirnos a atencion@eps.com.' },
  { patterns: ['salud', 'presión', 'glucosa', 'peso', 'signos'],     response: 'En "Mi Salud" puedes registrar y hacer seguimiento de tus signos vitales: presión arterial, glucosa, peso, frecuencia cardíaca y más.' },
  { patterns: ['renovar', 'renovación', 'receta'],                   response: 'Si tu medicamento es renovable y te quedan pocos días, puedes solicitar renovación desde "Medicamentos". Tu médico la aprobará desde su portal.' },
  { patterns: ['hola', 'buenas', 'hey', 'ey'],                       response: '¡Hola! Soy el asistente del portal EPS. ¿En qué puedo ayudarte?' },
  { patterns: ['gracias', 'thanks', 'genial'],                       response: '¡Con gusto! Si necesitas algo más, aquí estoy.' },
];

const findLocalResponse = (message) => {
  const lower = message.toLowerCase();
  for (const entry of localResponses) {
    if (entry.patterns.some(p => lower.includes(p))) return entry.response;
  }
  return null;
};

const FALLBACK = 'No pude conectarme con el asistente. Prueba con preguntas como "¿Cómo agendo una cita?" o "¿Dónde están las sedes?"';

const WELCOME = { role: 'assistant', content: '¡Hola! Soy el asistente del portal EPS. Puedo ayudarte con citas, medicamentos, autorizaciones y más. ¿En qué puedo ayudarte?' };

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages
      .filter(m => m.role !== 'assistant' || m !== WELCOME)
      .map(m => ({ role: m.role, content: m.content }));

    // 1. Try local FAQ first
    const local = findLocalResponse(text);
    if (local) {
      await new Promise(r => setTimeout(r, 500));
      setMessages(prev => [...prev, { role: 'assistant', content: local }]);
      setLoading(false);
      return;
    }

    // 2. Try the API proxy
    try {
      const { reply } = await api.sendChatMessage(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: FALLBACK }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Asistente EPS"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="gradient-primary px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Asistente EPS</p>
              <p className="text-white/70 text-xs">Siempre disponible</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'gradient-primary text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder="Escribe tu pregunta..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
