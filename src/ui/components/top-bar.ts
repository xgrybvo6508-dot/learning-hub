import { h } from '../../lib/dom';

export function topBar(): HTMLElement {
  const title = h('a', { class: 'top-bar__title', href: '#/' }, ['Learning Hub']);
  const nav = h('nav', { class: 'top-bar__nav', 'aria-label': 'Main navigation' }, [
    h('a', { class: 'nav-link', href: '#/settings', 'aria-label': 'Settings' }, ['Settings']),
    h('a', { class: 'nav-link', href: '#/data', 'aria-label': 'Data' }, ['Data']),
  ]);
  return h('header', { class: 'top-bar' }, [title, nav]);
}
