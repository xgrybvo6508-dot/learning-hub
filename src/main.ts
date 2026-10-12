import './ui/styles.css';
import { h } from './lib/dom';
import { createTrackerStore } from './store/tracker-store';
import { mountApp } from './ui/app';
import { registerSW } from 'virtual:pwa-register';

const container = document.getElementById('app');

if (container) {
  container.replaceChildren(h('p', { class: 'app-loading' }, ['Загрузка…']));
  try {
    const store = createTrackerStore(window.localStorage);
    mountApp(container, { store });
    if (import.meta.env.PROD) {
      registerSW({ immediate: true });
    }
  } catch {
    container.replaceChildren(
      h('p', { class: 'app-loading' }, ['Не удалось запустить приложение. Обновите страницу.']),
    );
  }
}
