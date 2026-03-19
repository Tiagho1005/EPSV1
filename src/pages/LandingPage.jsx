import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse, Calendar, FileText, Pill, Bell, Shield, FileCheck,
  MapPin, Phone, Clock, Menu, X, ArrowRight, ChevronRight,
  Stethoscope, Smile, Baby, Heart, Sparkles, Eye, Brain,
  Star, Facebook, Twitter, Instagram, Linkedin, Mail,
} from 'lucide-react';

// ── Hooks ─────────────────────────────────────────────────────────────────────

const useScrolled = (threshold = 50) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
};

const useReveal = (threshold = 0.1) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

// ── Reveal wrapper ─────────────────────────────────────────────────────────────

const Reveal = ({ children, className = '', delay = 0 }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ── Data ───────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '8',       label: 'Especialidades'   },
  { value: '4',       label: 'Sedes en Bogotá'  },
  { value: '+10.000', label: 'Citas gestionadas' },
  { value: '99.9%',   label: 'Disponibilidad'   },
];

const FEATURES = [
  {
    icon: Calendar,
    title: 'Agendar Citas',
    desc:  'Agenda con tu especialista en 3 pasos. Elige médico, sede y horario disponible.',
  },
  {
    icon: FileText,
    title: 'Historial Médico',
    desc:  'Consulta diagnósticos, recetas y exámenes de todas tus consultas anteriores.',
  },
  {
    icon: Pill,
    title: 'Medicamentos',
    desc:  'Tracking de dosis en tiempo real con recordatorios y renovación automática.',
  },
  {
    icon: Stethoscope,
    title: 'Portal Médico',
    desc:  'Los profesionales gestionan consultas, prescripciones y renovaciones desde un solo lugar.',
  },
  {
    icon: Bell,
    title: 'Notificaciones',
    desc:  'Confirmaciones por email y notificaciones en tiempo real de cada evento.',
  },
  {
    icon: FileCheck,
    title: 'Autorizaciones Médicas',
    desc:  'Seguimiento en tiempo real del estado de tus autorizaciones médicas.',
  },
  {
    icon: Shield,
    title: 'Seguridad',
    desc:  'Encriptación de datos, autenticación JWT y protección contra ataques.',
  },
];

const STEPS = [
  {
    num:   '01',
    title: 'Regístrate',
    desc:  'Crea tu cuenta con tu cédula en menos de 2 minutos.',
  },
  {
    num:   '02',
    title: 'Agenda tu cita',
    desc:  'Elige especialidad, médico, sede y horario disponible.',
  },
  {
    num:   '03',
    title: 'Gestiona tu salud',
    desc:  'Consulta historial, medicamentos y recibe notificaciones.',
  },
];

// Specialty chip colors are forced via inline style to avoid dark-mode bg-*-50 overrides
const SPECIALTIES = [
  { icon: Stethoscope, name: 'Medicina General', iconColor: '#8B5CF6', bg: '#F5F3FF' },
  { icon: Smile,       name: 'Odontología',      iconColor: '#EAB308', bg: '#FEFCE8' },
  { icon: Baby,        name: 'Pediatría',         iconColor: '#EC4899', bg: '#FDF2F8' },
  { icon: Heart,       name: 'Ginecología',       iconColor: '#F43F5E', bg: '#FFF1F2' },
  { icon: HeartPulse,  name: 'Cardiología',       iconColor: '#EF4444', bg: '#FEF2F2' },
  { icon: Sparkles,    name: 'Dermatología',      iconColor: '#F97316', bg: '#FFF7ED' },
  { icon: Eye,         name: 'Oftalmología',      iconColor: '#06B6D4', bg: '#ECFEFF' },
  { icon: Brain,       name: 'Psicología',        iconColor: '#6366F1', bg: '#EEF2FF' },
];

