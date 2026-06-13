# Guía de contribución — Nexo Digital

¡Gracias por querer contribuir a Nexo Digital!

Este repositorio es **open source** y toda aportación pasa por revisión de moderadores antes de aparecer en el sitio.

## Formas de contribuir

### 1. Contribuir contenido (desde el sitio)

Los envíos se hacen directamente desde el sitio web:

- **Empleos**: `/empleos/nuevo`
- **Recursos**: `/recursos/nuevo`
- **Proyectos**: `/proyectos/nuevo`

El flujo es:
1. Te registrás / logueás en el sitio
2. Completás el formulario
3. El envío queda como "Pendiente"
4. Un moderador lo revisa en `/moderacion`
5. Si se aprueba, aparece públicamente
6. Si se rechaza, ves el motivo en `/mis-envios`

### 2. Contribuir código

1. Hacé un **fork** del repositorio
2. Cloná tu fork:
   ```bash
   git clone https://github.com/TU-USUARIO/Nexo-Digital.git
   cd Nexo-Digital
   ```
3. Instalá dependencias:
   ```bash
   npm install
   ```
4. Copiá las variables de entorno:
   ```bash
   cp .env.example .env
   # Editá .env con tus credenciales de Supabase
   ```
5. Generá el cliente Prisma:
   ```bash
   npx prisma generate
   ```
6. Creá una branch descriptiva:
   ```bash
   git checkout -b feature/mi-mejora
   ```
7. Hacé tus cambios
8. Verificá que todo compile:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
9. Hacé commits claros: `git commit -m 'feat: descripción'`
10. Push y Pull Request a `main`

### Convenciones de commits

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `chore:` tareas de mantenimiento
- `docs:` documentación
- `refactor:` reestructuración sin cambio de funcionalidad
- `style:` cambios de CSS/estilos
- `test:` agregar o modificar tests

## Criterios de aceptación

### Proyectos
- Repositorio público accesible
- Funcional o en progreso activo
- Relevante para alguna categoría de Nexo Digital
- No se aceptan proyectos abandonados sin documentación

### Recursos
- Link accesible y funcional
- Contenido de calidad y relevante
- Se priorizan recursos gratuitos
- No se aceptan afiliaciones pagas ni spam

### Empleos
- Búsquedas laborales reales y verificables
- Mínimo: puesto, descripción, requisitos y contacto
- No se aceptan ofertas genéricas ni esquemas MLM

## Seguridad

- **Nunca** commitees `.env` ni claves reales
- Si encontrás una vulnerabilidad, **no abras un issue público**
- Ver [`SECURITY.md`](./SECURITY.md) para reportar vulnerabilidades

## Código de conducta

Al contribuir acordás:
- Trato respetuoso y sin discriminación
- Contenido relevante y de calidad
- Sin spam ni autopromoción desmedida
- Colaboración constructiva
