import React, { useState } from 'react';
import {
  HelpCircle, ChevronDown, ChevronUp, Phone, Mail,
  MessageCircle, Calendar, Pill, FileText, User, Shield
} from 'lucide-react';
import Card from '../components/ui/Card';

const faqs = [
  {
    category: 'Citas',
    icon: Calendar,
    color: 'text-primary-500',
    bg: 'bg-primary-50',
    items: [
      {
        question: '¿Cómo agendo una cita médica?',
        answer: 'Ve a "Agendar Cita" en el menú lateral o en el dashboard. Selecciona la especialidad, médico, sede y el horario de tu preferencia. Confirma los datos y acepta las condiciones para completar el agendamiento.',
      },
      {
        question: '¿Con cuánta anticipación puedo agendar una cita?',
        answer: 'Puedes agendar citas desde 24 horas hasta 90 días en adelante. Las citas para el mismo día no están disponibles a través del portal; para esos casos, comunícate directamente con tu sede.',
      },
      {
        question: '¿Puedo cancelar o reagendar mi cita?',
        answer: 'Sí. En "Mis Citas" puedes cancelar o reagendar citas confirmadas o pendientes. Las cancelaciones deben hacerse con al menos 24 horas de anticipación. Cada cita puede reagendarse hasta 2 veces.',
      },
      {
        question: '¿Qué hago si no puedo asistir a mi cita?',
        answer: 'Cancela la cita desde el portal con anticipación. Esto libera el espacio para otros afiliados y evita penalizaciones en tu historial.',
      },
    ],
  },
  {
    category: 'Medicamentos',
    icon: Pill,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    items: [
      {
        question: '¿Cómo registro que tomé un medicamento?',
        answer: 'En la sección "Medicamentos" encontrarás el listado de tus medicamentos activos con sus horarios. Presiona "Marcar tomado" junto al horario correspondiente para registrar la dosis.',
      },
      {
        question: '¿Cómo solicito la renovación de una receta?',
        answer: 'Cuando te queden 7 días o menos de medicamento, aparecerá el botón "Solicitar Renovación" en la tarjeta del medicamento. La solicitud se envía automáticamente al médico tratante para su aprobación.',
      },
    ],
  },
  {
    category: 'Historial Médico',
    icon: FileText,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    items: [
      {
        question: '¿Qué información encuentro en el historial médico?',
        answer: 'El historial incluye todas tus consultas anteriores con diagnóstico, notas del médico, recetas emitidas y exámenes ordenados. Haz clic en cada registro para ver los detalles completos.',
      },
      {
        question: '¿El historial médico es privado?',
        answer: 'Sí. Tu historial médico es completamente privado y solo puedes acceder a él tú. La información está protegida bajo estrictas políticas de seguridad y privacidad de datos.',
      },
    ],
  },
  {
    category: 'Mi Perfil',
    icon: User,
    color: 'text-secondary-500',
    bg: 'bg-secondary-50',
    items: [
      {
        question: '¿Puedo actualizar mis datos de contacto?',
        answer: 'Sí. En "Mi Perfil" puedes actualizar tu nombre, número de celular, correo electrónico y dirección. La cédula y la fecha de nacimiento no son editables por ser datos de identificación.',
      },
      {
        question: '¿Cómo cambio mi contraseña?',
        answer: 'En "Mi Perfil", en la sección de Seguridad, haz clic en "Cambiar Contraseña". Deberás ingresar tu contraseña actual y la nueva contraseña, que debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y un carácter especial.',
      },
    ],
  },
  {
    category: 'Seguridad y Acceso',
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    items: [
      {
        question: '¿Qué hago si olvidé mi contraseña?',
        answer: 'En la pantalla de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?". Ingresa tu correo o cédula y recibirás un código de verificación de 6 dígitos. Úsalo para crear una nueva contraseña.',
      },
      {
        question: '¿Mi sesión puede expirar?',
        answer: 'Por seguridad, tu sesión se cierra automáticamente después de 30 minutos de inactividad. Guarda tu trabajo antes de alejarte del portal.',
      },
    ],
  },
];

const contactChannels = [
  {
    icon: Phone,
    label: 'Línea de atención',
    value: '01 8000 123 456',
    sub: 'Lun – Vie, 7:00 am – 7:00 pm',
    color: 'text-primary-500',
    bg: 'bg-primary-50',
  },
  {
    icon: Mail,
    label: 'Correo electrónico',
    value: 'atencion@eps.com.co',
    sub: 'Respuesta en menos de 24 horas',
    color: 'text-secondary-500',
    bg: 'bg-secondary-50',
  },
  {
    icon: MessageCircle,
    label: 'Chat en línea',
    value: 'Chat disponible en el portal',
    sub: 'Lun – Sáb, 8:00 am – 6:00 pm',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

const HelpPage = () => {
  const [openItems, setOpenItems] = useState({});

  const toggle = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Centro de Ayuda</h1>
        <p className="text-gray-500 text-sm">Encuentra respuestas a las preguntas más frecuentes</p>
      </div>

      {/* FAQ sections */}
      {faqs.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.category}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl ${section.bg} flex items-center justify-center`}>
                <Icon size={18} className={section.color} />
              </div>
              <h2 className="text-base font-semibold text-gray-800">{section.category}</h2>
            </div>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = !!openItems[key];
                return (
                  <div key={key} className={`rounded-xl border transition-all ${isOpen ? 'border-primary-200 bg-primary-50/40' : 'border-gray-100 bg-gray-50'}`}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
                    >
                      <span className="text-sm font-medium text-gray-800">{item.question}</span>
                      {isOpen
                        ? <ChevronUp size={16} className="text-primary-500 flex-shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 animate-fade-in-up">
                        <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Contact channels */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <HelpCircle size={18} className="text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">¿Necesitas más ayuda?</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {contactChannels.map((ch) => {
            const Icon = ch.icon;
            return (
              <div key={ch.label} className={`p-4 rounded-xl ${ch.bg} border border-transparent`}>
                <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-3 shadow-sm`}>
                  <Icon size={16} className={ch.color} />
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{ch.label}</p>
                <p className={`text-sm font-semibold ${ch.color}`}>{ch.value}</p>
                <p className="text-xs text-gray-500 mt-1">{ch.sub}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default HelpPage;
