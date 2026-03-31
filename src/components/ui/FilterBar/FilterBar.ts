/**
 * FilterBar interactive logic: filter elements by category.
 * Targets elements with [data-category] that match the selected filter.
 */

export const initFilters = () => {
  document.querySelectorAll('[data-filter][data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const group = el.dataset.group!;
      const filter = el.dataset.filter!;

      // Deactivate all buttons in the same group
      document.querySelectorAll(`[data-filter][data-group="${group}"]`).forEach(b => {
        (b as HTMLElement).dataset.active = 'false';
        b.setAttribute('aria-pressed', 'false');
      });

      // Activate the clicked button
      el.dataset.active = 'true';
      el.setAttribute('aria-pressed', 'true');

      // Show/hide categorical cards
      const cards = document.querySelectorAll(`[data-category][data-filtergroup="${group}"]`);
      cards.forEach(card => {
        const cardEl = card as HTMLElement;
        const categories = (cardEl.dataset.category || '').split(',').map(s => s.trim());
        
        if (filter === 'all' || categories.includes(filter)) {
          cardEl.style.display = '';
          // Trigger a small animation
          requestAnimationFrame(() => {
            cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            cardEl.style.opacity = '1';
            cardEl.style.transform = 'translateY(0)';
          });
        } else {
          cardEl.style.display = 'none';
          cardEl.style.opacity = '0';
          cardEl.style.transform = 'translateY(10px)';
          cardEl.style.transition = 'none';
        }
      });
    });
  });
};

// Auto-initialize if loaded directly in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }
}
