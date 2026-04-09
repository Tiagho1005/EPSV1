# EPS Portal del Afiliado

Portal web completo para afiliados, médicos y administradores de una EPS (Entidad Promotora de Salud) colombiana. Permite agendar citas, consultar historial médico, gestionar medicamentos con tracking de dosis, renovar recetas, gestionar autorizaciones médicas y descargar certificados — todo desde una interfaz moderna con soporte de modo oscuro y asistente virtual integrado.

---

## Estado actual del proyecto

> **MVP funcional** — Backend migrado a MySQL. Todas las rutas operan con base de datos relacional. El proyecto está listo para pruebas integrales y hardening hacia producción.

| Módulo | Estado |
|---|---|
| Autenticación (paciente / médico / admin) | Completo |
| Dashboard del paciente | Completo |
| Agendar, cancelar y reagendar citas | Completo |
| Historial médico | Completo |
| Medicamentos con tracking de dosis | Completo |
| Renovación de recetas | Completo |
| Autorizaciones médicas | Completo |
| Certificados y descarga de PDFs | Completo |
| Dashboard de salud (signos vitales + gráficas) | Completo |
| Portal médico (agenda, diagnósticos, renovaciones) | Completo |
| Panel de administración | Completo |
| Recordatorios de medicamentos por email | Completo |
| Asistente virtual (FAQ + Claude API) | Completo |
| Modo oscuro | Completo |
| Tests backend (Jest + Supertest) | Parcial |
| Tests frontend | Pendiente |
| Producción / Docker | Pendiente |

---

## Tecnologías

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.2 | UI framework |
| Vite | 7.3 | Build tool |
| Tailwind CSS | 4.2 | Estilos |
| React Router | 7.13 | Enrutamiento SPA |
| Recharts | 3.8 | Gráficas de signos vitales |
| jsPDF + autotable | 4.2 / 5.0 | Generación de PDFs |
| Lucide React | 0.577 | Iconografía |
| Vitest | 3.2 | Testing |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| Express | 4.19 | Framework HTTP |
| MySQL2 | 3.20 | Base de datos |
| jsonwebtoken | 9.0 | Autenticación JWT |
| bcryptjs | 2.4 | Hash de contraseñas |
| Nodemailer | 8.0 | Envío de emails |
| Winston | 3.19 | Logging |
| node-cron | 4.2 | Scheduler de recordatorios |
| Helmet | 8.1 | Cabeceras de seguridad |
| express-rate-limit | 8.3 | Protección brute force |
| Jest + Supertest | 29.7 / 7.2 | Testing |

### Base de datos
| Motor | Uso |
|---|---|
| MySQL 8+ | Base de datos principal (pool de 10 conexiones, UTF8MB4, UTC) |

---

## Instalación y uso

### Requisitos previos
- Node.js ≥ 18
- npm ≥ 9
- MySQL 8+ corriendo en localhost:3306

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd EPSV1
```

### 2. Base de datos

Crea la base de datos y carga el esquema:

```bash
mysql -u root -p < schema.sql
```

### 3. Backend

```bash
cd backend
npm install
```

Configura las variables de entorno:

```bash
cp .env.example .env
```

Variables requeridas en `backend/.env`:

```env
PORT=3001
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu-password
DB_NAME=eps_db
```

Variables opcionales:

```env
# Email (sin configurar usa Ethereal como bandeja de prueba)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASS=tu-app-password
EMAIL_FROM="EPS Portal" <noreply@eps.com>

# Asistente virtual
ANTHROPIC_API_KEY=tu-api-key-aqui
```

Iniciar el servidor:

```bash
npm run dev    # desarrollo (nodemon)
npm start      # producción
```

El backend queda disponible en `http://localhost:3001`.

### 4. Frontend

Abre una nueva terminal en la raíz del proyecto:

