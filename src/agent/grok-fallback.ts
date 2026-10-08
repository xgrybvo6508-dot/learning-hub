export interface GrokFallbackDeps {
  readonly copyText: (text: string) => Promise<void>;
  readonly openUrl: (url: string) => void;
  readonly showToast: (message: string) => void;
  readonly grokBotUrl: string;
}

const DEFAULT_TOAST =
  'Prompt copied. Paste it into Grok Bot with your photo.';

/** Copies the full prompt and optionally opens the Grok Bot URL from Settings. */
export async function copyPromptAndOpenGrok(
  prompt: string,
  deps: GrokFallbackDeps,
): Promise<void> {
  await deps.copyText(prompt);
  const url = deps.grokBotUrl.trim();
  if (url.length > 0) {
    deps.openUrl(url);
    deps.showToast('Prompt copied. Grok Bot opened.');
  } else {
    deps.showToast(DEFAULT_TOAST);
  }
}

export const GROK_FALLBACK_LABEL = 'Copy prompt + open Grok Bot';
