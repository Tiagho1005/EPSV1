---
name: Refactor — Login unificado sin selección de roles
description: Cambios realizados para eliminar el selector de portal del login
type: project
---

En sesión del 2026-04-09 se eliminó el selector manual de roles (tabs Paciente / Médico / Admin) del login.

**Why:** La selección manual generaba confusión — los usuarios nuevos pensaban que estaban eligiendo el tipo de cuenta a crear, no el portal de acceso.

**Cambios realizados:**
- `src/pages/AuthPage.jsx` — eliminado componente `PortalToggle`, estado `portal`, `portalIndex` e imports de `User/Stethoscope/Shield`
- `src/components/features/auth/LoginForm.jsx` — eliminado prop `portal`; subtítulo dinámico reemplazado por "Accede con tu cuenta asignada"; errores ahora siempre muestran mensaje genérico en frontend
- `src/services/api.js` — eliminado parámetro `portal` de `api.login()`
- `backend/src/routes/auth.js` — eliminada validación `portal !== userRole`; eliminado `PORTAL_LABELS`; error "cedula no registrada" cambiado a "Credenciales inválidas" para evitar enumeración de usuarios

**How to apply:** El sistema ahora es login universal — el rol lo devuelve el backend y el frontend redirige automáticamente. No volver a agregar selector de portal.
