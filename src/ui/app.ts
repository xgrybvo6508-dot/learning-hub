import { clear, h } from '../lib/dom';
import { topBar } from './components/top-bar';
import { createToastHost } from './components/toast';
import { updatePrompt } from './components/update-prompt';
import type { UiRuntime } from './runtime';
import { dataView } from './views/data';
import { homeView } from './views/home';
import { mindmapView } from '../modules/mindmap/view';
import { modulePlaceholderView } from './views/module-placeholder';
import { settingsView } from './views/settings';

export interface App {
  root: HTMLElement;
  main: HTMLElement;
  dispose(): void;
}

export type AppRoute =
  | 'home'
  | 'mindmap'
  | 'courses'
  | 'mistakes'
  | 'anki'
  | 'feynman'
  | 'interleave'
  | 'voice'
  | 'settings'
  | 'data';

const MODULE_TITLES: Record<Exclude<AppRoute, 'home' | 'settings' | 'data'>, string> = {
  mindmap: 'Mindmap trainer',
  courses: 'Courses',
  mistakes: 'Mistakes',
  anki: 'Anki',
  feynman: 'Feynman',
  interleave: 'Interleave',
  voice: 'Voice',
};

export function currentRoute(hash: string): AppRoute {
  const route = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  if (route === '' || route === '/') return 'home';
  if (route in MODULE_TITLES) return route as AppRoute;
  if (route === 'settings' || route === 'data') return route;
  return 'home';
}

export function mountApp(container: HTMLElement, runtime: Omit<UiRuntime, 'showToast'>): App {
  const bar = topBar();
  const toast = createToastHost();
  const fullRuntime: UiRuntime = { ...runtime, showToast: toast.show };
  const main = h('main', { class: 'main', id: 'main' });
  const root = h('div', { class: 'app' }, [bar, updatePrompt(), toast.el, main]);

  const render = (): void => {
    const route = currentRoute(window.location.hash);
    for (const link of bar.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
      const href = link.getAttribute('href') ?? '';
      const active =
        (route === 'home' && href === '#/') || (route !== 'home' && href === `#/${route}`);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    clear(main);
    if (route === 'home') main.append(homeView());
    else if (route === 'settings') main.append(settingsView(fullRuntime));
    else if (route === 'data') main.append(dataView(fullRuntime));
    else if (route === 'mindmap') main.append(mindmapView(fullRuntime));
    else if (route in MODULE_TITLES) {
      main.append(modulePlaceholderView(MODULE_TITLES[route]));
    } else main.append(homeView());
  };

  if (!window.location.hash) window.history.replaceState(null, '', '#/');
  container.replaceChildren(root);
  window.addEventListener('hashchange', render);
  render();
  return {
    root,
    main,
    dispose() {
      window.removeEventListener('hashchange', render);
    },
  };
}