const LOCATIONS = [
  {
    name:    'Sede Norte',
    address: 'Calle 100 #15-20, Bogotá',
    phone:   '601-123-4567',
    hours:   'Lun–Vie 6:00–20:00 · Sáb 7:00–14:00',
  },
  {
    name:    'Sede Centro',
    address: 'Carrera 7 #32-16, Bogotá',
    phone:   '601-234-5678',
    hours:   'Lun–Vie 6:00–20:00 · Sáb 7:00–14:00',
  },
  {
    name:    'Sede Sur',
    address: 'Autopista Sur #68-50, Bogotá',
    phone:   '601-345-6789',
    hours:   'Lun–Vie 7:00–19:00 · Sáb 8:00–13:00',
  },
  {
    name:    'Sede Occidental',
    address: 'Calle 13 #50-25, Bogotá',
    phone:   '601-456-7890',
    hours:   'Lun–Vie 7:00–19:00 · Sáb 8:00–13:00',
  },
];

const TESTIMONIALS = [
  {
    initials: 'AM',
    name:     'Ana Martínez',
    role:     'Paciente afiliada',
    avatarBg: '#8B5CF6',
    text:     'Agendar citas nunca había sido tan fácil. Ya no tengo que llamar ni hacer filas. Todo desde mi celular en minutos.',
  },
  {
    initials: 'CM',
    name:     'Dr. Carlos Mendoza',
    role:     'Médico General',
    avatarBg: '#06B6D4',
    text:     'El portal médico me permite gestionar todas mis consultas de forma organizada. Puedo ver el historial del paciente antes de cada cita.',
  },
  {
    initials: 'CR',
    name:     'Carlos Rodríguez',
    role:     'Paciente afiliado',
    avatarBg: '#10B981',
    text:     'Me encanta poder ver mi historial y controlar mis medicamentos desde el celular. La renovación automática es increíble.',
  },
];

const FOOTER_COLS = [
  {
    title: 'Producto',
    links: ['Funcionalidades', 'Especialidades', 'Sedes', 'Precios'],
  },
  {
    title: 'Empresa',
    links: ['Sobre nosotros', 'Blog', 'Trabaja con nosotros', 'Contacto'],
  },
  {
    title: 'Legal',
    links: ['Términos de uso', 'Privacidad', 'Política de datos', 'Cookies'],
  },
];

const SOCIAL_ICONS = [Facebook, Twitter, Instagram, Linkedin];

// ── Nav links ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Funcionalidades', target: 'features'    },
  { label: 'Especialidades',  target: 'specialties' },
  { label: 'Sedes',           target: 'locations'   },
  { label: 'Contacto',        target: 'contact'     },
];

// ── Navbar ────────────────────────────────────────────────────────────────────

