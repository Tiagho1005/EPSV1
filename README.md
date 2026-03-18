# EPS Portal del Afiliado

Portal web para afiliados y médicos de una EPS (Entidad Promotora de Salud) colombiana. Permite agendar citas, consultar historial médico, gestionar medicamentos con tracking de dosis y renovar recetas, todo desde una interfaz moderna con soporte de modo oscuro.

---

## Screenshots

![Login](screenshots/login.png)
![Dashboard Paciente](screenshots/dashboard.png)
![Agendar Cita](screenshots/new-appointment.png)
![Portal Médico](screenshots/medico-dashboard.png)

---

## Tecnologías

**Frontend**
| Tecnología | Versión |
|---|---|
| React | 19 |
| Vite | 7 |
| Tailwind CSS | 4 |
| React Router | 7 |
| Lucide React | 0.577 |

**Backend**
| Tecnología | Versión |
|---|---|
| Node.js | ≥ 18 |
| Express | 4 |
| JSON Web Token | 9 |
| bcryptjs | 2.4 |
| Nodemailer | 8 |
| Winston | 3 |

**Base de datos:** archivo `backend/data/db.json` (JSON persistido en disco con backups automáticos)

---

## Instalación y ejecución

### Requisitos previos

- Node.js ≥ 18
- npm ≥ 9

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd EPSV1
```

### 2. Backend

```bash
cd backend
npm install
```

Copia el archivo de variables de entorno y completa los valores:

```bash
cp .env.example .env
```

Variables requeridas en `.env`:

```env
PORT=3001
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio
```

Las variables de email son opcionales en desarrollo — si no se configuran, se usa [Ethereal](https://ethereal.email/) como bandeja de prueba.

Inicia el servidor:

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El backend queda disponible en `http://localhost:3001`.

### 3. Frontend

Abre una nueva terminal en la raíz del proyecto:

```bash
cd EPSV1   # raíz del proyecto (no /backend)
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

> Si el backend está en una URL diferente, crea un archivo `.env` en la raíz del proyecto con:
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

---

## Estructura de carpetas

```
EPSV1/
├── backend/
│   ├── data/
│   │   ├── db.json                  # Base de datos principal
│   │   └── backups/                 # Backups automáticos
│   └── src/
│       ├── config/                  # DB, mailer, configuración
│       ├── middleware/              # Auth JWT, manejo de errores
│       ├── routes/                  # Endpoints REST
│       └── __tests__/               # Tests con Jest + Supertest
└── src/
    ├── components/
    │   ├── features/                # Componentes por dominio
    │   │   ├── appointments/        # Citas médicas
    │   │   ├── auth/                # Login, registro
    │   │   ├── dashboard/           # Widgets del dashboard
    │   │   ├── medications/         # Medicamentos y dosis
    │   │   ├── medical_history/     # Historial médico
    │   │   └── profile/             # Perfil del afiliado
    │   ├── layout/                  # Header, sidebar, layout base
    │   └── ui/                      # Componentes reutilizables (Button, Modal, etc.)
    ├── context/                     # Estado global con React Context
    ├── data/                        # Datos estáticos de catálogos
    ├── hooks/                       # Custom hooks
    ├── pages/
    │   ├── medico/                  # Portal médico
    │   └── *.jsx                    # Páginas del portal paciente
    ├── services/
    │   └── api.js                   # Cliente HTTP para el backend
    └── utils/                       # Formateadores, validadores, constantes
```

---

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Autenticación (login, registro, recuperación de contraseña) | Completo |
| Dashboard del paciente | Completo |
| Agendar, cancelar y reagendar citas | Completo |
| Historial médico | Completo |
| Medicamentos con tracking de dosis | Completo |
| Renovación de recetas | Completo |
| Portal médico (agenda, renovaciones) | Completo |
| Perfil del afiliado | Completo |
| Modo oscuro | Completo |
| Notificaciones por email | Completo (configurable) |
| Tests backend | Completo |

### Próximos pasos

- [ ] Reemplazar la base de datos JSON por PostgreSQL o MongoDB
- [ ] Subida de foto de perfil real (almacenamiento en S3 o similar)
- [ ] Notificaciones push para recordatorio de citas
- [ ] Versión móvil nativa (React Native)
- [ ] Panel de administración para gestión de médicos y sedes

---

## Scripts disponibles

**Frontend**
```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run preview      # previsualizar build
npm run test         # ejecutar tests
npm run test:watch   # tests en modo watch
```

**Backend**
```bash
npm run dev          # servidor con nodemon
npm start            # servidor de producción
npm test             # ejecutar tests con Jest
```
