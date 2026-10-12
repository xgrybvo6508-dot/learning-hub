import { resolveCourseImage } from '../../course/bundled';
import type { Course, Module } from '../../course/types';
import { h } from '../../lib/dom';
import { countCourseProgress, countModuleProgress, isModuleComplete } from '../../progress/math';
import type { TrackerStore } from '../../store/tracker-store';
import { burstConfetti } from '../confetti';
import { navigate } from '../router';

export function renderCourseView(
  root: HTMLElement,
  course: Course,
  store: TrackerStore,
  onChange: () => void,
): void {
  root.style.setProperty('--course-color', course.color);
  const doneIds = store.getDoneIds();
  const { done, total } = countCourseProgress(course, doneIds);
  const pct = total === 0 ? 0 : (done / total) * 100;
  const imgSrc = resolveCourseImage(course.image);

  const header = h('header', { class: 'course-header', style: `--course-color: ${course.color}` }, [
    h('button', { class: 'back-btn', type: 'button', 'aria-label': 'Назад' }, ['←']),
    h('div', { class: 'course-header__main' }, [
      imgSrc ? h('img', { class: 'course-header__img', src: imgSrc, alt: '' }) : null,
      h('h1', { class: 'course-header__title' }, [course.title]),
      h('div', { class: 'progress progress--header' }, [
        h('div', { class: 'progress__track' }, [
          h('div', {
            class: 'progress__fill progress__fill--animated',
            'data-progress': String(pct),
            style: `width: ${String(pct)}%`,
          }),
        ]),
        h('span', { class: 'progress__label' }, [`${String(done)} / ${String(total)}`]),
      ]),
    ]),
  ]);

  header.querySelector('.back-btn')?.addEventListener('click', () => {
    navigate({ name: 'home' });
  });

  const modulesEl = h(
    'div',
    { class: 'module-list' },
    course.modules.map((mod) => moduleBlock(mod, course, store, onChange)),
  );

  root.replaceChildren(header, modulesEl);
}

function moduleBlock(
  mod: Module,
  course: Course,
  store: TrackerStore,
  onChange: () => void,
): HTMLElement {
  const doneIds = store.getDoneIds();
  const { done, total } = countModuleProgress(mod, doneIds);
  const details = h('details', { class: 'module', open: done < total ? true : false }, [
    h('summary', { class: 'module__summary' }, [
      h('span', { class: 'module__title' }, [mod.title]),
      h('span', { class: 'module__count' }, [`${String(done)}/${String(total)}`]),
    ]),
    h(
      'ul',
      { class: 'piece-list' },
      mod.pieces.map((piece) => pieceRow(piece, course, store, mod, onChange)),
    ),
  ]);
  return details;
}

function pieceRow(
  piece: { id: string; title: string; goal: string },
  course: Course,
  store: TrackerStore,
  mod: Module,
  onChange: () => void,
): HTMLElement {
  const done = store.isDone(piece.id);
  const li = h('li', { class: done ? 'piece piece--done' : 'piece' }, [
    h(
      'button',
      {
        class: done ? 'piece__check piece__check--on' : 'piece__check',
        type: 'button',
        'aria-pressed': done ? 'true' : 'false',
        'aria-label': done ? 'Снять отметку' : 'Отметить пройденным',
      },
      [],
    ),
    h('div', { class: 'piece__body' }, [
      h('span', { class: 'piece__title' }, [piece.title]),
      piece.goal ? h('span', { class: 'piece__goal' }, [piece.goal]) : null,
    ]),
  ]);

  const check = li.querySelector('.piece__check');
  check?.addEventListener('click', () => {
    const wasDone = store.isDone(piece.id);
    const next = !wasDone;
    store.setDone(piece.id, next);
    if (next) {
      document.body.classList.add('flash-done');
      document.body.style.setProperty('--flash-color', course.color);
      window.setTimeout(() => document.body.classList.remove('flash-done'), 320);
      const ids = store.getDoneIds();
      if (!wasDone && isModuleComplete(mod, ids)) {
        burstConfetti(course.color);
      }
    }
    onChange();
  });

  return li;
}
