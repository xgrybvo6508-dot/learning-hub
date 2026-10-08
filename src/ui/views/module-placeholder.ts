import { h } from '../../lib/dom';

export function modulePlaceholderView(title: string): HTMLElement {
  return h('section', { class: 'screen module-placeholder' }, [
    h('div', { class: 'screen-heading' }, [
      h('h1', {}, [title]),
      h('p', { class: 'quiet' }, ['This module is not built yet.']),
    ]),
    h('a', { class: 'button button--outline', href: '#/' }, ['Back to Home']),
  ]);
}
