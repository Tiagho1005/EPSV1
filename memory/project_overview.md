---
name: Project Overview — GestionCitas
description: Stack, arquitectura general y propósito del proyecto
type: project
---

Aplicación web de gestión de citas médicas para una EPS (Entidad Promotora de Salud) colombiana.

**Stack:**
- Frontend: React + Vite + TailwindCSS + React Router (SPA)
- Backend: Node.js + Express + MySQL (pool via `mysql2`)
- Auth: JWT (24h expiry) + bcryptjs + localStorage (`eps_session`)
- Estilos: Tailwind con tokens propios (`primary`, `secondary`, `error`, `warning`)

**Estructura de carpetas clave:**
- `src/pages/` — páginas (AuthPage, LoginPage, etc.)
- `src/components/features/auth/` — LoginForm, RegisterForm, RecoverPasswordForm
- `src/context/` — AuthContext, ToastContext
- `src/services/api.js` — cliente HTTP centralizado
- `src/utils/constants.js` — ROUTES, MAX_LOGIN_ATTEMPTS, etc.
- `backend/src/routes/` — auth.js, admin.js, appointments.js, etc.
- `backend/src/middleware/` — auth.js (JWT verify), requireRole.js
- `backend/src/utils/formatUser.js` — sanitiza el objeto user antes de enviarlo al frontend

**Roles de usuario:** `paciente | medico | admin` (ENUM en MySQL)

**Redirección por rol:**
- `paciente` → `/dashboard`
- `medico` → `/medico/dashboard`
- `admin` → `/admin/dashboard`

**Seguridad implementada:**
- Bloqueo de cuenta tras 5 intentos fallidos (15 min)
- Historial de últimas 5 contraseñas
- Rate limiting: 20 req/15min en endpoints de auth
- JWT blacklist por JTI (in-memory Set; pendiente migrar a Redis)
