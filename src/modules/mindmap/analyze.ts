import type { AgentClient, ChatMessage, ContentPart } from '../../agent/client';
import type { AgentError } from '../../agent/errors';
import { isAllowedBaseUrl, type Settings } from '../../agent/settings';
import { err, type Result } from '../../lib/result';
import {
  parseMindmapFeedback,
  type MindmapFeedback,
} from '../../agent/validators/mindmap-feedback';
import type { DrillMode, MindmapDrill } from './drills';
import {
  buildMindmapSystemPrompt,
  buildMindmapUserText,
  glossaryMarkdownFromEntries,
} from './prompts';
import type { EncodedJpeg } from './image';

const REPAIR_HINT =
  'Your previous reply was not valid JSON for the required schema. Return only one corrected JSON object with all required fields and integer scores 0–10.';

export function visionAgentReady(settings: Settings): boolean {
  return (
    isAllowedBaseUrl(settings.baseUrl) &&
    settings.apiKey.trim().length > 0 &&
    settings.visionModel.trim().length > 0
  );
}

export function agentErrorMessage(error: AgentError): string {
  if (error.kind === 'config') {
    return 'Add an API key and vision model in Settings to get photo feedback here.';
  }
  if (error.kind === 'timeout') {
    return 'The vision request took too long. Try again or turn off detail mode.';
  }
  return error.userMessage;
}

function imageParts(images: readonly EncodedJpeg[]): ContentPart[] {
  return images.map((img) => ({
    type: 'image_url',
    image_url: { url: img.dataUrl },
  }));
}

function buildMessages(
  settings: Settings,
  drill: MindmapDrill,
  mode: DrillMode,
  images: readonly EncodedJpeg[],
  extraUserText?: string,
): ChatMessage[] {
  const system = buildMindmapSystemPrompt({
    feedbackLanguage: settings.feedbackLanguage,
    glossaryMarkdown: glossaryMarkdownFromEntries(settings.glossary),
  });
  const userText = buildMindmapUserText({
    drill,
    mode,
    feedbackLanguage: settings.feedbackLanguage,
  });
  const parts: ContentPart[] = [{ type: 'text', text: extraUserText ?? userText }];
  parts.push(...imageParts(images));
  return [
    { role: 'system', content: system },
    { role: 'user', content: parts },
  ];
}

async function completeOnce(
  client: AgentClient,
  settings: Settings,
  messages: ChatMessage[],
): Promise<Result<string, AgentError>> {
  return client.complete(settings, {
    messages,
    temperature: 0.2,
    maxTokens: 4096,
    timeoutMs: 120_000,
    jsonMode: true,
    model: settings.visionModel,
  });
}

export async function analyzeMindmapPhoto(
  client: AgentClient,
  settings: Settings,
  drill: MindmapDrill,
  mode: DrillMode,
  images: readonly EncodedJpeg[],
): Promise<Result<MindmapFeedback, string>> {
  if (!visionAgentReady(settings)) {
    return err('Add an API key and vision model in Settings to get photo feedback here.');
  }
  const messages = buildMessages(settings, drill, mode, images);
  const first = await completeOnce(client, settings, messages);
  if (!first.ok) return err(agentErrorMessage(first.error));

  let parsed = parseMindmapFeedback(first.value);
  if (parsed.ok) return parsed;

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: first.value },
    { role: 'user', content: REPAIR_HINT },
  ];
  const second = await completeOnce(client, settings, retryMessages);
  if (!second.ok) return err(`${parsed.error} ${agentErrorMessage(second.error)}`);
  parsed = parseMindmapFeedback(second.value);
  if (!parsed.ok) {
    return err(
      'The model returned invalid feedback. Try again or use Copy prompt + open Grok Bot.',
    );
  }
  return parsed;
}

export function grokFallbackPrompt(
  settings: Settings,
  drill: MindmapDrill,
  mode: DrillMode,
): string {
  const system = buildMindmapSystemPrompt({
    feedbackLanguage: settings.feedbackLanguage,
    glossaryMarkdown: glossaryMarkdownFromEntries(settings.glossary),
  });
  const userText = buildMindmapUserText({
    drill,
    mode,
    feedbackLanguage: settings.feedbackLanguage,
  });
  return `${system}\n\n---\n\n${userText}\n\n(Attach your mind map photo to Grok Bot.)`;
}
