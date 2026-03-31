# Nexo Digital 🌐

**Comunidad para creadores del mundo digital.**

Nexo Digital es una comunidad open source y de WhatsApp para desarrolladores, diseñadores, editores de video, músicos, creadores de contenido, entusiastas de la IA, domótica y toda disciplina creativa-tecnológica.

## 🚀 Funcionalidades del sitio

- **Landing** — Presentación de la comunidad y canales
- **📂 Proyectos** — Biblioteca de proyectos open source impulsados por la comunidad
- **📚 Recursos** — Herramientas, tutoriales y recursos curados por la comunidad
- **💼 Empleos** — Búsquedas laborales tech con formulario de publicación

## 🛠️ Stack tecnológico

| Herramienta | Uso |
|---|---|
| [Astro](https://astro.build) | Framework web (SSG) |
| CSS Modules | Estilos por componente |
| Vanilla CSS | Sistema de diseño global |
| TypeScript | Tipos en frontmatter |
| GitHub Issues | Moderación de contenido comunitario |

## 📦 Instalación y desarrollo local

### Prerequisitos
- Node.js >= 22.12.0
- npm

### Clonar e instalar

```bash
git clone https://github.com/Shinigamy19/Nexo-Digital.git
cd Nexo-Digital
npm install
```

### Correr en local

```bash
npm run dev
```

El sitio estará disponible en `http://localhost:4321`.

### Build de producción

```bash
npm run build
npm run preview
```

## 🤝 Cómo contribuir

### Agregar un proyecto

1. Abrí un [Issue](https://github.com/Shinigamy19/Nexo-Digital/issues/new?labels=proyecto,pendiente-revision&title=%5BPROYECTO%5D+Nombre+de+tu+proyecto) con la etiqueta `proyecto`
2. Un moderador revisará y lo agregará a `src/data/projects.json`

### Sugerir un recurso

1. Abrí un [Issue](https://github.com/Shinigamy19/Nexo-Digital/issues/new?labels=recurso,pendiente-revision&title=%5BRECURSO%5D+Nombre+del+recurso) con la etiqueta `recurso`
2. Un moderador lo revisará y lo incluirá en `src/data/resources.json`

### Publicar una búsqueda laboral

1. Usá el **formulario en `/empleos`** — se abre automáticamente un Issue con los datos
2. El Issue queda disponible en el repositorio para revisión de moderadores
3. Una vez aprobado, se agrega a `src/data/jobs.json`

### Contribuir código

1. Hacé un **fork** del repositorio
2. Creá una branch: `git checkout -b feature/mi-mejora`
3. Hacé tus cambios y commits: `git commit -m 'feat: descripción'`
4. Abrí un **Pull Request** hacia `main`

Consultá [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

## 📁 Estructura del proyecto

```
Nexo-Digital/
├── public/             # Assets estáticos (logo, favicons, QRs)
├── src/
│   ├── assets/         # Imágenes optimizadas (procesadas por Astro)
│   ├── components/     # Componentes Astro reutilizables
│   ├── data/           # JSON de contenido (proyectos, recursos, empleos)
│   │   ├── projects.json
│   │   ├── resources.json
│   │   ├── jobs.json
│   │   └── community.json
│   ├── layouts/        # Layout base (HTML shell)
│   ├── pages/          # Páginas del sitio (rutas)
│   │   ├── index.astro
│   │   ├── proyectos.astro
│   │   ├── recursos.astro
│   │   └── empleos.astro
│   └── styles/         # CSS global y navbar
└── astro.config.mjs
```

## 📋 Flujo de moderación

Todo el contenido enviado por la comunidad pasa por revisión de moderadores antes de publicarse:

```
Usuario envía → GitHub Issue → Moderador revisa → Aprobado → PR al JSON → Publicado
```

Los moderadores verifican:
- ✅ Que el contenido sea relevante para la comunidad
- ✅ Que no contenga spam, publicidad engañosa ni contenido inapropiado
- ✅ Que los links sean funcionales y seguros
- ✅ Que las búsquedas laborales sean reales y detalladas

## 🌐 Comunidad

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Unirme-25D366?style=flat&logo=whatsapp)](https://chat.whatsapp.com/Hbm9wubODmw2ycWx5DTcMZ)
[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-181717?style=flat&logo=github)](https://github.com/Shinigamy19/Nexo-Digital)

## 📄 Licencia

[MIT](./LICENSE) — Nexo Digital © 2025
