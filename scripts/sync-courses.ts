import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = '/workspace/learning-system/courses';
const dest = join(root, 'content', 'courses');

async function main(): Promise<void> {
  if (!existsSync(source)) {
    console.log('sync-courses: source missing, skipping.');
    return;
  }
  await cp(source, dest, { recursive: true });
  console.log('sync-courses: copied to content/courses');
}

void main();
