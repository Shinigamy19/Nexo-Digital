# Guía de contribución — Nexo Digital

¡Gracias por querer contribuir a Nexo Digital! 🎉

Este repositorio es **open source** y toda aportación pasa por revisión de moderadores antes de aparecer en el sitio.

---

## 📌 Formas de contribuir

### 1. Agregar un proyecto comunitario

Si tenés un proyecto open source que creés que puede ser valioso para la comunidad:

1. Abrí un [Issue](https://github.com/Shinigamy19/Nexo-Digital/issues/new?labels=proyecto,pendiente-revision&title=%5BPROYECTO%5D+Nombre+de+tu+proyecto) con la etiqueta `proyecto`
2. Completá la información con este formato:

```
**Título:** Nombre del proyecto
**Descripción:** Qué hace y para qué sirve (máx 200 caracteres)
**Categoría:** desarrollo / diseño / ia / iot / edicion / audio / gamedev
**Tecnologías:** React, TypeScript, etc. (separadas por coma)
**Autor GitHub:** tu-usuario
**Repositorio:** https://github.com/...
**Demo (opcional):** https://...
**Estado:** activo / en progreso / archivado
```

3. Un moderador revisará el Issue. Si cumple los criterios, creará un PR para agregarlo a `src/data/projects.json`.

---

### 2. Sugerir un recurso

Si querés agregar una herramienta, tutorial, template o recurso:

1. Abrí un [Issue](https://github.com/Shinigamy19/Nexo-Digital/issues/new?labels=recurso,pendiente-revision&title=%5BRECURSO%5D+Nombre+del+recurso) con la etiqueta `recurso`
2. Incluí:

```
**Título:** Nombre del recurso
**Descripción:** Qué es y para qué sirve
**Tipo:** herramienta / tutorial / recurso / template / documentación
**Categoría:** desarrollo / diseño / ia / iot / aprendizaje
**URL:** https://...
**Tags:** gratis, open source, etc.
```

---

### 3. Publicar una búsqueda laboral

Usá el **formulario en la página `/empleos`** del sitio. Al enviarlo, se abre automáticamente un GitHub Issue con los datos pre-completados. Los moderadores revisan y aprueban en 24–48hs.

---

### 4. Contribuir código

Para mejoras al sitio en sí:

1. Hacé un **fork** del repositorio
2. Creá una branch descriptiva:
   - `feat/nueva-funcionalidad`
   - `fix/descripcion-del-bug`
   - `chore/mejora-sin-funcionalidad`
3. Hacé commits claros y descriptivos
4. Abrí un **Pull Request** a `main` con:
   - Descripción de qué cambiaste y por qué
   - Screenshots o GIFs si tocaste UI
   - Referencia al Issue relacionado si existe

---

## ✅ Criterios de aceptación para contenido

### Proyectos
- Deben tener repositorio público accesible
- Deben ser funcionales o estar en progreso activo
- Deben ser relevantes para alguna de las categorías de Nexo Digital
- No se aceptan proyectos abandonados sin documentación

### Recursos
- El link debe ser accesible y funcional
- El contenido debe ser de calidad y relevante
- Se priorizan recursos gratuitos o con prueba gratuita
- No se aceptan afiliaciones pagas o contenido de spam

### Empleos
- Deben ser búsquedas laborales reales y verificables
- Deben tener al menos: puesto, descripción, requisitos y forma de contacto
- No se aceptan ofertas genéricas, pirámides o esquemas de marketing multinivel

---

## 🔧 Setup de desarrollo

```bash
git clone https://github.com/Shinigamy19/Nexo-Digital.git
cd Nexo-Digital
npm install
npm run dev
```

---

## 🤝 Código de conducta

Al contribuir acordás respetar los principios de Nexo Digital:
- Trato respetuoso y sin discriminación
- Contenido relevante y de calidad
- Sin spam, autopromoción desmedida ni publicidad engañosa
- Colaboración constructiva

---

Gracias por hacer Nexo Digital mejor para todos 🚀
