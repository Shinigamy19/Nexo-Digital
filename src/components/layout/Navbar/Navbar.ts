/**
 * Navbar interactions: scroll effect and mobile menu toggle.
 */

export const initNavbar = () => {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (!navbar || !toggle || !navLinks) return;

  // Read hashed classes from data-attributes
  const scrolledClass = navbar.dataset.scrolledClass ?? 'scrolled';
  const menuOpenClass = navbar.dataset.menuOpenClass ?? 'menuOpen';
  const openClass = toggle.dataset.openClass ?? 'open';

  // Scroll effect with optimization
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 30) {
          navbar.classList.add(scrolledClass);
        } else {
          navbar.classList.remove(scrolledClass);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Mobile toggle function
  const toggleMenu = (forceState?: boolean) => {
    const isOpen = typeof forceState === 'boolean' ? forceState : !toggle.classList.contains(openClass);
    
    toggle.classList.toggle(openClass, isOpen);
    navLinks.classList.toggle(openClass, isOpen);
    navbar.classList.toggle(menuOpenClass, isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => toggleMenu());

  // Close on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });
};

// Auto-initialize if loaded directly in browser
if (typeof window !== 'undefined') {
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
}
