import type { Course } from '../../course/types';
import { resolveCourseImage } from '../../course/bundled';
import { h, setCourseColor, setProgressPct } from '../../lib/dom';
import { countCourseProgress } from '../../progress/math';
import { navigate } from '../router';

export function renderHome(
  root: HTMLElement,
  courses: Course[],
  doneIds: ReadonlySet<string>,
): void {
  root.replaceChildren(
    h('header', { class: 'app-header' }, [h('h1', { class: 'app-title' }, ['Курсы'])]),
    h('div', { class: 'carousel', role: 'list' }, [
      ...courses.map((course) => courseCard(course, doneIds)),
      addCard(),
    ]),
  );
}

function courseCard(course: Course, doneIds: ReadonlySet<string>): HTMLElement {
  const { done, total } = countCourseProgress(course, doneIds);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const imgSrc = resolveCourseImage(course.image);
  const fill = h('div', { class: 'progress__fill' });
  setProgressPct(fill, pct);
  const card = h(
    'button',
    {
      class: 'course-card',
      type: 'button',
      role: 'listitem',
      'data-course-id': course.id,
    },
    [
      h('div', { class: 'course-card__media' }, [
        imgSrc
          ? h('img', { class: 'course-card__img', src: imgSrc, alt: '' })
          : h('div', { class: 'course-card__img course-card__img--placeholder' }),
      ]),
      h('h2', { class: 'course-card__title' }, [course.title]),
      h('div', { class: 'progress' }, [
        h('div', { class: 'progress__track' }, [fill]),
        h('span', { class: 'progress__label' }, [`${String(done)} / ${String(total)}`]),
      ]),
    ],
  );
  setCourseColor(card, course.color);
  card.addEventListener('click', () => {
    navigate({ name: 'course', courseId: course.id });
  });
  return card;
}

function addCard(): HTMLElement {
  const card = h(
    'button',
    { class: 'course-card course-card--add', type: 'button', role: 'listitem' },
    [h('span', { class: 'course-card__add-label' }, ['+ Курс'])],
  );
  card.addEventListener('click', () => {
    navigate({ name: 'add' });
  });
  return card;
}
