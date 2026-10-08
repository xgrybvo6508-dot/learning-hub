import { h } from '../../lib/dom';

const MODULES = [
  { route: 'mindmap', label: 'Mindmap trainer', emphasized: true },
  { route: 'courses', label: 'Courses', emphasized: false },
  { route: 'mistakes', label: 'Mistakes', emphasized: false },
  { route: 'anki', label: 'Anki', emphasized: false },
  { route: 'feynman', label: 'Feynman', emphasized: false },
  { route: 'interleave', label: 'Interleave', emphasized: false },
  { route: 'voice', label: 'Voice', emphasized: false },
] as const;

export function homeView(): HTMLElement {
  const tiles = MODULES.map((mod) =>
    h(
      'a',
      {
        class: mod.emphasized ? 'module-tile module-tile--primary' : 'module-tile',
        href: `#/${mod.route}`,
      },
      [h('span', { class: 'module-tile__label' }, [mod.label])],
    ),
  );
  return h('section', { class: 'screen home-screen' }, [
    h('div', { class: 'screen-heading' }, [
      h('h1', {}, ['Home']),
      h('p', { class: 'quiet' }, ['Pick one module. You can change anytime.']),
    ]),
    h('div', { class: 'module-grid', 'aria-label': 'Modules' }, tiles),
  ]);
}
