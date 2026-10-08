import { isRecord, isString, own } from '../lib/guards';

export const SETTINGS_KEY = 'lh:settings';
export const SETTINGS_VERSION = 1;

export type ProviderPreset = 'nous' | 'openrouter' | 'custom';

export interface GlossaryEntry {
  readonly term: string;
  readonly meaning: string;
}

export interface Settings {
  readonly version: typeof SETTINGS_VERSION;
  readonly preset: ProviderPreset;
  readonly baseUrl: string;
  readonly textModel: string;
  readonly visionModel: string;
  readonly apiKey: string;
  readonly feedbackLanguage: string;
  readonly grokBotUrl: string;
  readonly glossary: GlossaryEntry[];
}

export interface Preset {
  readonly id: ProviderPreset;
  readonly label: string;
  readonly baseUrl: string;
  readonly textModel: string;
  readonly visionModel: string;
  readonly jsonMode: boolean;
}

/** Free OpenRouter vision models (verified 2026-10-08 via public /models). */
export const OPENROUTER_VISION_DEFAULT = 'google/gemma-4-31b-it:free';
export const OPENROUTER_VISION_ALTERNATIVES = [
  'thinkingmachines/inkling:free',
  'google/gemma-4-26b-a4b-it:free',
] as const;

export const OPENROUTER_REFERER = 'https://xgrybvo6508-dot.github.io/learning-hub/';
export const OPENROUTER_TITLE = 'Learning Hub';

export const PRESETS: Readonly<Record<ProviderPreset, Preset>> = {
  nous: {
    id: 'nous',
    label: 'Nous Portal',
    baseUrl: 'https://inference-api.nousresearch.com/v1',
    textModel: 'poolside/laguna-s-2.1:free',
    visionModel: 'poolside/laguna-s-2.1:free',
    jsonMode: false,
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    textModel: 'poolside/laguna-s-2.1:free',
    visionModel: OPENROUTER_VISION_DEFAULT,
    jsonMode: false,
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    baseUrl: '',
    textModel: '',
    visionModel: '',
    jsonMode: false,
  },
};

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  preset: 'nous',
  baseUrl: PRESETS.nous.baseUrl,
  textModel: PRESETS.nous.textModel,
  visionModel: PRESETS.nous.visionModel,
  apiKey: '',
  feedbackLanguage: 'ru',
  grokBotUrl: '',
  glossary: [],
};

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function settingsForPreset(preset: ProviderPreset, current: Settings): Settings {
  const next = PRESETS[preset];
  return {
    ...current,
    preset,
    baseUrl: next.baseUrl,
    textModel: next.textModel,
    visionModel: next.visionModel,
  };
}

function isPreset(value: unknown): value is ProviderPreset {
  return typeof value === 'string' && Object.hasOwn(PRESETS, value);
}

function parseGlossary(raw: unknown): GlossaryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: GlossaryEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const term = own(item, 'term');
    const meaning = own(item, 'meaning');
    if (isString(term) && isString(meaning) && term.trim()) {
      out.push({ term: term.trim(), meaning: meaning.trim() });
    }
  }
  return out;
}

export function loadSettings(storage: SettingsStorage): Settings {
  let raw: unknown;
  try {
    const text = storage.getItem(SETTINGS_KEY);
    if (text === null) return DEFAULT_SETTINGS;
    raw = JSON.parse(text) as unknown;
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (!isRecord(raw) || own(raw, 'version') !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
  const preset = own(raw, 'preset');
  const baseUrl = own(raw, 'baseUrl');
  const textModel = own(raw, 'textModel');
  const visionModel = own(raw, 'visionModel');
  const apiKey = own(raw, 'apiKey');
  const feedbackLanguage = own(raw, 'feedbackLanguage');
  const grokBotUrl = own(raw, 'grokBotUrl');
  const glossary = own(raw, 'glossary');
  if (
    !isPreset(preset) ||
    !isString(baseUrl) ||
    !isString(textModel) ||
    !isString(visionModel) ||
    !isString(apiKey) ||
    !isString(feedbackLanguage) ||
    !isString(grokBotUrl)
  ) {
    return DEFAULT_SETTINGS;
  }
  return {
    version: SETTINGS_VERSION,
    preset,
    baseUrl,
    textModel,
    visionModel,
    apiKey,
    feedbackLanguage,
    grokBotUrl,
    glossary: parseGlossary(glossary),
  };
}

export function saveSettings(storage: SettingsStorage, settings: Settings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearApiKey(storage: SettingsStorage, settings: Settings): Settings {
  const next = { ...settings, apiKey: '' };
  saveSettings(storage, next);
  return next;
}

export function maskKey(key: string): string {
  if (key.length === 0) return '';
  const suffix = key.slice(-4);
  const prefix = key.includes('-') ? `${key.slice(0, key.indexOf('-') + 1)}` : '';
  return `${prefix}…${suffix}`;
}

export function isAllowedBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'))
    );
  } catch {
    return false;
  }
}

export function jsonModeFor(settings: Settings): boolean {
  return PRESETS[settings.preset].jsonMode;
}

export function parseGlossaryTextarea(text: string): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out.push({
      term: trimmed.slice(0, eq).trim(),
      meaning: trimmed.slice(eq + 1).trim(),
    });
  }
  return out;
}

export function formatGlossaryTextarea(entries: GlossaryEntry[]): string {
  return entries.map((e) => `${e.term} = ${e.meaning}`).join('\n');
}
