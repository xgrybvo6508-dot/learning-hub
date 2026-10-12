import type { Course, Module } from '../course/types';

export type ProgressCounts = { done: number; total: number };

export function countCourseProgress(course: Course, doneIds: ReadonlySet<string>): ProgressCounts {
  let done = 0;
  let total = 0;
  for (const mod of course.modules) {
    for (const piece of mod.pieces) {
      total += 1;
      if (doneIds.has(piece.id)) done += 1;
    }
  }
  return { done, total };
}

export function countModuleProgress(mod: Module, doneIds: ReadonlySet<string>): ProgressCounts {
  let done = 0;
  const total = mod.pieces.length;
  for (const piece of mod.pieces) {
    if (doneIds.has(piece.id)) done += 1;
  }
  return { done, total };
}

export function isModuleComplete(mod: Module, doneIds: ReadonlySet<string>): boolean {
  if (mod.pieces.length === 0) return false;
  return mod.pieces.every((p) => doneIds.has(p.id));
}
