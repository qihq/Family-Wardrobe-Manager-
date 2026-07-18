const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createOverlay(element) {
  let trigger = null;
  function keydown(event) {
    if (event.key === 'Escape') return close();
    if (event.key !== 'Tab') return;
    const focusable = Array.from(element.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return event.preventDefault();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function open(source) {
    trigger = source || document.activeElement;
    element.hidden = false;
    element.classList.add('is-open');
    document.body.classList.add('overlay-open');
    element.addEventListener('keydown', keydown);
    requestAnimationFrame(() => (element.querySelector(FOCUSABLE) || element).focus());
  }
  function close() {
    element.hidden = true;
    element.classList.remove('is-open');
    document.body.classList.remove('overlay-open');
    element.removeEventListener('keydown', keydown);
    trigger?.focus?.();
  }
  function backdrop(event) { if (event.target === element) close(); }
  element.addEventListener('click', backdrop);
  return { open, close, destroy() { element.removeEventListener('click', backdrop); element.removeEventListener('keydown', keydown); } };
}
