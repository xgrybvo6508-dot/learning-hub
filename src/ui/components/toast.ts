import { h } from '../../lib/dom';

export function createToastHost(): { el: HTMLElement; show: (message: string) => void } {
  const el = h('div', { class: 'toast-host', 'aria-live': 'polite', hidden: true });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const show = (message: string): void => {
    el.textContent = message;
    el.hidden = false;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      el.hidden = true;
      timer = null;
    }, 4000);
  };
  return { el, show };
}
