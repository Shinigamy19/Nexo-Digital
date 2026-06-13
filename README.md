# Nexo Digital 🌐

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-6-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Comunidad para creadores del mundo digital.**

Nexo Digital es una comunidad open source para desarrolladores, diseñadores, editores de video, músicos, creadores de contenido, entusiastas de la IA, domótica y toda disciplina creativa-tecnológica.

## Funcionalidades del sitio

- **🌐 Landing** — Presentación de la comunidad y canales
- **📂 Proyectos** — Biblioteca de proyectos open source impulsados por la comunidad (DB + JSON fallback)
- **📚 Recursos** — Herramientas, tutoriales y recursos curados por la comunidad
- **💼 Empleos** — Búsquedas laborales tech con publicación directa, expiración automática y modo archivado
- **📅 Eventos** — Calendario de eventos, workshops, hackathons y encuentros
- **⭐ Candidatos destacados** — Carrusel coverflow con candidatos de la comunidad
- **👤 Perfiles** — Login, registro, edición de perfil, OAuth (Google + GitHub), redes sociales
- **🔐 Verificación en dos pasos (2FA)** — TOTP con Google Authenticator / Authy
- **🛡️ Moderación** — Cola de revisión con tabs dinámicas (pendientes, activos, archivados), edición inline, toggle de destacado
- **⚙️ Panel de administración** — Gestión de usuarios y roles (solo admins)
- **✏️ Edición inline** — Modal de edición para moderadores con campos dinámicos por tipo de contenido
- **🔒 Seguridad** — CSRF por Origin, open redirect protection, reserved usernames, security headers, audit log

## Stack tecnológico

