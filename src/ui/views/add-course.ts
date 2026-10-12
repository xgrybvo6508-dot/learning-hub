import { resolveCourseImage } from '../../course/bundled';
import { parseCourseMarkdown } from '../../course/parse';
import { generatedModuleId, generatedPieceId } from '../../course/stable-id';
import type { Course, Module } from '../../course/types';
import { h } from '../../lib/dom';
import type { TrackerStore } from '../../store/tracker-store';
import { navigate } from '../router';

function fileInput(attrs: { id: string; accept: string; hidden?: boolean }): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'file';
  el.id = attrs.id;
  el.accept = attrs.accept;
  if (attrs.hidden) el.hidden = true;
  return el;
}

function textInput(className: string, name: string, required = false): HTMLInputElement {
  const el = document.createElement('input');
  el.className = className;
  el.type = 'text';
  el.name = name;
  el.required = required;
  return el;
}

export function renderAddCourse(root: HTMLElement, store: TrackerStore): void {
  const message = h('p', { class: 'form-message', hidden: true }, ['']);
  const importInput = fileInput({ id: 'import-md', accept: '.md,text/markdown', hidden: true });

  const titleInput = textInput('field', 'title', true);
  const colorInput = document.createElement('input');
  colorInput.className = 'field';
  colorInput.type = 'color';
  colorInput.name = 'color';
  colorInput.value = '#6b7cff';
  const modulesInput = document.createElement('textarea');
  modulesInput.className = 'field field--area';
  modulesInput.name = 'modules';
  modulesInput.rows = 12;
  modulesInput.placeholder = 'Модуль 1\n  шаг один\n  шаг два\nМодуль 2\n  шаг';

  const form = h('form', { class: 'add-form' }, [
    h('h2', { class: 'section-title' }, ['Вручную']),
    h('label', { class: 'field-label' }, ['Название', titleInput]),
    h('label', { class: 'field-label' }, ['Цвет', colorInput]),
    h('label', { class: 'field-label' }, [
      'Модули и шаги (модуль — строка, шаги — с отступом)',
      modulesInput,
    ]),
    h('button', { class: 'btn btn--primary', type: 'submit' }, ['Сохранить']),
    h('h2', { class: 'section-title' }, ['Импорт .md']),
    h('button', { class: 'btn', type: 'button', id: 'pick-md' }, ['Выбрать файл']),
    importInput,
    message,
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const course = buildManualCourse(titleInput.value, colorInput.value, modulesInput.value);
    if (!course) {
      showMessage(message, 'Добавьте хотя бы один модуль и шаг.');
      return;
    }
    store.addCustomCourse(course);
    navigate({ name: 'course', courseId: course.id });
  });

  form.querySelector('#pick-md')?.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      const parsed = parseCourseMarkdown({ markdown: text, builtin: false });
      if ('kind' in parsed) {
        showMessage(message, parsed.message);
        return;
      }
      const withImage = { ...parsed, image: resolveCourseImage(parsed.image) };
      store.addCustomCourse(withImage);
      navigate({ name: 'course', courseId: withImage.id });
    });
  });

  const header = h('header', { class: 'app-header' }, [
    h('button', { class: 'back-btn', type: 'button' }, ['←']),
    h('h1', { class: 'app-title' }, ['+ Курс']),
  ]);
  header.querySelector('.back-btn')?.addEventListener('click', () => {
    navigate({ name: 'home' });
  });

  root.replaceChildren(header, form);
}

function showMessage(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.hidden = false;
}

function buildManualCourse(title: string, color: string, raw: string): Course | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;
  const courseKey =
    trimmedTitle
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'course';
  const modules: Module[] = [];
  let current: Module | null = null;
  let modIdx = 0;
  let pieceIdx = 0;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const isStep = /^\s+/.test(line);
    const text = line.trim();
    if (!isStep) {
      modIdx += 1;
      pieceIdx = 0;
      const id = generatedModuleId(courseKey, text, modIdx);
      current = { id, title: text, pieces: [] };
      modules.push(current);
      continue;
    }
    if (!current) continue;
    pieceIdx += 1;
    const id = generatedPieceId(courseKey, current.id, text, pieceIdx);
    current.pieces.push({ id, title: text, goal: '', initiallyDone: false });
  }

  if (modules.every((m) => m.pieces.length === 0)) return null;
  return {
    id: courseKey,
    title: trimmedTitle,
    color,
    image: '',
    modules,
    builtin: false,
  };
}
