const PER_PAGE = 15;

export function initListingControls(listingId: string, searchFields: string[]) {
  const container = document.getElementById(listingId);
  if (!container) return;

  const items = container.querySelectorAll('[data-pag-item]');
  const paginator = container.parentElement?.querySelector('[data-paginator]') as HTMLElement | null;
  const searchInput = container.parentElement?.querySelector('[data-search-input]') as HTMLInputElement | null;
  const prevBtn = paginator?.querySelector('[data-pag-prev]') as HTMLElement | null;
  const nextBtn = paginator?.querySelector('[data-pag-next]') as HTMLElement | null;
  const pagesEl = paginator?.querySelector('[data-pag-pages]') as HTMLElement | null;

  if (!paginator || items.length === 0) {
    if (paginator) paginator.style.display = 'none';
    return;
  }

  let currentPage = 1;
  let filteredItems: HTMLElement[] = [];

  function filterItems() {
    // Show all items first
    items.forEach(el => { (el as HTMLElement).style.display = ''; });

    // Read active filters from FilterBar buttons
    const activeFilters = new Map<string, string>();
    document.querySelectorAll('[data-filter][data-active="true"]').forEach(el => {
      const btn = el as HTMLElement;
      const group = btn.dataset.group;
      const filter = btn.dataset.filter;
      if (group && filter) activeFilters.set(group, filter);
    });

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const hasSearch = query.length > 0;

    const result: HTMLElement[] = [];
    items.forEach(el => {
      const htmlEl = el as HTMLElement;

      // Apply category/modality filters
      let passFilter = true;
      activeFilters.forEach((filterVal, group) => {
        if (filterVal === 'all') return;
        const attr = `data-filter-${group}`;
        const cardVal = htmlEl.getAttribute(attr) || '';
        const vals = cardVal.split(',').map(s => s.trim());
        if (!vals.includes(filterVal)) passFilter = false;
      });
      if (!passFilter) return;

      // Apply search
      if (hasSearch) {
        const text = searchFields.map(f => htmlEl.dataset[f] || '').join(' ').toLowerCase();
        if (!text.includes(query)) return;
      }

      result.push(htmlEl);
    });
    filteredItems = result;
  }

  function renderPage() {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PER_PAGE;

    // Show only the current page items
    items.forEach(el => {
      const htmlEl = el as HTMLElement;
      const idx = filteredItems.indexOf(htmlEl);
      htmlEl.style.display = (idx >= start && idx < start + PER_PAGE) ? '' : 'none';
    });

    // Hide prev/next when not applicable
    if (prevBtn) prevBtn.style.display = currentPage <= 1 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = currentPage >= totalPages ? 'none' : '';

    if (pagesEl) {
      pagesEl.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = String(i);
        const btnClass = paginator?.dataset?.pagBtnClass || '';
        if (btnClass) btn.className = btnClass;
        btn.dataset.active = i === currentPage ? 'true' : 'false';
        btn.addEventListener('click', () => { currentPage = i; renderPage(); });
        pagesEl.appendChild(btn);
      }
    }
  }

  function refresh() {
    filterItems();

    if (filteredItems.length <= PER_PAGE) {
      paginator.style.display = 'none';
      items.forEach(el => { (el as HTMLElement).style.display = filteredItems.indexOf(el as HTMLElement) !== -1 ? '' : 'none'; });
      return;
    }

    paginator.style.display = '';
    currentPage = 1;
    renderPage();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderPage(); });

  if (searchInput) {
    searchInput.addEventListener('input', refresh);
  }

  // Listen for filter clicks to refresh
  container.parentElement?.querySelectorAll('[data-filter]').forEach(el => {
    el.addEventListener('click', refresh);
  });

  refresh();
}
