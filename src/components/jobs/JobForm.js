const form = document.getElementById('jobSubmitForm');
const descTextarea = document.getElementById('job-desc');
const descCounter = document.getElementById('desc-counter');

// Contador de caracteres
descTextarea?.addEventListener('input', () => {
  const len = descTextarea.value.length;
  if (descCounter) descCounter.textContent = `${len} / 1000`;
});

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form;

  // Validar requeridos comunes
  let valid = true;
  f.querySelectorAll('[required]').forEach(el => {
    if (!el.value.trim()) {
      el.dataset.error = 'true';
      valid = false;
    } else {
      el.dataset.error = 'false';
    }
  });

  // Validar categorías (múltiple)
  const categoryCheckboxes = Array.from(f.querySelectorAll('input[name="category"]:checked'));
  const categoryPillsContainer = document.getElementById('category-pills');
  if (categoryCheckboxes.length === 0) {
    if (categoryPillsContainer) categoryPillsContainer.dataset.error = 'true';
    valid = false;
  } else {
    if (categoryPillsContainer) categoryPillsContainer.dataset.error = 'false';
  }

  if (!valid) {
    f.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Construir body del Issue
  const title    = f.querySelector('#job-title').value.trim();
  const company  = f.querySelector('#job-company').value.trim();
  const desc     = f.querySelector('#job-desc').value.trim();
  const categories = categoryCheckboxes.map(cb => cb.value).join(', ');
  const modality = f.querySelector('#job-modality').value;
  const location = f.querySelector('#job-location').value.trim();
  const salary   = f.querySelector('#job-salary').value.trim();
  const reqs     = f.querySelector('#job-requirements').value.trim();
  const contact  = f.querySelector('#job-contact').value.trim();

  const issueTitle = encodeURIComponent(`[EMPLEO] ${title} — ${company}`);
  const issueBody = encodeURIComponent(
`## 💼 Nueva búsqueda laboral

**Puesto:** ${title}
**Empresa:** ${company}
**Categorías:** ${categories}
**Modalidad:** ${modality}
**Ubicación:** ${location || 'No especificada'}
**Remuneración:** ${salary || 'A convenir'}

### Descripción
${desc}

### Requisitos
${reqs}

### Contacto / Link de postulación
${contact}

---
*Enviado desde el formulario del sitio de Nexo Digital. Pendiente de revisión por moderadores.*`
  );

  const url = `https://github.com/Shinigamy19/Nexo-Digital/issues/new?title=${issueTitle}&body=${issueBody}&labels=empleo,pendiente-revision`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

// Limpiar estado de error al escribir o cambiar
form?.querySelectorAll('[data-form-field], .pill-checkbox').forEach(el => {
  el.addEventListener('input',  () => { 
    if (el.classList.contains('pill-checkbox')) {
      document.getElementById('category-pills')?.setAttribute('data-error', 'false');
    } else {
      el.dataset.error = 'false'; 
    }
  });
  el.addEventListener('change', () => { 
    if (el.classList.contains('pill-checkbox')) {
      document.getElementById('category-pills')?.setAttribute('data-error', 'false');
    } else {
      el.dataset.error = 'false'; 
    }
  });
});