| Herramienta | Uso |
|---|---|
| [Astro](https://astro.build) | Framework web (SSG + opt-in SSR) |
| [Supabase](https://supabase.com) | Auth, Postgres, RLS |
| [Prisma](https://prisma.io) | ORM para queries a la base de datos |
| [otpauth](https://www.npmjs.com/package/otpauth) | TOTP para verificación en dos pasos |
| [qrcode](https://www.npmjs.com/package/qrcode) | Generación de códigos QR para 2FA |
| CSS Modules | Estilos por componente |
| Vanilla CSS | Sistema de diseño global |
| TypeScript | Tipos en frontmatter + backmatter |
| Node adapter (`@astrojs/node`) | Render de páginas SSR y APIs |

## Instalación y desarrollo local

### Prerequisitos

- Node.js >= 22.12.0
- npm
- Una cuenta en [Supabase](https://supabase.com) (gratis)

### Clonar e instalar

```bash
git clone https://github.com/Shinigamy19/Nexo-Digital.git
cd Nexo-Digital
npm install
```

### Configurar Supabase

1. **Crear un proyecto** en [supabase.com/dashboard](https://supabase.com/dashboard) y guardar:
   - `Project URL` → `PUBLIC_SUPABASE_URL`
   - `Publishable key` (`sb_publishable_...`, browser-safe) → `PUBLIC_SUPABASE_ANON_KEY`
   - `Secret key` (`sb_secret_...`, ⚠️ server-only) → `SUPABASE_SERVICE_ROLE_KEY`

2. **Copiar las variables de entorno**:
   ```bash
   cp .env.example .env
   ```
   y completar los valores con los del paso anterior.

3. **Ejecutar las migraciones SQL** en el SQL Editor del dashboard:
   ```bash
   # Desde Prisma (recomendado)
   npx prisma db push

   # O ejecutar manualmente desde:
   # supabase/migrations/0001_user_system.sql
   # supabase/migrations/0002_portals.sql
   ```

4. **Generar el cliente Prisma**:
   ```bash
   npx prisma generate
   ```

5. **(Opcional) Habilitar providers de auth** en *Authentication → Providers*:
   - **Email** viene habilitado por defecto.
   - **Google** y/o **GitHub** requieren configurar OAuth y agregar `<PUBLIC_SITE_URL>/auth/callback` como redirect URL.

6. **Promoverse a moderador/admin** — después de registrarte, ejecutá en el SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'  -- o 'moderator'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');
   ```

## Roles disponibles

| Rol | Ver pendientes | Aprobar/rechazar | Gestionar usuarios |
|---|---|---|---|
| `user` | No | No | No |
| `moderator` | Sí | Sí | No |
| `admin` | Sí | Sí | Sí (panel `/moderacion/admin`) |

### Correr en local

```bash
npm run dev
```

El sitio estará disponible en `http://localhost:4321`.

### Verificar migraciones y check de DB

```bash
npm run db:check     # Muestra conteos de registros por tabla
npm run db:migrate   # Ejecuta migraciones pendientes
```

### Smoke & E2E tests

```bash
npm run smoke        # Smoke test básico (verifica que el server responde)
npm run e2e          # E2E test completo (requiere .env configurado)
```

### Build de producción

```bash
npm run start:prod
```

Desplegar en cualquier host con soporte para Node (Render, Fly, Railway, Vercel, etc.).

## Seguridad

### Variables de entorno

| Variable | ¿Se expone al navegador? | Descripción |
|---|---|---|
| `PUBLIC_SITE_URL` | Sí | URL del sitio |
| `PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (RLS protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Clave admin — solo server-side |
| `DATABASE_URL` | **No** | Connection string de PostgreSQL |
| `DIRECT_URL` | **No** | Connection string directo |

### Reglas de seguridad

- **Nunca** commitees `.env` ni claves reales.
- `SUPABASE_SERVICE_ROLE_KEY` es **server-only**. No debe aparecer en código que se ejecute en el navegador.
- Si encontrás una vulnerabilidad, **no abras un issue público**: usá [GitHub Security Advisories](https://github.com/Shinigamy19/Nexo-Digital/security/advisions/new).
- Ver [`SECURITY.md`](./SECURITY.md) para el modelo de amenaza completo y checklist de hardening.

### Controles de seguridad implementados

- **RLS** en todas las tablas con datos de usuario
- **CSRF** validado por `Origin` en todos los POST a `/api/*`
- **Open redirect** bloqueado via `safeRedirect()`
- **Passwords** mínimo 8 caracteres
- **Errores genéricos** en login/recuperación (sin enumeración de cuentas)
- **Usernames reservados** bloqueados en app y DB
- **Security headers** (HSTS, X-Frame-Options, etc.)
- **2FA** (TOTP) para login y cambio de email
- **Audit log** en moderación (`moderation_log`)

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guías de contribución.

### Contribuir código

1. Hacé un **fork** del repositorio
2. Creá una branch: `git checkout -b feature/mi-mejora`
3. Hacé tus cambios y commits: `git commit -m 'feat: descripción'`
4. Abrí un **Pull Request** hacia `main`

### Contribuir contenido

Los envíos se hacen desde el sitio:

```
Usuario → /empleos/nuevo (o /recursos/nuevo, /proyectos/nuevo)
       → API valida + inserta con status='pending'
       → Moderador revisa en /moderacion
       → Aprueba o rechaza (con motivo obligatorio)
       → Autor ve el resultado en /mis-envios
```

## Estructura del proyecto

```
Nexo-Digital/
├── prisma/
│   └── schema.prisma          # Schema de Prisma (models, enums, índices)
├── public/                     # Assets estáticos
├── src/
│   ├── assets/                 # Imágenes optimizadas
│   ├── components/             # Componentes Astro reutilizables
│   │   ├── auth/               # AuthCard, UserMenu, OAuthButtons
│   │   ├── events/             # EventCard, EventForm
│   │   ├── home/               # AreaCard, Presentation
│   │   ├── jobs/               # JobCard, CandidateSlider (coverflow), CandidateCard
│   │   ├── layout/             # Navbar, Footer
│   │   ├── profile/            # ProfileCard
│   │   ├── projects/           # ProjectCard
│   │   ├── resources/          # ResourceCard
│   │   └── ui/                 # StatusBadge, Pagination
│   ├── data/                   # JSON seed/fallback (proyectos, recursos, empleos, eventos)
│   ├── lib/                    # Helpers server-side
│   │   ├── env.ts              # Env vars centralizadas con validación
│   │   ├── prisma.ts           # PrismaClient singleton + enum mapping (ñ → en)
│   │   ├── auth-cookie.ts      # Cookie management + 2FA temp session + REST auth helpers
│   │   ├── two-factor.ts       # TOTP helpers (setup, verify, QR)
│   │   ├── supabase.ts         # Cliente Supabase server-side + admin
│   │   ├── supabase-browser.ts # Cliente Supabase para el navegador
│   │   ├── security.ts         # CSRF, safe redirect, reserved usernames, publicErrorCode
│   │   ├── roles.ts            # ROLE_RANK, isAuthenticated, isAdmin, canModerate
│   │   ├── validation.ts       # Form parsing helpers con límites
│   │   ├── portal-meta.ts      # Metadatos de portales (categorías, tipos, labels)
│   │   ├── portal-adapters.ts  # Mappers DB → Card props
│   │   └── submission-errors.ts# Mensajes de error en español
│   ├── pages/                  # Páginas del sitio
│   │   ├── index.astro         # Landing
│   │   ├── login.astro         # Login
│   │   ├── registro.astro      # Registro
│   │   ├── recuperar.astro     # Recuperación de contraseña
│   │   ├── verificar-2fa.astro # Verificación 2FA en login
│   │   ├── perfil/             # Perfil (ver, editar, 2FA setup)
│   │   ├── u/[username].astro  # Perfil público
│   │   ├── empleos/            # Portal de empleos (listado + creación)
│   │   ├── recursos/           # Portal de recursos (listado + creación)
│   │   ├── proyectos/          # Portal de proyectos (listado + creación)
│   │   ├── eventos/            # Portal de eventos (listado + creación)
│   │   ├── mis-envios.astro    # Tus envíos con estado de moderación
│   │   ├── moderacion.astro    # Cola de revisión (moderadores) con tabs, edición, archivados
│   │   ├── moderacion/admin.astro  # Panel admin (usuarios, roles)
│   │   └── api/                # Endpoints server-side (REST)
│   │       ├── auth/           # Login, signup, 2FA, password, email
│   │       ├── admin/          # Admin API (users, roles, content CRUD)
│   │       ├── featured-candidates/ # Featured candidates API
│   │       ├── perfil.ts       # Profile CRUD
│   │       ├── empleos.ts      # Job creation with expiresAt
│   │       ├── recursos.ts     # Resource creation
│   │       ├── proyectos.ts    # Project creation
│   │       ├── eventos.ts      # Event creation
│   │       └── moderacion.ts   # Moderation actions (approve/reject/edit/feature)
│   ├── styles/                 # CSS modules + global design system
│   ├── types/
│   │   └── database.ts         # TypeScript interfaces (Profile, Job, Project, etc.)
│   └── middleware.ts           # Auth, session refresh, security headers, 503 placeholder
├── scripts/
│   ├── smoke-test.mjs          # Smoke test básico
│   ├── e2e-test.mjs            # E2E test completo
│   ├── db-check.mjs            # Verificación de registros en DB
│   └── db-migrate.mjs          # Migración de datos entre schemas
├── supabase/
│   └── migrations/             # SQL migrations (RLS, funciones, triggers)
├── .env.example                # Template de variables de entorno
├── .gitignore                  # Archivos ignorados por git
├── AGENTS.md                   # Convenciones de código (para AI assistants)
├── SECURITY.md                 # Política de seguridad y modelo de amenaza
├── CONTRIBUTING.md             # Guía de contribución
├── CODE_OF_CONDUCT.md          # Código de conducta
├── LICENSE                     # MIT License
└── README.md                   # Este archivo
```

## Comandos útiles

| Comando | Qué hace |
|---|---|---|
| `npm run dev` | Dev server con HMR (puerto 4321) |
| `npm run build` | Genera `dist/` (estáticos + SSR) |
| `npm run start:prod` | Build + start en un paso |
| `npm run typecheck` | Type-check con Astro Check |
| `npx tsc --noEmit` | Type-check de TypeScript |
| `npm run smoke` | Smoke test básico |
| `npm run e2e` | E2E test completo |
| `npm run db:check` | Verifica estado de la DB |
| `npm run db:migrate` | Ejecuta migraciones |
| `npx prisma generate` | Regenerar cliente Prisma |
| `npx prisma db push` | Sincronizar schema con la DB |
| `npx prisma studio` | UI de Prisma para explorar datos |

## Features avanzadas

### 🕐 Expiración de empleos y modo Archivado

Los empleos tienen un campo opcional **Fecha de expiración** (`expiresAt`). Cuando se cumple la fecha:
- El empleo **desaparece** de la lista pública (`/empleos`)
- En el panel de moderación aparece en **📦 Archivados** (filtro automático)
- Los moderadores pueden editar o quitar la expiración desde el modal de edición

### ✏️ Edición inline en moderación

Los moderadores pueden editar cualquier contenido aprobado o pendiente sin salir del panel:
- Botón **✏️ Modificar** en cada item activo
- Modal con campos dinámicos según el tipo de contenido (texto, textarea, select, fecha, hora, URL, número)
- Los cambios se guardan vía `PUT /api/admin/content`

### ⭐ Destacar contenido

Moderadores y admins pueden marcar como destacados (featured):
- **Proyectos**, **Recursos**, **Empleos** y **Eventos** tienen toggle "⭐ Destacar" / "⭐ Quitar destacado"
- Los items destacados se muestran prioritariamente en las listas

### 🎠 Carrusel Coverflow de Candidatos Destacados

El componente `CandidateSlider` muestra candidatos destacados en un carrusel tipo coverflow:
- 3 cards visibles: la central destacada (escala 1), laterales atenuadas (escala 0.88, opacidad 0.55)
- Auto-play cada 4 segundos, pausa al hacer hover
- Navegación por teclado (flechas), swipe táctil, dots
- Modal de aplicación integrado

### 🔄 Tabs dinámicas en moderación

El panel de moderación actualiza los contadores de cada tab automáticamente después de aprobar/rechazar/eliminar contenido, sin recargar la página.

## Base de datos

### Schema (Prisma + PostgreSQL)

El schema completo está en [`prisma/schema.prisma`](prisma/schema.prisma). Modelos principales:

| Modelo | Descripción |
|---|---|
| `Profile` | Usuarios, roles, 2FA, redes sociales |
| `Job` | Ofertas de empleo con expiración |
| `Resource` | Recursos, tutoriales, herramientas |
| `Project` | Proyectos open source |
| `Event` | Eventos, workshops, hackathons |
| `FeaturedCandidate` | Candidatos destacados (con imagen base64) |
| `ModerationLog` | Auditoría de acciones de moderación |
| `ReservedUsername` | Usernames bloqueados |

### Enums con `@map`

Prisma no soporta caracteres especiales (ñ) en nombres de enum, por lo que se usa `@map`:
- `diseno @map("diseño")` — los formularios envían "diseño" con ñ, Prisma almacena "diseno"
- Lo mismo aplica a `ProjectCategory`, `ResourceCategory`, y `EventType` (`en_linea`)

### Data flow

```
Usuario → Formulario → API route → Prisma insert → DB (status: pending)
                                                          ↓
Moderador → /moderacion → API → Prisma update → DB (status: approved)
                                                          ↓
Público → /empleos, /recursos, /proyectos → Prisma query (status: approved)
```

## Licencia

[MIT](./LICENSE) — Nexo Digital © 2025
