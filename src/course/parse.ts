import { generatedModuleId, generatedPieceId } from './stable-id';
import type { Course, Module, Piece, ParsedCourseInput } from './types';

const HEADING_MODULE = /^##\s+(.+)$/;
const HEADING_PIECE = /^###\s+(.+)$/;
const HEADING_TITLE = /^#\s+(.+)$/;
const ID_TITLE = /^([A-Za-z][\w-]*(?:\.\d+)*)\s*·\s*(.+)$/;
const GOAL_LINE = /^-\s*\*\*Цель:\*\*\s*(.+)$/;
const STATUS_LINE = /^-\s*\*\*Статус:\*\*\s*(.+)$/;
const PROYDENO_ID = /^-\s*\*\*([A-Za-z][\w-]*(?:\.\d+)*)\*\*/;

export type ParseError = { kind: 'parse'; message: string };

export function parseCourseMarkdown(input: ParsedCourseInput): Course | ParseError {
  const { markdown, courseId: explicitId, builtin = false } = input;
  const { body, frontmatter } = splitFrontmatter(markdown);
  const color = frontmatter.color ?? '#6b7cff';
  const image = frontmatter.image ?? '';

  const lines = body.split(/\r?\n/);
  let title = 'Без названия';
  for (const line of lines) {
    const m = HEADING_TITLE.exec(line.trim());
    if (m?.[1]) {
      title = m[1].trim();
      break;
    }
  }

  const courseKey = explicitId ?? slugFromTitle(title);
  const doneFromList = collectProydenoIds(lines);

  const modules: Module[] = [];
  let currentModule: Module | null = null;
  let pieceLines: string[] = [];
  let pieceHeading: string | null = null;
  let pieceIndex = 0;

  const flushPiece = (): void => {
    if (!currentModule || pieceHeading === null) return;
    const piece = buildPiece(
      pieceHeading,
      pieceLines,
      courseKey,
      currentModule.id,
      pieceIndex,
      doneFromList,
    );
    currentModule.pieces.push(piece);
    pieceIndex += 1;
    pieceHeading = null;
    pieceLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const mod = HEADING_MODULE.exec(trimmed);
    if (mod) {
      flushPiece();
      const modText = mod[1]?.trim();
      if (!modText) continue;
      const idMatch = ID_TITLE.exec(modText);
      if (!idMatch?.[1] || !idMatch[2]) {
        currentModule = null;
        continue;
      }
      pieceIndex = 0;
      const modId = idMatch[1];
      const modTitle = idMatch[2].replace(/\s*✅\s*$/, '').trim();
      currentModule = { id: modId, title: modTitle, pieces: [] };
      modules.push(currentModule);
      continue;
    }

    const piece = HEADING_PIECE.exec(trimmed);
    if (piece) {
      flushPiece();
      if (!currentModule) continue;
      pieceHeading = piece[1]?.trim() ?? '';
      continue;
    }

    if (pieceHeading !== null) {
      pieceLines.push(line);
    }
  }
  flushPiece();

  if (modules.length === 0) {
    const manual = parseManualStructure(lines, courseKey);
    if (manual) {
      return {
        id: courseKey,
        title,
        color,
        image,
        modules: manual,
        builtin,
      };
    }
  }

  return {
    id: courseKey,
    title,
    color,
    image,
    modules,
    builtin,
  };
}

function splitFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, body: markdown };
  }
  const end = trimmed.indexOf('\n---', 3);
  if (end === -1) {
    return { frontmatter: {}, body: markdown };
  }
  const raw = trimmed.slice(4, end);
  const body = trimmed.slice(end + 4).replace(/^\r?\n/, '');
  const frontmatter: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^(\w+):\s*(.+)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1];
    const rawValue = m[2];
    if (!key || !rawValue) continue;
    const value = rawValue.trim().replace(/^["']|["']$/g, '');
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

function collectProydenoIds(lines: string[]): Set<string> {
  const ids = new Set<string>();
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Пройдено\b/i.test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(trimmed) && !/^##\s+Пройдено/i.test(trimmed)) {
      inSection = false;
    }
    if (!inSection) continue;
    const m = PROYDENO_ID.exec(trimmed);
    if (m?.[1]) ids.add(m[1]);
  }
  return ids;
}

function buildPiece(
  heading: string,
  bodyLines: string[],
  courseKey: string,
  moduleKey: string,
  index: number,
  doneFromList: Set<string>,
): Piece {
  const cleanHeading = heading.replace(/\s*✅\s*$/, '').trim();
  const idMatch = ID_TITLE.exec(cleanHeading);
  let id: string;
  let title: string;
  if (idMatch?.[1] && idMatch[2]) {
    id = idMatch[1];
    title = idMatch[2].replace(/\s*✅\s*$/, '').trim();
  } else {
    title = heading.replace(/\s*✅\s*$/, '').trim();
    id = generatedPieceId(courseKey, moduleKey, title, index);
  }

  let goal = '';
  for (const line of bodyLines) {
    const g = GOAL_LINE.exec(line.trim());
    if (g?.[1]) {
      goal = g[1].trim();
      break;
    }
  }

  const headingDone = /✅/.test(heading);
  let statusDone = false;
  for (const line of bodyLines) {
    const s = STATUS_LINE.exec(line.trim());
    if (s?.[1] && /✅/.test(s[1])) {
      statusDone = true;
      break;
    }
  }
  const listDone = doneFromList.has(id);
  const initiallyDone = headingDone || statusDone || listDone;

  return { id, title, goal, initiallyDone };
}

function parseManualStructure(lines: string[], courseKey: string): Module[] | null {
  const modules: Module[] = [];
  let current: Module | null = null;
  let modIdx = 0;
  let pieceIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const mod = HEADING_MODULE.exec(trimmed);
    if (mod) {
      const modText = mod[1]?.trim();
      if (!modText) continue;
      modIdx += 1;
      pieceIdx = 0;
      const idMatch = ID_TITLE.exec(modText);
      if (idMatch?.[1] && idMatch[2]) {
        current = { id: idMatch[1], title: idMatch[2].trim(), pieces: [] };
      } else {
        const id = generatedModuleId(courseKey, modText, modIdx);
        current = { id, title: modText, pieces: [] };
      }
      modules.push(current);
      continue;
    }
    const piece = HEADING_PIECE.exec(trimmed);
    if (piece && current) {
      const pieceText = piece[1]?.trim();
      if (!pieceText) continue;
      pieceIdx += 1;
      const idMatch = ID_TITLE.exec(pieceText);
      const title = idMatch?.[2]?.trim() ?? pieceText;
      const id = idMatch?.[1] ?? generatedPieceId(courseKey, current.id, title, pieceIdx);
      current.pieces.push({ id, title, goal: '', initiallyDone: /✅/.test(pieceText) });
      continue;
    }
    if (current && trimmed.startsWith('-')) {
      const last = current.pieces.at(-1);
      if (last && !last.goal) {
        const g = GOAL_LINE.exec(trimmed);
        if (g?.[1]) last.goal = g[1].trim();
      }
    }
  }
  return modules.length > 0 ? modules : null;
}

function slugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  return base || 'course';
}

export function countPieces(course: Course): number {
  return course.modules.reduce((n, m) => n + m.pieces.length, 0);
}
