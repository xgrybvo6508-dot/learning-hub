import 'katex/dist/katex.min.css';
import './ui/tokens.css';
import './ui/base.css';
import './ui/components.css';
import { createAgentClient } from './agent/client';
import { h } from './lib/dom';
import { systemClock } from './lib/time';
import { createMemoryStore, choosePrimary } from './memory/store';
import { openHubIndexedDb, openIndexedDbStore } from './memory/storage/indexeddb';
import { createLocalStore } from './memory/storage/local';
import { mountApp } from './ui/app';

const container = document.getElementById('app');

async function bootstrap(root: HTMLElement): Promise<void> {
  const localStore = createLocalStore(window.localStorage);
  let hub: Awaited<ReturnType<typeof openHubIndexedDb>> | null;
  let primary: Awaited<ReturnType<typeof choosePrimary>>;
  try {
    hub = await openHubIndexedDb();
    primary = await openIndexedDbStore();
  } catch {
    hub = null;
    primary = await choosePrimary(() => openIndexedDbStore(), localStore);
  }
  const store = createMemoryStore({
    hub,
    primary,
    local: localStore,
    clock: systemClock,
    persist: navigator.storage?.persist
      ? () => navigator.storage.persist()
      : () => Promise.resolve(false),
    onHidden: (flush) => {
      const listener = (): void => {
        if (document.hidden) flush();
      };
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
  });
  const loaded = await store.load();
  mountApp(root, {
    store,
    hub,
    localStore,
    settingsStorage: window.localStorage,
    agentClient: createAgentClient(),
    clock: systemClock,
    loadNotice: loaded.ok ? (loaded.value.notice?.message ?? null) : loaded.error.userMessage,
  });
}

if (container) {
  container.append(h('p', { class: 'app-loading' }, ['Loading Learning Hub…']));
  void bootstrap(container).catch(() => {
    container.replaceChildren(
      h('p', { class: 'app-loading' }, [
        'The app could not start. Reload the page, or clear site data if this continues.',
      ]),
    );
  });
}
