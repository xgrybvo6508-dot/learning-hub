import { describe, expect, it } from 'vitest';
import { createFakeStorage } from '../memory/storage/fake';
import {
  clearApiKey,
  DEFAULT_SETTINGS,
  isAllowedBaseUrl,
  jsonModeFor,
  loadSettings,
  maskKey,
  OPENROUTER_VISION_ALTERNATIVES,
  OPENROUTER_VISION_DEFAULT,
  PRESETS,
  saveSettings,
  SETTINGS_KEY,
  settingsForPreset,
} from './settings';

describe('agent settings', () => {
  it('contains the specified provider presets', () => {
    expect(PRESETS.nous).toMatchObject({
      baseUrl: 'https://inference-api.nousresearch.com/v1',
      textModel: 'poolside/laguna-s-2.1:free',
      jsonMode: false,
    });
    expect(PRESETS.openrouter.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(PRESETS.openrouter.visionModel).toBe(OPENROUTER_VISION_DEFAULT);
    expect(OPENROUTER_VISION_ALTERNATIVES).toContain('thinkingmachines/inkling:free');
    expect(OPENROUTER_VISION_ALTERNATIVES).toContain('google/gemma-4-26b-a4b-it:free');
  });

  it('selects a preset without changing the key', () => {
    const current = { ...DEFAULT_SETTINGS, apiKey: 'private-value' };
    const next = settingsForPreset('openrouter', current);
    expect(next).toMatchObject({
      preset: 'openrouter',
      baseUrl: PRESETS.openrouter.baseUrl,
      visionModel: OPENROUTER_VISION_DEFAULT,
      apiKey: 'private-value',
    });
    expect(jsonModeFor(next)).toBe(false);
  });

  it('saves and loads only a clean versioned object', () => {
    const storage = createFakeStorage();
    const settings = { ...DEFAULT_SETTINGS, apiKey: 'private-value' };
    saveSettings(storage, settings);
    expect(loadSettings(storage)).toEqual(settings);

    storage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, version: 99 }));
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    storage.setItem(SETTINGS_KEY, '{broken');
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('masks and clears the key', () => {
    expect(maskKey('')).toBe('');
    expect(maskKey('prefix-private-value')).toBe('prefix-…alue');
    expect(maskKey('abcdef')).toBe('…cdef');
    const storage = createFakeStorage();
    const cleared = clearApiKey(storage, { ...DEFAULT_SETTINGS, apiKey: 'private-value' });
    expect(cleared.apiKey).toBe('');
    expect(loadSettings(storage).apiKey).toBe('');
  });

  it('allows HTTPS and local HTTP only', () => {
    expect(isAllowedBaseUrl('https://example.test/v1')).toBe(true);
    expect(isAllowedBaseUrl('http://localhost:11434/v1')).toBe(true);
    expect(isAllowedBaseUrl('http://127.0.0.1:8080/v1')).toBe(true);
    expect(isAllowedBaseUrl('http://example.test/v1')).toBe(false);
    expect(isAllowedBaseUrl('not a url')).toBe(false);
  });
});
