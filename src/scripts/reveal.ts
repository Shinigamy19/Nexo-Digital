/**
 * Reveal animation logic using Intersection Observer.
 * Observes all elements with the .reveal class and adds the .visible class
 * when they enter the viewport.
 */

export const initRevealObserver = (threshold = 0.1) => {
  const revealEls = document.querySelectorAll('.reveal');
  
  if (revealEls.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once the element is visible, we can stop observing it
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );

  revealEls.forEach((el) => observer.observe(el));
};

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  // Use a small delay or wait for DOMContentLoaded to ensure elements are present
  document.addEventListener('DOMContentLoaded', () => {
    initRevealObserver();
  });
}
