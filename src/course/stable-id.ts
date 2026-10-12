/** FNV-1a 32-bit hash for stable generated piece/module ids. */
export function stableHash(parts: readonly string[]): string {
  let h = 0x811c9dc5;
  const text = parts.join('\0');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function generatedModuleId(courseKey: string, title: string, index: number): string {
  return `mod-${stableHash([courseKey, String(index), title])}`;
}

export function generatedPieceId(
  courseKey: string,
  moduleKey: string,
  title: string,
  index: number,
): string {
  return `piece-${stableHash([courseKey, moduleKey, String(index), title])}`;
}
