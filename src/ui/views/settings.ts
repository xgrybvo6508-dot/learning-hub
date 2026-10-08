import { listModels, testConnection } from '../../agent/connection';
import {
  clearApiKey,
  formatGlossaryTextarea,
  isAllowedBaseUrl,
  loadSettings,
  maskKey,
  OPENROUTER_VISION_ALTERNATIVES,
  parseGlossaryTextarea,
  PRESETS,
  saveSettings,
  settingsForPreset,
  type ProviderPreset,
  type Settings,
} from '../../agent/settings';
import { clear, h } from '../../lib/dom';
import type { UiRuntime } from '../runtime';

export function settingsView(runtime: UiRuntime): HTMLElement {
  const root = h('section', { class: 'screen settings-screen' });
  let settings = loadSettings(runtime.settingsStorage);
  let showKey = false;
  let message = '';
  let messageTone: 'success' | 'warning' | 'quiet' = 'quiet';
  let busy = false;
  let modelIds: string[] = [];

  const persist = (next: Settings): void => {
    settings = next;
    saveSettings(runtime.settingsStorage, settings);
  };

  const render = (): void => {
    const preset = h('select', { id: 'provider-preset' });
    for (const value of Object.values(PRESETS)) {
      preset.append(
        h('option', { value: value.id, selected: value.id === settings.preset }, [value.label]),
      );
    }
    const baseUrl = h('input', {
      id: 'base-url',
      type: 'url',
      value: settings.baseUrl,
      autocomplete: 'url',
      spellcheck: 'false',
    });
    const textModel = h('input', {
      id: 'text-model',
      type: 'text',
      value: settings.textModel,
      autocomplete: 'off',
      spellcheck: 'false',
      list: 'model-list',
    });
    const visionModel = h('input', {
      id: 'vision-model',
      type: 'text',
      value: settings.visionModel,
      autocomplete: 'off',
      spellcheck: 'false',
      list: 'model-list',
    });
    const modelList = h('datalist', { id: 'model-list' });
    for (const id of modelIds) {
      modelList.append(h('option', { value: id }));
    }

    const key = h('input', {
      id: 'api-key',
      type: showKey ? 'text' : 'password',
      value: settings.apiKey,
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const show = h(
      'button',
      {
        class: 'button button--ghost',
        type: 'button',
        'aria-controls': 'api-key',
        'aria-pressed': String(showKey),
      },
      [showKey ? 'Hide' : 'Show'],
    );
    show.addEventListener('click', () => {
      showKey = !showKey;
      render();
      queueMicrotask(() => root.querySelector<HTMLInputElement>('#api-key')?.focus());
    });
    const clearKey = h('button', { class: 'button button--ghost', type: 'button' }, ['Forget key']);
    clearKey.disabled = settings.apiKey.length === 0;
    clearKey.addEventListener('click', () => {
      settings = clearApiKey(runtime.settingsStorage, settings);
      message = 'API key cleared.';
      messageTone = 'quiet';
      render();
    });

    preset.addEventListener('change', () => {
      persist(settingsForPreset(preset.value as ProviderPreset, settings));
      message = 'Settings saved.';
      render();
    });
    const saveFields = (): void => {
      persist({
        ...settings,
        baseUrl: baseUrl.value.trim(),
        textModel: textModel.value.trim(),
        visionModel: visionModel.value.trim(),
        apiKey: key.value.trim(),
      });
      message = 'Settings saved.';
      messageTone = 'quiet';
      render();
    };
    for (const input of [baseUrl, textModel, visionModel, key]) {
      input.addEventListener('change', saveFields);
    }

    const feedbackLanguage = h('select', { id: 'feedback-language' });
    for (const opt of [
      { value: 'ru', label: 'Russian' },
      { value: 'en', label: 'English' },
    ]) {
      feedbackLanguage.append(
        h('option', { value: opt.value, selected: opt.value === settings.feedbackLanguage }, [
          opt.label,
        ]),
      );
    }
    feedbackLanguage.addEventListener('change', () => {
      persist({ ...settings, feedbackLanguage: feedbackLanguage.value });
      message = 'Settings saved.';
      render();
    });

    const grokUrl = h('input', {
      id: 'grok-bot-url',
      type: 'url',
      value: settings.grokBotUrl,
      autocomplete: 'off',
      spellcheck: 'false',
    });
    grokUrl.addEventListener('change', () => {
      persist({ ...settings, grokBotUrl: grokUrl.value.trim() });
      message = 'Settings saved.';
      render();
    });

    const glossary = h('textarea', {
      id: 'glossary',
      rows: '6',
      spellcheck: 'false',
    });
    glossary.value = formatGlossaryTextarea(settings.glossary);
    glossary.addEventListener('change', () => {
      persist({ ...settings, glossary: parseGlossaryTextarea(glossary.value) });
      message = 'Settings saved.';
      render();
    });

    const test = h('button', { class: 'button button--primary', type: 'button', disabled: busy }, [
      busy ? 'Testing…' : 'Test connection',
    ]);
    test.addEventListener('click', () => void runTest(baseUrl, textModel, visionModel, key));

    const status = h(
      'p',
      {
        class: `settings-status settings-status--${messageTone}`,
        'aria-live': 'polite',
      },
      [message],
    );

    const visionHelp =
      settings.preset === 'openrouter'
        ? `Default free vision: ${PRESETS.openrouter.visionModel}. Alternatives: ${OPENROUTER_VISION_ALTERNATIVES.join(', ')}.`
        : 'Used by the mindmap trainer for photo feedback.';

    clear(root);
    root.append(
      h('div', { class: 'screen-heading' }, [
        h('h1', {}, ['Settings']),
        h('p', { class: 'quiet' }, ['Changes are saved on this device.']),
      ]),
      h('section', { class: 'settings-section', 'aria-labelledby': 'agent-settings-title' }, [
        h('h2', { id: 'agent-settings-title' }, ['Agent']),
        field('Provider', preset, 'Choosing a provider fills in its usual URL and models.'),
        field('Base URL', baseUrl, 'Use HTTPS, or localhost for a local server.'),
        field('Text model', textModel, 'Used for text-only agent calls.'),
        field('Vision model', visionModel, visionHelp),
        modelList,
        h('div', { class: 'field' }, [
          h('label', { for: 'api-key' }, ['API key']),
          h('div', { class: 'input-actions' }, [key, show, clearKey]),
          h('p', { class: 'field-help', id: 'api-key-help' }, [
            settings.apiKey
              ? `Saved as ${maskKey(settings.apiKey)}. It stays in this browser.`
              : 'The key stays in this browser and is sent only to your provider.',
          ]),
        ]),
        test,
        status,
        field('AI feedback language', feedbackLanguage, 'Language for AI-written feedback.'),
        field(
          'Grok Bot link',
          grokUrl,
          'Optional. Used by "Copy prompt + open Grok Bot" when there is no key.',
        ),
        field(
          'Personal glossary',
          glossary,
          'One entry per line: term = meaning. Added to mindmap prompts.',
        ),
      ]),
      h('a', { class: 'quiet-link', href: '#/data' }, ['Your data']),
    );
    key.setAttribute('aria-describedby', 'api-key-help');
  };

  const runTest = async (
    baseUrl: HTMLInputElement,
    textModel: HTMLInputElement,
    visionModel: HTMLInputElement,
    key: HTMLInputElement,
  ): Promise<void> => {
    const next = {
      ...settings,
      baseUrl: baseUrl.value.trim(),
      textModel: textModel.value.trim(),
      visionModel: visionModel.value.trim(),
      apiKey: key.value.trim(),
    };
    persist(next);
    if (!isAllowedBaseUrl(next.baseUrl)) {
      message = 'Use an HTTPS base URL, or an HTTP localhost URL.';
      messageTone = 'warning';
      render();
      return;
    }
    busy = true;
    message = '';
    render();
    const models = await listModels(settings);
    if (models.ok) {
      modelIds = models.value.map((m) => m.id);
    }
    const result = await testConnection({
      client: runtime.agentClient,
      getSettings: () => settings,
    });
    busy = false;
    message = result.ok ? result.value : result.error.userMessage;
    messageTone = result.ok ? 'success' : 'warning';
    render();
  };

  render();
  return root;
}

function field(label: string, input: HTMLElement, help: string): HTMLElement {
  const id = input.id;
  const helpId = `${id}-help`;
  input.setAttribute('aria-describedby', helpId);
  return h('div', { class: 'field' }, [
    h('label', { for: id }, [label]),
    input,
    h('p', { class: 'field-help', id: helpId }, [help]),
  ]);
}
