import drillsMarkdown from '../../../content/courses/mindmapping-drills.md?raw';

export type DrillSource = 'bundled' | 'course' | 'builtin';
export type DrillMode = 'topic' | 'text';

export interface MindmapDrill {
  readonly id: string;
  readonly title: string;
  readonly minutes: number | null;
  readonly level: string | null;
  readonly instruction: string;
  readonly success: string;
  readonly aiNote: string;
  readonly mode: DrillMode;
  readonly source: DrillSource;
  readonly cardText: string;
}

const DRILL_HEADING = /^## (\d+)\.\s+(.+?)\s+·\s+(\d+)\s+мин\s+·\s+уровень\s+(.+)$/u;

const FIELD_INSTRUCTION = /^\*\*Инструкция:\*\*\s*(.+)$/u;
const FIELD_SUCCESS = /^\*\*Успех:\*\*\s*(.+)$/u;
const FIELD_AI = /^\*\*ИИ:\*\*\s*(.+)$/u;

const courseModules: Record<string, string> = import.meta.glob('../../../content/courses/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function inferMode(instruction: string): DrillMode {
  const lower = instruction.toLowerCase();
  if (
    lower.includes('абзац') ||
    lower.includes('текст') ||
    lower.includes('цитат') ||
    lower.includes('paragraph')
  ) {
    return 'text';
  }
  return 'topic';
}

function stripObsidianLinks(text: string): string {
  return text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/gu, '$1');
}

