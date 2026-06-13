# Política de Seguridad

## Versiones soportadas

Solo la rama `main` recibe correcciones de seguridad.

| Versión | Soportada |
|---|---|
| `main` | Sí |
| Otras | No |

## Reportar una vulnerabilidad

**No abras un issue público para problemas de seguridad.**

Usá [GitHub Security Advisories](https://github.com/Shinigamy19/Nexo-Digital/security/advisories/new) para reportar de forma privada.

Si no podés usar GitHub Advisories, contactá a un maintainer por el [grupo de WhatsApp](https://chat.whatsapp.com/Hbm9wubODmw2ycWx5DTcMZ).

Incluí:
1. Descripción clara del problema e impacto observado
2. Pasos para reproducir (o proof-of-concept)
3. Commit/tag afectado si lo conocés

Respuesta en **72 horas hábiles**. Seguimos la ventana de **90 días de divulgación responsable**.

## Modelo de amenaza

Sitio público de comunidad con:
- Visitantes anónimos y autenticados
- Contenido generado por usuarios no confiable (perfiles, links, usernames)
- Roles privilegiados: `user`, `moderator`, `admin`

**Fuera de alcance:**
- Vulnerabilidades en servicios de terceros (Supabase, hosting)
- Problemas autoinfligidos por exponer la `service_role` key
- Rate-limit / DDoS en capa de red

## Controles de seguridad implementados

### Autenticación y autorización
- **Supabase Auth** para login (email/password + OAuth)
- **RLS** en todas las tablas con datos de usuario
- **Roles** con jerarquía: user (0) < moderator (1) < admin (2)
- **2FA (TOTP)** obligatorio al login y cambio de email cuando está activo
- **Temp session cookie** para flujo de 2FA (expira en 5 minutos)

### Protección de endpoints
- **CSRF** validado por `Origin` en todos los POST a `/api/*`
- **Open redirect** bloqueado via `safeRedirect()`
- **Auth check** en middleware para rutas protegidas
- **API responses** con JSON 401/403 (no redirigen a HTML)

### Validación de datos
- **Inputs validados server-side** en todas las API routes
- **Passwords** mínimo 8 caracteres
- **Usernames** validados con regex + lista de reservados
- **URLs** validadas con allowlist de dominios para avatares
- **Rate limiting** básico por endpoint

### Privacidad
- **Errores genéricos** en login/recuperación (sin enumeración de cuentas)
- **Email leak** removido del signup (no se retorna en errores)
- **No PII en logs** — console output nunca incluye emails o tokens completos
- **Service role key** solo en server-side, nunca en el bundle del cliente

### Infraestructura
- **Security headers** en middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (sin cámara, micrófono, geolocalización)
  - `Strict-Transport-Security` (HSTS)
  - `Cross-Origin-Opener-Policy: same-origin`
- **Cookies** con `HttpOnly`, `Secure`, `SameSite=Lax`

### Moderación
- **Audit log** inmutable (`moderation_log`) — toda acción queda registrada
- **Rechazo obligatorio** — al rechazar, el moderador debe escribir el motivo
- **El autor recibe feedback** visible en `/mis-envios`

## Checklist de hardening para producción

- [ ] `PUBLIC_SITE_URL` apunta a la URL HTTPS real
- [ ] HSTS habilitado en el edge
- [ ] Supabase Auth → URL Configuration restringe redirects a tu dominio
- [ ] OAuth redirect URIs coinciden exactamente con `<PUBLIC_SITE_URL>/auth/callback`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo está en variables de entorno del servidor
- [ ] Backups de base de datos habilitados en Supabase
- [ ] Al menos un usuario `admin` existe
- [ ] `.env` nunca fue commiteado (verificar con `git log --all -- .env`)
- [ ] No hay secrets hardcoded en el código fuente

## Variables de entorno sensibles

| Variable | Nivel | Riesgo si se expone |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Acceso completo a la DB, bypass RLS |
| `DATABASE_URL` | Server-only | Acceso directo a PostgreSQL |
| `DIRECT_URL` | Server-only | Acceso directo a PostgreSQL |
| `PUBLIC_SUPABASE_ANON_KEY` | Público | Bajo riesgo (RLS protege) |
| `PUBLIC_SUPABASE_URL` | Público | Sin riesgo |
| `PUBLIC_SITE_URL` | Público | Sin riesgo |

## Actualización de dependencias

Dependabot (o equivalente) flaggea paquetes desactualizados. Bumps de versión mayor — especialmente `@supabase/*`, `astro`, `prisma` — deben revisarse contra sus changelogs antes de mergear.
