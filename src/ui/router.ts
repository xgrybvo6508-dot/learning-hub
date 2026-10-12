export type Route = { name: 'home' } | { name: 'course'; courseId: string } | { name: 'add' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\//, '') || '';
  if (!path || path === '/') return { name: 'home' };
  if (path === 'add') return { name: 'add' };
  const courseMatch = /^course\/(.+)$/.exec(path);
  if (courseMatch?.[1]) return { name: 'course', courseId: decodeURIComponent(courseMatch[1]) };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'add':
      return '#/add';
    case 'course':
      return `#/course/${encodeURIComponent(route.courseId)}`;
  }
}

export function navigate(route: Route): void {
  const next = routeToHash(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}
