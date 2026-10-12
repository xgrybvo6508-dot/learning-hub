import cursorMd from '../../data/courses/cursor.md?raw';
import discreteMd from '../../data/courses/discrete.md?raw';
import claudeMd from '../../data/courses/claude.md?raw';
import { parseCourseMarkdown } from './parse';
import type { Course } from './types';

const imageModules: Record<string, string> = import.meta.glob('../../data/courses/images/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imageByBasename = new Map<string, string>();
for (const [path, url] of Object.entries(imageModules)) {
  const base = path.split('/').pop();
  if (base) imageByBasename.set(base, url);
}

function load(id: string, markdown: string): Course {
  const parsed = parseCourseMarkdown({ markdown, courseId: id, builtin: true });
  if ('kind' in parsed) {
    throw new Error(`Failed to parse ${id}: ${parsed.message}`);
  }
  return resolveImages(parsed);
}

function resolveImages(course: Course): Course {
  const image = resolveCourseImage(course.image);
  return { ...course, image };
}

export function resolveCourseImage(image: string): string {
  if (!image) return '';
  const base = import.meta.env.BASE_URL;
  if (
    image.startsWith(base) ||
    image.startsWith('data:') ||
    image.startsWith('blob:') ||
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }
  if (image.startsWith('/') && !image.startsWith('images/')) {
    return image;
  }
  if (image.trimStart().startsWith('<svg')) {
    return `data:image/svg+xml,${encodeURIComponent(image.trim())}`;
  }
  const name =
    image
      .replace(/^images\//, '')
      .split('/')
      .pop() ?? image;
  const bundled = imageByBasename.get(name);
  if (bundled) return bundled;
  const rel = image.replace(/^\//, '').replace(/^images\//, '');
  return `${base}courses/images/${rel}`;
}

const BUILTIN: Course[] = [
  load('cursor', cursorMd),
  load('discrete', discreteMd),
  load('claude', claudeMd),
];

export function getBuiltinCourses(): readonly Course[] {
  return BUILTIN;
}