const Navbar = ({ scrolled }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
      style={scrolled ? { backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
              <HeartPulse size={17} className="text-white" />
            </div>
            <span
              className="font-bold text-lg tracking-tight transition-colors duration-300"
              style={{ color: scrolled ? '#111827' : '#ffffff' }}
            >
              EPS Portal
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <button
                key={link.target}
                onClick={() => scrollTo(link.target)}
                className="text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{ color: scrolled ? '#4B5563' : 'rgba(255,255,255,0.85)' }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                color:           scrolled ? '#374151' : 'rgba(255,255,255,0.9)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = scrolled ? '#F3F4F6' : 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className={`text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                scrolled ? 'gradient-primary text-white shadow-sm hover:shadow-md' : ''
              }`}
              style={!scrolled ? { backgroundColor: '#ffffff', color: '#7C3AED', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : {}}
            >
              Registrarse
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: scrolled ? '#374151' : '#ffffff' }}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu — always light */}
      {menuOpen && (
        <div
          className="md:hidden border-t shadow-xl animate-fade-in-up"
          style={{ backgroundColor: '#ffffff', borderColor: '#F3F4F6' }}
        >
          <div className="px-4 pt-3 pb-4 space-y-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.target}
                onClick={() => scrollTo(link.target)}
                className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium transition-colors"
                style={{ color: '#374151' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-colors"
                style={{ color: '#374151', border: '1px solid #E5E7EB', backgroundColor: '#ffffff' }}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="py-2.5 px-4 rounded-xl text-center text-white gradient-primary text-sm font-semibold shadow-sm"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// ── LandingPage ───────────────────────────────────────────────────────────────

const LandingPage = () => {
  const scrolled = useScrolled();

  // This page is always light — remove .dark while mounted and restore on unmount
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    html.classList.remove('dark');
    return () => {
      if (hadDark) html.classList.add('dark');
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    // light-surface: belt-and-suspenders in case the effect hasn't fired yet
    <div className="light-surface min-h-screen overflow-x-hidden" style={{ backgroundColor: '#ffffff' }}>
      <Navbar scrolled={scrolled} />

      {/* ─────────────────────── HERO ─────────────────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pb-0 pt-16"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-white/5 rounded-full" />
          <div className="absolute top-[20%] right-[10%] w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute top-[55%] left-[5%] w-24 h-24 bg-white/5 rounded-full" />
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/40 rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white/25 rounded-full" />
          <div className="absolute bottom-2/5 left-1/5 w-1.5 h-1.5 bg-white/50 rounded-full" />
          <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-white/30 rounded-full" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-8 border border-white/25">
            <HeartPulse size={15} />
            <span>Portal del Afiliado · EPS Colombia</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.15] mb-6">
            Tu salud, a un clic
            <span className="block">de distancia</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gestiona tus citas médicas, medicamentos e historial clínico desde un solo lugar.
            El portal más completo para afiliados y médicos de EPS en Colombia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition-all duration-200"
              style={{ backgroundColor: '#ffffff', color: '#7C3AED', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            >
              Comenzar ahora
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => scrollTo('features')}
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-200"
            >
              Conocer más
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 w-full max-w-3xl mx-auto mt-14 mb-0">
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {STATS.map(s => (
              <div
                key={s.label}
                className="py-6 px-4 text-center"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
              >
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{s.value}</p>
                <p className="text-xs sm:text-sm text-white/70 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg
            viewBox="0 0 1440 72"
            className="w-full block"
            style={{ fill: '#ffffff' }}
            preserveAspectRatio="none"
          >
            <path d="M0,36 C240,72 480,0 720,36 C960,72 1200,0 1440,36 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      {/* ─────────────────────── FEATURES ─────────────────────── */}
      <section id="features" className="py-20 sm:py-24 px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#111827' }}>
              Todo lo que necesitas en un solo portal
            </h2>
            <p className="max-w-lg mx-auto text-base leading-relaxed" style={{ color: '#6B7280' }}>
              Diseñado para pacientes y médicos. Simple, seguro y accesible desde cualquier dispositivo.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Reveal key={feat.title} delay={i * 70}>
                  <div
                    className="group rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #F3F4F6' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#EDE9FE'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; }}
                  >
                    <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-semibold mb-2 text-base" style={{ color: '#111827' }}>{feat.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{feat.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── HOW IT WORKS ─────────────────────── */}
      <section className="py-20 sm:py-24 px-4" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3">Proceso</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: '#111827' }}>¿Cómo funciona?</h2>
          </Reveal>

          <div className="relative">
            {/* Connector line — desktop only */}
            <div
              className="hidden lg:block absolute h-0.5 top-10 z-0"
              style={{
                left:       'calc(16.67% + 40px)',
                right:      'calc(16.67% + 40px)',
                background: 'linear-gradient(90deg, #C4B5FD, #67E8F9)',
              }}
            />

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-4">
              {STEPS.map((step, i) => (
                <Reveal key={step.num} delay={i * 120}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-5 shadow-lg z-10">
                      <span className="text-2xl font-extrabold text-white">{step.num}</span>
                    </div>

                    {i < 2 && (
                      <div className="lg:hidden mb-5" style={{ color: '#C4B5FD' }}>
                        <ArrowRight size={22} className="rotate-90" />
                      </div>
                    )}

                    <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed max-w-[200px]" style={{ color: '#6B7280' }}>{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="text-center mt-14" delay={200}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg"
            >
              Empezar ahora — es gratis
              <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────── SPECIALTIES ─────────────────────── */}
      <section id="specialties" className="py-20 sm:py-24 px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3">Servicios</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#111827' }}>Nuestras Especialidades</h2>
            <p style={{ color: '#6B7280' }}>Atención médica integral con profesionales especializados</p>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SPECIALTIES.map((sp, i) => {
              const Icon = sp.icon;
              return (
                <Reveal key={sp.name} delay={i * 55}>
                  <div
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl hover:shadow-md hover:scale-105 transition-all duration-300 cursor-default"
                    style={{ backgroundColor: sp.bg }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                      <Icon size={22} style={{ color: sp.iconColor }} />
                    </div>
                    <span className="text-sm font-semibold text-center leading-snug" style={{ color: '#374151' }}>{sp.name}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── LOCATIONS ─────────────────────── */}
      <section id="locations" className="py-20 sm:py-24 px-4" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3">Presencia</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#111827' }}>Nuestras Sedes</h2>
            <p style={{ color: '#6B7280' }}>Encuéntranos en diferentes puntos de la ciudad</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {LOCATIONS.map((loc, i) => (
              <Reveal key={loc.name} delay={i * 80}>
                <div
                  className="rounded-2xl p-6 hover:shadow-md transition-all duration-300"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #F3F4F6' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#EDE9FE'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                      <MapPin size={17} className="text-white" />
                    </div>
                    <h3 className="font-bold text-base" style={{ color: '#111827' }}>{loc.name}</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 text-sm" style={{ color: '#4B5563' }}>
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      <span>{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm" style={{ color: '#4B5563' }}>
                      <Phone size={14} className="flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      <span>{loc.phone}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm" style={{ color: '#4B5563' }}>
                      <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      <span>{loc.hours}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── TESTIMONIALS ─────────────────────── */}
      <section className="py-20 sm:py-24 px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3">Testimonios</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: '#111827' }}>Lo que dicen nuestros afiliados</h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div
                  className="rounded-2xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #F3F4F6' }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={14} style={{ fill: '#FBBF24', color: '#FBBF24' }} />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm leading-relaxed flex-1 mb-5 italic" style={{ color: '#4B5563' }}>
                    "{t.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: t.avatarBg }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{t.name}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── CTA FINAL ─────────────────────── */}
      <section
        className="relative py-24 px-4 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        </div>

        <Reveal className="relative z-10">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              ¿Listo para transformar<br className="hidden sm:block" /> la gestión de salud?
            </h2>
            <p className="text-white/80 text-lg mb-10">
              Únete a los miles de afiliados que ya gestionan su salud de forma digital.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-xl text-base hover:scale-105 transition-all duration-200"
              style={{ backgroundColor: '#ffffff', color: '#7C3AED', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
            >
              Crear cuenta gratis
              <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ─────────────────────── FOOTER ─────────────────────── */}
      <footer id="contact" className="pt-16 pb-8 px-4" style={{ backgroundColor: '#111827', color: '#ffffff' }}>
        <div className="max-w-6xl mx-auto">

          {/* 4-column grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">

            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <HeartPulse size={16} className="text-white" />
                </div>
                <span className="font-bold text-lg text-white">EPS Portal</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 max-w-[220px]" style={{ color: '#9CA3AF' }}>
                El portal más completo para la gestión de salud de afiliados y médicos en Colombia.
              </p>
              <div className="flex gap-2.5">
                {SOCIAL_ICONS.map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    onClick={e => e.preventDefault()}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7C3AED'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1F2937'; e.currentTarget.style.color = '#9CA3AF'; }}
                    aria-label="Red social"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-white mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a
                        href="#"
                        onClick={e => e.preventDefault()}
                        className="text-sm transition-colors duration-200"
                        style={{ color: '#9CA3AF' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Contacto</h4>
              <ul className="space-y-3 text-sm" style={{ color: '#9CA3AF' }}>
                <li className="flex items-center gap-2.5">
                  <Phone size={14} className="flex-shrink-0" style={{ color: '#A78BFA' }} />
                  01 8000 123 456
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail size={14} className="flex-shrink-0" style={{ color: '#A78BFA' }} />
                  atencion@eps.com.co
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#A78BFA' }} />
                  <span>Cra 7 #74-56, Bogotá, Colombia</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider + copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #1F2937' }}>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              © 2026 EPS Portal del Afiliado. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm" style={{ color: '#6B7280' }}>
              {['Términos', 'Privacidad', 'Datos'].map(label => (
                <a
                  key={label}
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.color = '#D1D5DB'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
