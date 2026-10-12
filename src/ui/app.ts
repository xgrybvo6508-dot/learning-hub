import type { TrackerStore } from '../store/tracker-store';
import { h } from '../lib/dom';
import { parseHash, type Route } from './router';
import { withViewTransition } from './transitions';
import { renderAddCourse } from './views/add-course';
import { renderCourseView } from './views/course-view';
import { renderHome } from './views/home';

export type AppDeps = {
  store: TrackerStore;
};

export function mountApp(root: HTMLElement, deps: AppDeps): void {
  const shell = h('div', { class: 'shell' }, [
    h('div', { class: 'top-bar' }, [
      h('button', { class: 'menu-btn', type: 'button', 'aria-haspopup': 'true' }, ['⋯']),
      h('div', { class: 'menu-panel', hidden: true, role: 'menu' }, [
        h('button', { type: 'button', class: 'menu-item', 'data-action': 'export' }, [
          'Экспорт JSON',
        ]),
        h('button', { type: 'button', class: 'menu-item', 'data-action': 'import' }, [
          'Импорт JSON',
        ]),
        h('input', {
          type: 'file',
          accept: 'application/json,.json',
          hidden: true,
          id: 'import-json',
        }),
      ]),
    ]),
    h('main', { class: 'main', id: 'view-root' }),
  ]);

  root.replaceChildren(shell);
  const viewRoot = shell.querySelector('#view-root') as HTMLElement;
  const menuPanel = shell.querySelector('.menu-panel') as HTMLElement;
  const menuBtn = shell.querySelector('.menu-btn') as HTMLButtonElement;
  const importJson = shell.querySelector('#import-json') as HTMLInputElement;
  const toast = h('p', { class: 'toast', hidden: true }, ['']);

  root.append(toast);

  const toggleMenu = (open: boolean): void => {
    menuPanel.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(menuPanel.hasAttribute('hidden'));
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!menuPanel.hidden && !menuPanel.contains(target) && !menuBtn.contains(target)) {
      toggleMenu(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menuPanel.hidden) {
      toggleMenu(false);
    }
  });

  shell.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    const blob = new Blob([deps.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'learning-hub-progress.json' });
    a.click();
    URL.revokeObjectURL(url);
    toggleMenu(false);
  });

  shell.querySelector('[data-action="import"]')?.addEventListener('click', () => {
    importJson.click();
    toggleMenu(false);
  });

  importJson.addEventListener('change', () => {
    const file = importJson.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      const result = deps.store.importJson(text);
      toast.textContent = result.ok ? 'Импорт выполнен.' : result.message;
      toast.hidden = false;
      window.setTimeout(() => {
        toast.hidden = true;
      }, 4000);
      renderRoute(parseHash(window.location.hash), viewRoot, deps);
    });
    importJson.value = '';
  });

  const render = (): void => {
    withViewTransition(() => {
      renderRoute(parseHash(window.location.hash), viewRoot, deps);
    });
  };

  window.addEventListener('hashchange', render);
  deps.store.subscribe(render);
  render();
}

function renderRoute(route: Route, viewRoot: HTMLElement, deps: AppDeps): void {
  const courses = deps.store.getCourses();
  const doneIds = deps.store.getDoneIds();
  switch (route.name) {
    case 'home':
      renderHome(viewRoot, courses, doneIds);
      return;
    case 'add':
      renderAddCourse(viewRoot, deps.store);
      return;
    case 'course': {
      const course = courses.find((c) => c.id === route.courseId);
      if (!course) {
        renderHome(viewRoot, courses, doneIds);
        return;
      }
      renderCourseView(viewRoot, course, deps.store, () => {
        renderRoute({ name: 'course', courseId: course.id }, viewRoot, deps);
      });
    }
  }
}
