import { isRecord, own } from '../lib/guards';
import { err, ok, type Result } from '../lib/result';
import type { AgentClient } from './client';
import { AgentError } from './errors';
import {
  isAllowedBaseUrl,
  OPENROUTER_REFERER,
  OPENROUTER_TITLE,
  type Settings,
} from './settings';

export const CONNECTION_TIMEOUT_MS = 15_000;

const CONNECTION_MESSAGES = [
  { role: 'user' as const, content: 'Reply with the word ok.' },
];

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ModelListEntry {
  readonly id: string;
}

function modelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/models`;
}

function extraHeaders(settings: Settings): Record<string, string> {
  if (settings.preset !== 'openrouter') return {};
  return {
    'HTTP-Referer': OPENROUTER_REFERER,
    'X-Title': OPENROUTER_TITLE,
  };
}

export async function listModels(
  settings: Settings,
  fetchFn: FetchLike = globalThis.fetch,
): Promise<Result<ModelListEntry[], AgentError>> {
  if (!isAllowedBaseUrl(settings.baseUrl) || settings.apiKey.trim().length === 0) {
    return err(new AgentError('config'));
  }
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);
  try {
    const response = await fetchFn(modelsUrl(settings.baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        ...extraHeaders(settings),
      },
      signal: controller.signal,
    });
    if (!response.ok) return err(new AgentError(response.status === 401 ? 'auth' : 'bad-response'));
    const text = await response.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      return err(new AgentError('bad-response'));
    }
    if (!isRecord(raw)) return err(new AgentError('bad-response'));
    const data = own(raw, 'data');
    if (!Array.isArray(data)) return err(new AgentError('bad-response'));
    const models: ModelListEntry[] = [];
    for (const item of data) {
      if (!isRecord(item)) continue;
      const id = own(item, 'id');
      if (typeof id === 'string' && id.length > 0) models.push({ id });
    }
    models.sort((a, b) => a.id.localeCompare(b.id));
    return ok(models);
  } catch (cause) {
    if (controller.signal.aborted) return err(new AgentError('timeout'));
    if (cause instanceof TypeError) return err(new AgentError('network'));
    return err(new AgentError('network'));
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function testConnection(
  deps: {
    readonly client: AgentClient;
    readonly getSettings: () => Settings;
  },
): Promise<Result<string, AgentError>> {
  const settings = deps.getSettings();
  const result = await deps.client.complete(settings, {
    messages: CONNECTION_MESSAGES,
    temperature: 0,
    maxTokens: 5,
    timeoutMs: CONNECTION_TIMEOUT_MS,
  });
  return result.ok ? ok('Connected.') : result;
}
