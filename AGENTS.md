# AGENTS.md — Convenciones de código

Este archivo documenta las convenciones y el contexto que debe conocer cualquier asistente AI (o contributor humano) al trabajar en el código de Nexo Digital.

## Stack

| Herramienta | Versión | Notas |
|---|---|---|
| Astro | 6.4.x | `output: 'static'` + `@astrojs/node` standalone |
| Supabase | 2.x | Auth manual (sin GoTrueClient), no RLS usada en API routes |
| Prisma | 5.x | ORM, cliente generado en `node_modules/.prisma` |
| TypeScript | 6.x | Strict mode |
| Node | >=22.12 | Solo LTS |

## Arquitectura clave

### SSR con `output: 'static'`

Astro 6 no tiene modo `hybrid`. Las páginas SSR usan `export const prerender = false` y funcionan porque `@astrojs/node` sirve rutas con `prerender = false` como server-side. Las rutas con `prerender = true` (default) se renderizan a estáticos en build.

### Sesión manual (sin GoTrueClient)

La sesión de Supabase se maneja con cookies manuales (`auth-cookie.ts`):

1. **Login**: API route escribe cookie `sb-{ref}-auth-token` con JSON del session
2. **Middleware**: Lee cookie, refresca si falta <10min, inyecta `context.locals.user`
3. **Logout**: Borra cookie

No se usa `@supabase/ssr` storage adapter — tiene race conditions con Astro 6.

### 2FA con temp session

1. Usuario login → API verifica `profile.two_factor_enabled`
2. Si tiene 2FA activo → guarda sesión temporal en cookie `sb-2fa-pending` (5 min)
3. Redirige a `/verificar-2fa` → usuario ingresa código TOTP
4. API valida y escribe sesión real

## Convenciones de código

### Estilo general

- **No agregar comentarios** en el código a menos que sea estrictamente necesario para aclarar lógica no obvia
- Nombres de variables/funciones en camelCase (TypeScript/JS), kebab-case para archivos `.astro`
- Tipos exportados desde `src/types/database.ts`
- Los helpers de server van en `src/lib/`, componentes en `src/components/`

### CSS

- **CSS Modules** para componentes (`*.module.css`), importados como `import styles from './index.module.css'`
- Las clases se usan con `class={styles.clase}` en Astro
- Si se necesita manipular estilos desde JS en el cliente (posicionamiento dinámico, etc.), usar **inline styles** porque los nombres de clase CSS Module se hashean en build
- Variables CSS globales en `src/styles/` (neon cyan accent: `#00f5ff`)

### Enums con ñ (Prisma)

Prisma no permite caracteres especiales en nombres de enum. Se usa `@map`:

```prisma
diseno @map("diseño")
```

Del lado de TypeScript, se mapea en `src/lib/prisma.ts` con funciones `toPrisma*()`.

### Formularios y validación

- Todos los forms usan `method="POST"` con `FormData`
- Server-side validation en API routes usando helpers de `src/lib/validation.ts`
- Errores se pasan como query params (`?error=invalid_title`) en redirect
- Mensajes de error en español en `src/lib/submission-errors.ts`

### API routes

- Formato: `APIRoute` exportado desde `src/pages/api/*.ts`
- CSRF: `isSameOrigin()` validado en todos los POST/PUT/DELETE
- Auth: `context.locals.user` en middleware, verificar rol con `isModerator()`/`isAdmin()`
- Respuestas: JSON 401/403 para no-auth, redirect 303 para páginas HTML
- Todas las rutas de contenido usan Prisma directamente (no Supabase RLS en server)

### Moderación

El panel de moderación (`src/pages/moderacion.astro`) maneja 5 tabs:

| Tab | Modelo | Filtro |
|---|---|---|
| `job` | `Job` | Pendientes / Activos (no expirados) / Archivados (expirados) |
| `resource` | `Resource` | Pendientes / Activos |
| `project` | `Project` | Pendientes / Activos |
| `event` | `Event` | Pendientes / Activos |
| `featured` | `FeaturedCandidate` | Pendientes / Activos |

### Featured (destacado)

- `Project.featured`, `Job.featured`, `Resource.featured`, `Event.featured` — `Boolean @default(false)`
- `FeaturedCandidate.isActive` — controla visibilidad en carrusel (separado de `status`)
- Featured toggle se hace vía `PUT /api/admin/content` con body `{ featured: "true" }`

### Publishing (contenido público)

Todas las listas públicas (`/empleos`, `/recursos`, `/proyectos`, `/eventos`) consultan Prisma con `status: 'approved'` y tienen fallback a JSON estático en `src/data/`.

Los empleos además filtran por `expiresAt`: se excluyen los que ya expiraron.

### Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` es **server-only** (nunca en bundle del cliente)
- Usernames reservados en `src/lib/security.ts`
- `safeRedirect()` bloquea open redirects
- Security headers via middleware (`X-Frame-Options: DENY`, CSP, HSTS, etc.)
- Errores genéricos en login (sin enumeración de cuentas)

## Comandos útiles

| Comando | Uso |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build producción |
| `npm run typecheck` | Astro Check |
| `npx tsc --noEmit` | TypeScript check |
| `npm run smoke` | Smoke test |
| `npm run db:check` | Verificar DB |
| `npx prisma db push` | Sincronizar schema |
| `npx prisma generate` | Regenerar cliente |
| `npx prisma studio` | UI de datos |

## Debugging

- Si el dev server no arranca en 4321 (ocupado), usa el próximo disponible — revisar la terminal
- Si `prisma generate` falla con EPERM, matar procesos node y reintentar
- Si los estilos CSS Module no se aplican, verificar que la clase esté importada y que no se intente acceder desde JS del lado del cliente (los nombres se hashean)
