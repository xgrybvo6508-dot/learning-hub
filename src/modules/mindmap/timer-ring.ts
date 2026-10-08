import { h } from '../../lib/dom';

export function formatTimerMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatOverrun(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `+${m}:${s.toString().padStart(2, '0')}`;
}

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

export function timerRingSvg(progress: number, cue: boolean): SVGSVGElement {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = RING_C * (1 - clamped);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `timer-ring${cue ? ' timer-ring--cue' : ''}`);
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');

  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('class', 'timer-ring__track');
  track.setAttribute('cx', '60');
  track.setAttribute('cy', '60');
  track.setAttribute('r', String(RING_R));
  track.setAttribute('fill', 'none');

  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  arc.setAttribute('class', 'timer-ring__arc');
  arc.setAttribute('cx', '60');
  arc.setAttribute('cy', '60');
  arc.setAttribute('r', String(RING_R));
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke-dasharray', String(RING_C));
  arc.setAttribute('stroke-dashoffset', String(offset));

  svg.append(track, arc);
  return svg;
}

export function timerDisplayEl(
  elapsedMs: number,
  targetMs: number,
  running: boolean,
  cue: boolean,
): HTMLElement {
  const progress = targetMs > 0 ? elapsedMs / targetMs : 0;
  const wrap = h('div', { class: 'timer-display' });
  wrap.append(timerRingSvg(progress, cue));
  const label = h('div', { class: 'timer-display__label' });
  const main = h('span', { class: 'timer-display__main' }, [formatTimerMs(elapsedMs)]);
  label.append(main);
  if (elapsedMs > targetMs && targetMs > 0) {
    label.append(
      h('span', { class: 'timer-display__overrun' }, [formatOverrun(elapsedMs - targetMs)]),
    );
  }
  if (!running && elapsedMs === 0) {
    label.append(h('span', { class: 'timer-display__hint' }, ['Tap Start when you begin drawing']));
  }
  wrap.append(label);
  return wrap;
}
