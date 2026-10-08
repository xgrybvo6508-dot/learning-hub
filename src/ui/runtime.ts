import type { AgentClient } from '../agent/client';
import type { SettingsStorage } from '../agent/settings';
import type { Clock } from '../lib/time';
import type { MemoryStore } from '../memory/store';
import type { KeyValueStore } from '../memory/storage/adapter';

export interface UiRuntime {
  readonly store: MemoryStore;
  readonly localStore: KeyValueStore;
  readonly settingsStorage: SettingsStorage;
  readonly agentClient: AgentClient;
  readonly clock: Clock;
  readonly showToast: (message: string) => void;
  loadNotice: string | null;
}