```bash
cd EPSV1       # raíz (no /backend)
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

> Si el backend está en otra URL, crea `.env` en la raíz:
> ```env
> VITE_API_URL=http://tu-backend.com/api
> ```

---

## Credenciales de prueba

| Portal | Cédula | Contraseña |
|---|---|---|
| Paciente | `1234567890` | `Password123!` |
| Médico — Dr. Carlos Mendoza (Medicina General) | `1000100001` | `Password123!` |
| Médico — Dra. Laura Pérez (Ginecología) | `1000100002` | `Password123!` |
| Médico — Dra. Ana Martínez (Pediatría) | `1000100003` | `Password123!` |
| Médico — Dr. Miguel Ángel Ruiz (Cardiología) | `1000100004` | `Password123!` |
| Médico — Dr. Fernando Torres (Dermatología) | `1000100005` | `Password123!` |
| Médico — Dr. Jorge Sánchez (Odontología) | `1000100006` | `Password123!` |
| Médico — Dra. Patricia Gómez (Oftalmología) | `1000100007` | `Password123!` |
| Médico — Dr. Andrés Ramírez (Psicología) | `1000100008` | `Password123!` |
| Administrador | `9999999999` | `Password123!` |

---

## Estructura del proyecto

```
EPSV1/
├── schema.sql                           # Esquema completo de MySQL
├── API.md                               # Documentación de los 60 endpoints REST
├── backend/
│   ├── server.js                        # Entry point — conexión DB + servidor
│   ├── .env                             # Variables de entorno (no comitear)
│   └── src/
│       ├── app.js                       # Express: middlewares + rutas
│       ├── config/
│       │   ├── mysql.js                 # Pool de conexiones MySQL
│       │   ├── mailer.js                # Nodemailer (SMTP / Ethereal)
│       │   └── logger.js                # Winston (consola + archivos)
│       ├── middleware/
│       │   ├── auth.js                  # Verificación JWT
│       │   ├── requireRole.js           # Control de acceso por rol
│       │   ├── sanitize.js              # Sanitización XSS
│       │   └── errorHandler.js          # Manejo global de errores
│       ├── routes/                      # 14 módulos de rutas REST
│       ├── services/
│       │   └── reminderScheduler.js     # Cron: recordatorios de medicamentos
│       ├── utils/
│       │   ├── formatUser.js            # Sanitiza objeto usuario
│       │   └── validators.js            # Validación de contraseñas
│       └── __tests__/                   # Jest + Supertest
└── src/
    ├── App.jsx                          # Rutas y guards de navegación
    ├── components/
    │   ├── features/                    # Componentes por dominio
    │   │   ├── appointments/
    │   │   ├── auth/
    │   │   ├── chat/
    │   │   ├── dashboard/
    │   │   ├── medications/
    │   │   ├── medical_history/
    │   │   └── profile/
    │   ├── layout/                      # Header, Sidebar, MainLayout
    │   └── ui/                          # Button, Modal, Toast, Skeleton…
    ├── context/                         # AuthContext, ToastContext, ThemeContext…
    ├── hooks/                           # useForm, useDebounce, useSessionTimeout…
    ├── pages/
    │   ├── admin/                       # Panel administración
    │   ├── medico/                      # Portal médico
    │   └── *.jsx                        # Portal paciente
    ├── services/
    │   └── api.js                       # Cliente HTTP centralizado
    └── utils/                           # constants, formatters, validators, pdfGenerator
```

---

## Scripts disponibles

**Frontend**
```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run preview      # previsualizar build
npm run test         # ejecutar tests (Vitest)
npm run test:watch   # tests en modo watch
```

**Backend**
```bash
npm run dev          # servidor con nodemon
npm start            # servidor de producción
npm test             # tests con Jest
```

---

## Arquitectura de seguridad

- **JWT** con JTI único por sesión, expiración de 24h
- **Bloqueo de cuenta**: 5 intentos fallidos → bloqueo de 15 minutos
- **Contraseñas**: bcrypt (10 rounds) + reglas de complejidad + historial de 5 contraseñas
- **Rate limiting**: 20 req/15min en auth, 200 req/15min en API general
- **Sanitización XSS**: middleware que limpia todos los inputs
- **Helmet.js**: cabeceras de seguridad HTTP
- **Queries parametrizadas**: 100% protección contra SQL injection
- **Roles**: `paciente`, `medico`, `admin` — con guards en frontend y backend

---

## Roadmap

### Alta prioridad
- [ ] Persistencia del blacklist de JWT (Redis o tabla MySQL)
- [ ] Validación y límite de tamaño en subida de fotos (base64 → almacenamiento externo)
- [ ] Rate limiting en endpoint de verificación de código de reset
- [ ] Audit log de acciones admin
- [ ] Tests frontend (Vitest + Testing Library)

### Media prioridad
- [ ] Dockerización del stack completo (frontend + backend + MySQL)
- [ ] Pipeline CI/CD (GitHub Actions)
- [ ] Scripts de migración de datos (db.json → MySQL)
- [ ] Notificaciones push (Web Push API) para recordatorio de citas
- [ ] API versioning (`/api/v1/`)
- [ ] CORS dinámico para entornos no-localhost

### Baja prioridad
- [ ] Almacenamiento de fotos en S3/Cloudinary
- [ ] WebSockets para notificaciones en tiempo real
- [ ] Versión móvil nativa (React Native)
- [ ] Firma digital en certificados PDF
- [ ] Internacionalización (i18n)
- [ ] Dashboard de métricas del sistema (Grafana / Prometheus)

---

## Tareas pendientes (backlog ordenado)

```
[CRÍTICO]
 1. Implementar Redis o tabla `jwt_blacklist` para logout persistente
 2. Mover fotos a almacenamiento externo (S3); validar MIME type y tamaño (<2MB)
 3. Agregar rate limiting en POST /api/auth/verify-code

[ALTA]
 4. Agregar tabla `audit_log` y registrar acciones destructivas del admin
 5. Completar tests de rutas /admin y /health-metrics en el backend
 6. Escribir tests de componentes frontend (AuthContext, AppointmentStepper)
 7. Documentar variables de entorno de producción y proceso de despliegue

[MEDIA]
 8. Crear Dockerfile para backend y docker-compose con MySQL
 9. Configurar GitHub Actions para lint + tests en PR
10. Agregar script seed para poblar MySQL con datos de prueba
11. Implementar paginación en rutas que devuelven listas grandes (admin/users)
12. Reemplazar setTimeout/setInterval del scheduler por cron expresiones robustas

[BAJA]
13. Agregar firma digital a PDFs generados con jsPDF
14. Internacionalizar mensajes de error del backend (actualmente en español hardcoded)
15. Implementar WebSockets para notificaciones en tiempo real
```
