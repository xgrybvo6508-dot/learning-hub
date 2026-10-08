import {
  isFiniteNumber,
  isRecord,
  isString,
  isStringArray,
  own,
  type UnknownRecord,
} from '../../lib/guards';
import { err, ok, type Result } from '../../lib/result';
import { parseJsonObject } from '../extract-json';

export const MINDMAP_ISSUE_TYPES = [
  'structure',
  'grouping',
  'relations',
  'gap',
  'missing',
] as const;

export type MindmapIssueType = (typeof MINDMAP_ISSUE_TYPES)[number];

export type MindmapCluster = Readonly<{
  name: string;
  nodes: readonly string[];
}>;

export type MindmapRelation = Readonly<{
  from: string;
  to: string;
  label: string | null;
}>;

export type MindmapRead = Readonly<{
  core: string;
  clusters: readonly MindmapCluster[];
  relations: readonly MindmapRelation[];
  unreadable: readonly string[];
}>;

export type MindmapScores = Readonly<{
  structure: number;
  chunking: number;
  relations: number;
  coverage: number;
  overall: number;
}>;

export type MindmapIssue = Readonly<{
  type: MindmapIssueType;
  detail: string;
}>;

export type MindmapFeedback = Readonly<{
  read: MindmapRead;
  scores: MindmapScores;
  strengths: readonly string[];
  issues: readonly MindmapIssue[];
  missing: readonly string[];
  nextDrill: string;
}>;

const SCORE_KEYS = ['structure', 'chunking', 'relations', 'coverage', 'overall'] as const;

const MAX_STRENGTHS = 3;
const MAX_ISSUES = 5;
const MAX_MISSING = 5;

function isMindmapIssueType(value: unknown): value is MindmapIssueType {
  return typeof value === 'string' && (MINDMAP_ISSUE_TYPES as readonly string[]).includes(value);
}

function parseScore(value: unknown, field: string): Result<number, string> {
  if (!isFiniteNumber(value)) return err(`scores.${field} must be a number.`);
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    return err(`scores.${field} must be an integer from 0 to 10.`);
  }
  return ok(value);
}

function parseCluster(value: unknown, index: number): Result<MindmapCluster, string> {
  if (!isRecord(value)) return err(`read.clusters[${index}] must be an object.`);
  const name = own(value, 'name');
  const nodes = own(value, 'nodes');
  if (!isString(name)) return err(`read.clusters[${index}].name must be a string.`);
  if (!isStringArray(nodes)) return err(`read.clusters[${index}].nodes must be a string array.`);
  return ok({ name, nodes });
}

function parseRelation(value: unknown, index: number): Result<MindmapRelation, string> {
  if (!isRecord(value)) return err(`read.relations[${index}] must be an object.`);
  const from = own(value, 'from');
  const to = own(value, 'to');
  const label = own(value, 'label');
  if (!isString(from)) return err(`read.relations[${index}].from must be a string.`);
  if (!isString(to)) return err(`read.relations[${index}].to must be a string.`);
  if (label !== null && !isString(label)) {
    return err(`read.relations[${index}].label must be a string or null.`);
  }
  return ok({ from, to, label: label === null ? null : label });
}

function parseRead(value: unknown): Result<MindmapRead, string> {
  if (!isRecord(value)) return err('read must be an object.');
  const core = own(value, 'core');
  const clustersRaw = own(value, 'clusters');
  const relationsRaw = own(value, 'relations');
  const unreadable = own(value, 'unreadable');
  if (!isString(core)) return err('read.core must be a string.');
  if (!Array.isArray(clustersRaw)) return err('read.clusters must be an array.');
  if (!Array.isArray(relationsRaw)) return err('read.relations must be an array.');
  if (!isStringArray(unreadable)) return err('read.unreadable must be a string array.');

  const clusters: MindmapCluster[] = [];
  for (let i = 0; i < clustersRaw.length; i++) {
    const parsed = parseCluster(clustersRaw[i], i);
    if (!parsed.ok) return parsed;
    clusters.push(parsed.value);
  }

  const relations: MindmapRelation[] = [];
  for (let i = 0; i < relationsRaw.length; i++) {
    const parsed = parseRelation(relationsRaw[i], i);
    if (!parsed.ok) return parsed;
    relations.push(parsed.value);
  }

  return ok({ core, clusters, relations, unreadable });
}

function parseScores(value: unknown): Result<MindmapScores, string> {
  if (!isRecord(value)) return err('scores must be an object.');
  const out: Partial<Record<(typeof SCORE_KEYS)[number], number>> = {};
  for (const key of SCORE_KEYS) {
    const parsed = parseScore(own(value, key), key);
    if (!parsed.ok) return parsed;
    out[key] = parsed.value;
  }
  return ok({
    structure: out.structure ?? 0,
    chunking: out.chunking ?? 0,
    relations: out.relations ?? 0,
    coverage: out.coverage ?? 0,
    overall: out.overall ?? 0,
  });
}

function parseIssue(value: unknown, index: number): Result<MindmapIssue, string> {
  if (!isRecord(value)) return err(`issues[${index}] must be an object.`);
  const type = own(value, 'type');
  const detail = own(value, 'detail');
  if (!isMindmapIssueType(type)) {
    return err(`issues[${index}].type must be structure, grouping, relations, gap, or missing.`);
  }
  if (!isString(detail)) return err(`issues[${index}].detail must be a string.`);
  return ok({ type, detail });
}

export function validateMindmapFeedbackRecord(
  record: UnknownRecord,
): Result<MindmapFeedback, string> {
  const read = parseRead(own(record, 'read'));
  if (!read.ok) return read;

  const scores = parseScores(own(record, 'scores'));
  if (!scores.ok) return scores;

  const strengths = own(record, 'strengths');
  if (!isStringArray(strengths)) return err('strengths must be a string array.');
  if (strengths.length > MAX_STRENGTHS) {
    return err(`strengths must have at most ${MAX_STRENGTHS} items.`);
  }

  const issuesRaw = own(record, 'issues');
  if (!Array.isArray(issuesRaw)) return err('issues must be an array.');
  if (issuesRaw.length > MAX_ISSUES) {
    return err(`issues must have at most ${MAX_ISSUES} items.`);
  }
  const issues: MindmapIssue[] = [];
  for (let i = 0; i < issuesRaw.length; i++) {
    const parsed = parseIssue(issuesRaw[i], i);
    if (!parsed.ok) return parsed;
    issues.push(parsed.value);
  }

  const missing = own(record, 'missing');
  if (!isStringArray(missing)) return err('missing must be a string array.');
  if (missing.length > MAX_MISSING) {
    return err(`missing must have at most ${MAX_MISSING} items.`);
  }

  const nextDrill = own(record, 'nextDrill');
  if (!isString(nextDrill)) return err('nextDrill must be a string.');

  return ok({
    read: read.value,
    scores: scores.value,
    strengths,
    issues,
    missing,
    nextDrill,
  });
}

export function parseMindmapFeedback(text: string): Result<MindmapFeedback, string> {
  const parsed = parseJsonObject(text);
  if (!parsed.ok) return parsed;
  return validateMindmapFeedbackRecord(parsed.value);
}