/** Parses bundled `mindmapping-drills.md` sections. */
export function parseMindmappingDrillsMarkdown(markdown: string): MindmapDrill[] {
  const lines = markdown.split('\n');
  const drills: MindmapDrill[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const heading = DRILL_HEADING.exec(line.trim());
    if (!heading) {
      i++;
      continue;
    }
    const num = heading[1] ?? '';
    const title = heading[2]?.trim() ?? '';
    const minutes = Number.parseInt(heading[3] ?? '', 10);
    const level = heading[4]?.trim() ?? '';
    i++;
    const block: string[] = [];
    while (i < lines.length && !DRILL_HEADING.test((lines[i] ?? '').trim())) {
      if (/^## /.test(lines[i] ?? '')) break;
      block.push(lines[i] ?? '');
      i++;
    }
    let instruction = '';
    let success = '';
    let aiNote = '';
    for (const raw of block) {
      const trimmed = raw.trim();
      const ins = FIELD_INSTRUCTION.exec(trimmed);
      const suc = FIELD_SUCCESS.exec(trimmed);
      const ai = FIELD_AI.exec(trimmed);
      if (ins) instruction = ins[1]?.trim() ?? '';
      else if (suc) success = suc[1]?.trim() ?? '';
      else if (ai) aiNote = ai[1]?.trim() ?? '';
    }
    const cardText = stripObsidianLinks(
      [`**Instruction:** ${instruction}`, `**Success:** ${success}`, `**AI check:** ${aiNote}`]
        .filter((s) => s.length > 12)
        .join('\n\n'),
    );
    drills.push({
      id: `drill-${num}`,
      title: stripObsidianLinks(title),
      minutes: Number.isFinite(minutes) ? minutes : null,
      level,
      instruction: stripObsidianLinks(instruction),
      success: stripObsidianLinks(success),
      aiNote: stripObsidianLinks(aiNote),
      mode: inferMode(instruction),
      source: 'bundled',
      cardText,
    });
  }
  return drills;
}

function slugFromPath(path: string): string {
  const normalized = path.replace(/\\/gu, '/');
  const match = normalized.match(/content\/courses\/(.+)\.md$/u);
  return (match?.[1] ?? path).replace(/\//gu, '-');
}

function moduleTitleFromMarkdown(body: string): string | null {
  const h1 = body.match(/^#\s+(.+)$/mu);
  if (h1?.[1]) return stripObsidianLinks(h1[1].trim());
  const h2 = body.match(/^##\s+(.+)$/mu);
  if (h2?.[1]) return stripObsidianLinks(h2[1].trim());
  return null;
}

function keyIdeasFromMarkdown(body: string): string[] {
  const ideas: string[] = [];
  for (const line of body.split('\n')) {
    const bullet = line.match(/^[-*]\s+(.+)$/u);
    if (!bullet?.[1]) continue;
    const text = stripObsidianLinks(bullet[1].replace(/\[\[|\]\]/gu, '').trim());
    if (text.length > 8 && text.length < 120) ideas.push(text);
    if (ideas.length >= 4) break;
  }
  return ideas;
}

function drillsFromCourseModules(): MindmapDrill[] {
  const out: MindmapDrill[] = [];
  for (const [path, body] of Object.entries(courseModules)) {
    if (!path.includes('/content/courses/')) continue;
    if (path.includes('mindmapping-drills.md')) continue;
    if (path.includes('interleaving-plan.md')) continue;
    if (path.includes('/anki/')) continue;
    if (path.endsWith('/00-overview.md')) continue;
    if (!/\/(discrete-math|learning-science)\//u.test(path)) continue;
    const title = moduleTitleFromMarkdown(body);
    if (!title) continue;
    const ideas = keyIdeasFromMarkdown(body);
    const ideaLine = ideas.length > 0 ? ` Key ideas: ${ideas.join('; ')}.` : '';
    const instruction = `Map this topic: ${title}.${ideaLine} Use few strong clusters, labeled relations, and a clear center.`;
    out.push({
      id: `course-${slugFromPath(path)}`,
      title: `Map: ${title}`,
      minutes: 10,
      level: 'module',
      instruction,
      success: 'Clusters match the module themes; cross-links are labeled.',
      aiNote: 'Check grouping by function, not by source order.',
      mode: 'topic',
      source: 'course',
      cardText: instruction,
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export const BUILTIN_FALLBACK_DRILLS: readonly MindmapDrill[] = [
  {
    id: 'builtin-dm-graphs',
    title: 'Planarity and K5',
    minutes: 10,
    level: '1',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map why K5 and K3,3 block planarity. Chunks + labeled arrows only.',
    success: 'At least 2 cross-cluster links with relation labels.',
    aiNote: 'Flag list-shaped branches.',
    cardText:
      '**Instruction:** Map why K5 and K3,3 block planarity.\n\n**Success:** At least 2 cross-cluster links with relation labels.',
  },
  {
    id: 'builtin-dm-induction',
    title: 'Induction template',
    minutes: 10,
    level: '1',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map the induction proof skeleton: base, hypothesis, step, conclusion.',
    success: 'Each arrow answers "why this step follows".',
    aiNote: 'Find empty "follows" labels.',
    cardText:
      '**Instruction:** Map the induction proof skeleton.\n\n**Success:** Each arrow answers why the step follows.',
  },
  {
    id: 'builtin-ls-chunking',
    title: 'Chunking vs cognitive load',
    minutes: 8,
    level: '1',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map intrinsic vs extraneous load and how chunking helps.',
    success: 'Three chunks max; each named with a symbol.',
    aiNote: 'Reject sentence-order chunks.',
    cardText: '**Instruction:** Map intrinsic vs extraneous load and chunking.',
  },
  {
    id: 'builtin-ls-interleave',
    title: 'Spacing and interleaving',
    minutes: 10,
    level: '2',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map how spacing and interleaving differ and when each helps.',
    success: 'At least one ↔ link between the two ideas.',
    aiNote: 'Check for contrast labels (≠, vs).',
    cardText: '**Instruction:** Map spacing vs interleaving.',
  },
  {
    id: 'builtin-neuro-wm',
    title: 'Working memory and ADHD',
    minutes: 10,
    level: '2',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map working memory limits and ADHD-friendly study tactics.',
    success: 'Non-linear link between brain constraint and tactic.',
    aiNote: 'Look for spine (emphasized links).',
    cardText: '**Instruction:** Map working memory limits and ADHD tactics.',
  },
  {
    id: 'builtin-neuro-2e',
    title: 'Twice-exceptional learning',
    minutes: 10,
    level: '2',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map strengths and friction in 2e learning (async depth vs executive load).',
    success: 'Both sides linked with labeled relations.',
    aiNote: 'No bullet lists without grouping.',
    cardText: '**Instruction:** Map 2e strengths and friction.',
  },
  {
    id: 'builtin-en-argument',
    title: 'English argument structure',
    minutes: 8,
    level: '1',
    mode: 'text',
    source: 'builtin',
    instruction:
      'Map this text: "Claims need reasons; reasons need evidence; counterclaims strengthen the map."',
    success: 'Each claim connects to a reason with a labeled arrow.',
    aiNote: 'Coverage of all three sentences.',
    cardText:
      '**Text to map:** Claims need reasons; reasons need evidence; counterclaims strengthen the map.',
  },
  {
    id: 'builtin-en-metaphor',
    title: 'Metaphor vs literal',
    minutes: 8,
    level: '1',
    mode: 'text',
    source: 'builtin',
    instruction:
      'Map this text: "Metaphor compresses meaning; literal text expands it; good notes use both."',
    success: 'Two clusters with a bridge relation.',
    aiNote: 'Check non-verbal compression.',
    cardText: '**Text to map:** Metaphor compresses; literal expands; good notes use both.',
  },
  {
    id: 'builtin-dm-counting',
    title: 'Counting principles',
    minutes: 12,
    level: '2',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map product rule, sum rule, and complement for counting problems.',
    success: 'Contrast link between product and sum.',
    aiNote: 'Missing complement is a gap issue.',
    cardText: '**Instruction:** Map product, sum, and complement rules.',
  },
  {
    id: 'builtin-ls-feynman',
    title: 'Feynman loop',
    minutes: 10,
    level: '2',
    mode: 'topic',
    source: 'builtin',
    instruction: 'Map explain → gap questions → revise, without lecturing yourself.',
    success: 'Cycle drawn with direction arrows.',
    aiNote: 'Relations labeled as steps.',
    cardText: '**Instruction:** Map the Feynman explain–gap–revise loop.',
  },
];

let cachedDrills: MindmapDrill[] | null = null;

export function allMindmapDrills(): MindmapDrill[] {
  if (cachedDrills) return cachedDrills;
  const bundled = parseMindmappingDrillsMarkdown(drillsMarkdown);
  const courses = drillsFromCourseModules();
  const merged = [...bundled, ...courses];
  cachedDrills = merged.length > 0 ? merged : [...BUILTIN_FALLBACK_DRILLS];
  return cachedDrills;
}

export function drillById(id: string): MindmapDrill | undefined {
  return allMindmapDrills().find((d) => d.id === id);
}

export function presetMinutes(drill: MindmapDrill): number {
  if (drill.minutes !== null && drill.minutes > 0) {
    const rounded = Math.round(drill.minutes / 5) * 5;
    if (rounded >= 5 && rounded <= 15) return rounded;
    if (drill.minutes <= 7) return 5;
    if (drill.minutes <= 12) return 10;
    return 15;
  }
  return 10;
}
