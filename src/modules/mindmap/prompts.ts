import mindmapCritique from '../../agent/prompts/mindmap-critique.md?raw';
import mindmapSkill from '../../agent/prompts/mindmap-skill.md?raw';
import { formatGlossaryTextarea, type GlossaryEntry } from '../../agent/settings';
import type { DrillMode, MindmapDrill } from './drills';

export type MindmapSystemPromptOptions = Readonly<{
  feedbackLanguage: string;
  glossaryMarkdown: string;
}>;

const GLOSSARY_HEADER = '## Personal glossary (user corrections override the legend)';

export function buildMindmapSystemPrompt(options: MindmapSystemPromptOptions): string {
  const language = options.feedbackLanguage.trim() || 'Russian';
  const parts = [
    mindmapCritique.trim(),
    `Feedback language for strengths, issues, missing, and nextDrill: ${language}.`,
    mindmapSkill.trim(),
  ];

  const glossary = options.glossaryMarkdown.trim();
  if (glossary.length > 0) {
    parts.push(`${GLOSSARY_HEADER}\n\n${glossary}`);
  }

  return parts.join('\n\n');
}

export function glossaryMarkdownFromEntries(entries: readonly GlossaryEntry[]): string {
  return formatGlossaryTextarea([...entries]);
}

export type MindmapUserPromptOptions = Readonly<{
  drill: MindmapDrill;
  mode: DrillMode;
  feedbackLanguage: string;
}>;

export function buildMindmapUserText(options: MindmapUserPromptOptions): string {
  const modeLabel = options.mode === 'text' ? 'Map this text' : 'Map this topic';
  const language = options.feedbackLanguage.trim() || 'Russian';
  return [
    `Drill mode: ${modeLabel}.`,
    `Feedback language: ${language}.`,
    `Drill title: ${options.drill.title}.`,
    '',
    options.drill.cardText || options.drill.instruction,
    '',
    'Analyze the attached mind map image(s). Step 1: read what is on the page. Step 2: critique against this drill. Reply with JSON only.',
  ].join('\n');
}

export { mindmapSkill, mindmapCritique, GLOSSARY_HEADER };
