import { GROK_FALLBACK_LABEL, copyPromptAndOpenGrok } from '../../agent/grok-fallback';
import { loadSettings } from '../../agent/settings';
import type { MindmapFeedback } from '../../agent/validators/mindmap-feedback';
import { clear, h } from '../../lib/dom';
import { newId } from '../../lib/ids';
import type { MindmapHistoryRecord } from '../../memory/schema';
import type { UiRuntime } from '../../ui/runtime';
import { analyzeMindmapPhoto, grokFallbackPrompt, visionAgentReady } from './analyze';
import {
  allMindmapDrills,
  drillById,
  type DrillMode,
  type MindmapDrill,
  presetMinutes,
} from './drills';
import { encodeImageFile, encodeThumbnail, extractDetailTiles, type EncodedJpeg } from './image';
import { CRITERION_LABELS, SCORE_CRITERIA, historySeries, sparklinePath } from './sparkline';
import { loadThumbnailBlob, saveThumbnailBlob } from './thumbnails';
import { formatTimerMs, timerDisplayEl } from './timer-ring';

type Phase = 'pick' | 'session' | 'feedback';

export function mindmapView(runtime: UiRuntime): HTMLElement {
  const root = h('section', { class: 'screen mindmap-screen' });
  let phase: Phase = 'pick';
  let selected: MindmapDrill | null = null;
  let mode: DrillMode = 'topic';
  let presetMin = 10;
  let timerTargetMs = 10 * 60_000;
  let timerStartedAt: number | null = null;
  let timerAccumMs = 0;
  let timerRunning = false;
  let timerCue = false;
  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let detailMode = false;
  let previewUrl: string | null = null;
  let encoded: EncodedJpeg | null = null;
  let analyzing = false;
  let feedback: MindmapFeedback | null = null;
  let errorMessage = '';
  let showHistory = false;

  let pasteListening = false;
  const onPaste = (e: ClipboardEvent): void => {
    if (phase !== 'session') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) void setImage(file);
        e.preventDefault();
        break;
      }
    }
  };
  const syncPasteListener = (): void => {
    if (phase === 'session' && !pasteListening) {
      document.addEventListener('paste', onPaste);
      pasteListening = true;
    } else if (phase !== 'session' && pasteListening) {
      document.removeEventListener('paste', onPaste);
      pasteListening = false;
    }
  };

  const stopTimer = (): void => {
    if (timerHandle !== null) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    timerRunning = false;
  };

  const elapsedMs = (): number => {
    const live = timerRunning && timerStartedAt !== null ? runtime.clock.now() - timerStartedAt : 0;
    return timerAccumMs + live;
  };

  const tickTimer = (): void => {
    const el = elapsedMs();
    if (!timerCue && el >= timerTargetMs && timerTargetMs > 0) {
      timerCue = true;
      render();
      globalThis.setTimeout(() => {
        timerCue = false;
        render();
      }, 2000);
    }
    render();
  };

  const startTimer = (): void => {
    if (timerRunning) return;
    timerStartedAt = runtime.clock.now();
    timerRunning = true;
    timerHandle = globalThis.setInterval(tickTimer, 500);
    render();
  };

  const pauseTimer = (): void => {
    if (!timerRunning) return;
    timerAccumMs += runtime.clock.now() - (timerStartedAt ?? runtime.clock.now());
    timerStartedAt = null;
    stopTimer();
    render();
  };

  const resetTimer = (): void => {
    stopTimer();
    timerAccumMs = 0;
    timerStartedAt = null;
    timerCue = false;
    render();
  };

  const setImage = async (file: File): Promise<void> => {
    errorMessage = '';
    encoded = await encodeImageFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    render();
  };

  const pickDrill = (drill: MindmapDrill): void => {
    selected = drill;
    mode = drill.mode;
    presetMin = presetMinutes(drill);
    timerTargetMs = presetMin * 60_000;
    phase = 'session';
    feedback = null;
    encoded = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    resetTimer();
    render();
  };

  const saveHistory = async (fb: MindmapFeedback): Promise<void> => {
    if (!selected) return;
    const thumbId = newId(() => Math.random());
    const id = newId(() => Math.random());
    if (encoded) {
      const thumb = await encodeThumbnail(encoded.dataUrl);
      await saveThumbnailBlob(runtime.hub, thumbId, thumb.dataUrl);
    }
    const record: MindmapHistoryRecord = {
      id,
      drillId: selected.id,
      drillTitle: selected.title,
      mode,
      sourceText: selected.cardText,
      scores: { ...fb.scores },
      strengths: [...fb.strengths],
      issues: fb.issues.map((i) => ({ type: i.type, detail: i.detail })),
      missing: [...fb.missing],
      nextDrill: fb.nextDrill,
      at: runtime.clock.now(),
      activeMs: elapsedMs(),
      thumbnailId: encoded ? thumbId : null,
    };
    runtime.store.update((mem) => ({
      ...mem,
      updatedAt: runtime.clock.now(),
      mindmap: [record, ...mem.mindmap],
    }));
    void runtime.store.flush();
  };

  const runAnalyze = async (): Promise<void> => {
    if (!selected || !encoded || analyzing) return;
    const settings = loadSettings(runtime.settingsStorage);
    analyzing = true;
    errorMessage = '';
    render();
    pauseTimer();
    const images: EncodedJpeg[] = [];
    images.push(encoded);
    if (detailMode) {
      const tiles = await extractDetailTiles(encoded);
      images.push(...tiles);
    }
    const result = await analyzeMindmapPhoto(runtime.agentClient, settings, selected, mode, images);
    analyzing = false;
    if (!result.ok) {
      errorMessage = result.error;
      render();
      return;
    }
    feedback = result.value;
    phase = 'feedback';
    await saveHistory(result.value);
    render();
  };

  const renderDrillList = (container: HTMLElement): void => {
    const drills = allMindmapDrills();
    const list = h('ul', { class: 'mindmap-drill-list', 'data-testid': 'mindmap-drill-list' });
    for (const drill of drills) {
      const btn = h(
        'button',
        {
          type: 'button',
          class: 'mindmap-drill-item',
        },
        [
          h('span', { class: 'mindmap-drill-item__title' }, [drill.title]),
          h('span', { class: 'mindmap-drill-item__meta' }, [
            drill.minutes ? `${drill.minutes} min` : '—',
            drill.source === 'course' ? ' · course' : '',
          ]),
        ],
      );
      btn.addEventListener('click', () => pickDrill(drill));
      list.append(h('li', {}, [btn]));
    }
    container.append(
      h('div', { class: 'screen-heading' }, [
        h('h1', {}, ['Mindmap trainer']),
        h('p', { class: 'text-muted' }, [
          'Pick a drill, draw by hand, then upload a photo for feedback.',
        ]),
      ]),
      list,
    );
  };

  const renderModeToggle = (): HTMLElement => {
    const wrap = h('div', { class: 'segmented' });
    for (const value of ['topic', 'text'] as const) {
      const btn = h(
        'button',
        {
          type: 'button',
          class: `segmented__btn${mode === value ? ' is-active' : ''}`,
          'aria-pressed': mode === value ? 'true' : 'false',
        },
        [value === 'topic' ? 'Map this topic' : 'Map this text'],
      );
      btn.addEventListener('click', () => {
        mode = value;
        render();
      });
      wrap.append(btn);
    }
    return wrap;
  };

  const renderTimerPresets = (): HTMLElement => {
    const row = h('div', { class: 'timer-presets' });
    for (const min of [5, 10, 15]) {
      const btn = h(
        'button',
        {
          type: 'button',
          class: `timer-presets__btn${presetMin === min ? ' is-active' : ''}`,
        },
        [`${min} min`],
      );
      btn.addEventListener('click', () => {
        presetMin = min;
        timerTargetMs = min * 60_000;
        render();
      });
      row.append(btn);
    }
    return row;
  };

  const renderCapture = (container: HTMLElement): void => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'visually-hidden';
    fileInput.id = 'mindmap-file';

    const drop = h('div', {
      class: 'mindmap-drop',
      tabindex: '0',
    });
    if (previewUrl) {
      drop.append(
        h('img', {
          src: previewUrl,
          alt: 'Mind map preview',
          class: 'mindmap-preview',
        }),
      );
    } else {
      drop.append(h('p', {}, ['Drop a photo here, paste from clipboard, or choose a file.']));
    }

    const onFiles = (files: FileList | null): void => {
      const file = files?.[0];
      if (file)
        void setImage(file).catch(() => {
          errorMessage = 'This image could not be loaded.';
          render();
        });
    };

    fileInput.addEventListener('change', () => onFiles(fileInput.files));
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('mindmap-drop--hover');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('mindmap-drop--hover'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('mindmap-drop--hover');
      onFiles(e.dataTransfer?.files ?? null);
    });
    drop.addEventListener('click', () => fileInput.click());
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    const detailInput = document.createElement('input');
    detailInput.type = 'checkbox';
    const detailToggle = h('label', { class: 'checkbox-row' }, [
      detailInput,
      h('span', {}, ['Detail mode (2×2 tiles + overview)']),
    ]);
    if (detailInput) {
      detailInput.checked = detailMode;
      detailInput.addEventListener('change', () => {
        detailMode = detailInput.checked;
      });
    }

    const settings = loadSettings(runtime.settingsStorage);
    const canAnalyze = visionAgentReady(settings) && encoded !== null && !analyzing;

    const actions = h('div', { class: 'mindmap-actions' });
    const analyzeBtn = h(
      'button',
      {
        type: 'button',
        class: 'button button--primary',
        'data-testid': 'mindmap-analyze',
        disabled: canAnalyze ? undefined : '',
      },
      [analyzing ? 'Analyzing…' : 'Get feedback'],
    );
    analyzeBtn.addEventListener('click', () => void runAnalyze());

    const grokBtn = h('button', { type: 'button', class: 'button button--agent' }, [
      GROK_FALLBACK_LABEL,
    ]);
    grokBtn.addEventListener('click', () => {
      if (!selected) return;
      const prompt = grokFallbackPrompt(settings, selected, mode);
      void copyPromptAndOpenGrok(prompt, {
        copyText: (text) => navigator.clipboard.writeText(text),
        openUrl: (url) => window.open(url, '_blank', 'noopener'),
        showToast: runtime.showToast,
        grokBotUrl: settings.grokBotUrl,
      });
    });

    actions.append(analyzeBtn, grokBtn);

    if (!visionAgentReady(settings)) {
      actions.append(
        h('p', { class: 'text-muted mindmap-offline-hint' }, [
          'No API key: use Copy prompt + open Grok Bot and attach your photo there.',
        ]),
      );
    }

    container.append(
      h('div', { class: 'screen-heading' }, [
        h('h1', {}, [selected?.title ?? 'Drill']),
        renderModeToggle(),
      ]),
      h('article', { class: 'task-card mindmap-drill-card' }, [
        h('div', { class: 'rich-text' }, [selected?.cardText ?? '']),
      ]),
      renderTimerPresets(),
      timerDisplayEl(elapsedMs(), timerTargetMs, timerRunning, timerCue),
      h('div', { class: 'timer-controls' }, [
        h('button', { type: 'button', class: 'button' }, [timerRunning ? 'Pause' : 'Start']),
        h('button', { type: 'button', class: 'button button--ghost' }, ['Reset']),
        h('button', { type: 'button', class: 'button button--ghost' }, ['Change drill']),
      ]),
      fileInput,
      drop,
      detailToggle,
      actions,
    );

    const [startBtn, resetBtn, backBtn] = container.querySelectorAll('.timer-controls .button');
    startBtn?.addEventListener('click', () => (timerRunning ? pauseTimer() : startTimer()));
    resetBtn?.addEventListener('click', () => resetTimer());
    backBtn?.addEventListener('click', () => {
      phase = 'pick';
      selected = null;
      stopTimer();
      render();
    });

    if (errorMessage) {
      container.append(h('p', { class: 'form-message form-message--warning' }, [errorMessage]));
    }
  };

  const renderFeedback = (container: HTMLElement): void => {
    if (!feedback || !selected) return;
    container.append(
      h('div', { class: 'screen-heading' }, [
        h('h1', {}, ['Feedback']),
        h('p', { class: 'text-muted' }, [`Time on drill: ${formatTimerMs(elapsedMs())}`]),
      ]),
      renderFeedbackPanel(feedback),
      h('div', { class: 'mindmap-actions' }, [
        h('button', { type: 'button', class: 'button button--primary' }, ['Redo this drill']),
        h('button', { type: 'button', class: 'button button--ghost' }, ['Pick another drill']),
        h('button', { type: 'button', class: 'button button--ghost' }, ['History']),
      ]),
    );
    const [redo, another, hist] = container.querySelectorAll('.mindmap-actions .button');
    redo?.addEventListener('click', () => {
      phase = 'session';
      feedback = null;
      encoded = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      resetTimer();
      render();
    });
    another?.addEventListener('click', () => {
      phase = 'pick';
      selected = null;
      feedback = null;
      render();
    });
    hist?.addEventListener('click', () => {
      showHistory = true;
      phase = 'pick';
      selected = null;
      feedback = null;
      render();
    });

    const next = feedback.nextDrill.trim();
    if (next.length > 0) {
      const nextBtn = h('button', { type: 'button', class: 'button button--agent' }, [
        `Next drill: ${next.slice(0, 80)}${next.length > 80 ? '…' : ''}`,
      ]);
      nextBtn.addEventListener('click', () => {
        runtime.showToast('Use this as your next practice focus.');
      });
      container.querySelector('.mindmap-actions')?.append(nextBtn);
    }
  };

  const renderHistory = (container: HTMLElement): void => {
    const records = runtime.store.get().mindmap;
    if (records.length === 0) {
      container.append(h('p', { class: 'text-muted' }, ['No scored drills yet.']));
      return;
    }
    const sorted = [...records].sort((a, b) => b.at - a.at);
    const sparkSection = h('div', { class: 'mindmap-sparklines' });
    for (const criterion of SCORE_CRITERIA) {
      const series = historySeries(sorted, criterion);
      const path = sparklinePath(series.slice(0, 12).reverse(), 120, 32);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'mindmap-sparkline');
      svg.setAttribute('viewBox', '0 0 120 32');
      svg.setAttribute('role', 'img');
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('class', 'mindmap-sparkline__path');
      svg.append(pathEl);
      sparkSection.append(
        h('div', { class: 'mindmap-sparkline-row' }, [
          h('span', { class: 'mindmap-sparkline-label' }, [CRITERION_LABELS[criterion]]),
          svg,
        ]),
      );
    }
    container.append(
      h('h2', { class: 'mindmap-history-title' }, ['Score history']),
      sparkSection,
      h('ul', { class: 'mindmap-history-list' }),
    );
    const list = container.querySelector('.mindmap-history-list');
    if (!list) return;
    for (const row of sorted.slice(0, 20)) {
      const item = h('li', { class: 'mindmap-history-item' });
      const thumb = h('div', { class: 'mindmap-history-thumb' });
      if (row.thumbnailId) {
        void loadThumbnailBlob(runtime.hub, row.thumbnailId).then((url) => {
          if (url) thumb.append(h('img', { src: url, alt: '' }));
        });
      }
      const redo = h('button', { type: 'button', class: 'text-button' }, ['Redo this drill']);
      redo.addEventListener('click', () => {
        const drill = drillById(row.drillId) ?? selected;
        if (drill) pickDrill(drill);
      });
      item.append(
        thumb,
        h('div', { class: 'mindmap-history-body' }, [
          h('strong', {}, [row.drillTitle]),
          h('span', { class: 'text-muted' }, [
            new Date(row.at).toLocaleDateString(),
            ` · overall ${row.scores.overall}/10`,
          ]),
          redo,
        ]),
      );
      list.append(item);
    }
  };

  const render = (): void => {
    clear(root);
    if (phase === 'pick') {
      renderDrillList(root);
      const histToggle = h(
        'button',
        { type: 'button', class: 'text-button mindmap-history-toggle' },
        [showHistory ? 'Hide history' : 'Show score history'],
      );
      histToggle.addEventListener('click', () => {
        showHistory = !showHistory;
        render();
      });
      root.append(histToggle);
      if (showHistory) renderHistory(root);
      return;
    }
    if (phase === 'session') renderCapture(root);
    else if (phase === 'feedback') renderFeedback(root);
    syncPasteListener();
  };

  render();
  root.addEventListener('DOMNodeRemovedFromDocument', () => {
    if (pasteListening) document.removeEventListener('paste', onPaste);
  });
  return root;
}

function renderFeedbackPanel(fb: MindmapFeedback): HTMLElement {
  const panel = h('article', {
    class: 'agent-panel mindmap-feedback',
    'data-testid': 'mindmap-feedback',
  });

  const read = h('section', { class: 'agent-panel__section' }, [
    h('h2', {}, ['What I read']),
    h('p', {}, [fb.read.core]),
  ]);
  if (fb.read.clusters.length > 0) {
    const ul = h('ul', {});
    for (const c of fb.read.clusters) {
      ul.append(h('li', {}, [`${c.name}: ${c.nodes.join(', ')}`]));
    }
    read.append(h('h3', {}, ['Clusters']), ul);
  }
  if (fb.read.relations.length > 0) {
    const ul = h('ul', {});
    for (const r of fb.read.relations) {
      const label = r.label ? ` (${r.label})` : '';
      ul.append(h('li', {}, [`${r.from} → ${r.to}${label}`]));
    }
    read.append(h('h3', {}, ['Relations']), ul);
  }
  panel.append(read);

  if (fb.read.unreadable.length > 0) {
    panel.append(
      h('section', { class: 'agent-panel__section' }, [
        h('h2', {}, ["I couldn't read this part"]),
        h(
          'ul',
          {},
          fb.read.unreadable.map((u) => h('li', {}, [u])),
        ),
      ]),
    );
  }

  const scores = h('section', { class: 'agent-panel__section mindmap-scores' }, [
    h('h2', {}, ['Scores']),
    h('dl', { class: 'mindmap-score-grid' }),
  ]);
  const dl = scores.querySelector('dl');
  for (const [key, val] of Object.entries(fb.scores)) {
    dl?.append(h('dt', {}, [key]), h('dd', {}, [`${val}/10`]));
  }
  panel.append(scores);

  if (fb.strengths.length > 0) {
    panel.append(
      h('section', { class: 'agent-panel__section' }, [
        h('h2', {}, ['Strengths']),
        h(
          'ul',
          {},
          fb.strengths.map((s) => h('li', {}, [s])),
        ),
      ]),
    );
  }
  if (fb.issues.length > 0) {
    panel.append(
      h('section', { class: 'agent-panel__section' }, [
        h('h2', {}, ['Issues']),
        h(
          'ul',
          {},
          fb.issues.map((i) => h('li', {}, [`[${i.type}] ${i.detail}`])),
        ),
      ]),
    );
  }
  if (fb.missing.length > 0) {
    panel.append(
      h('section', { class: 'agent-panel__section' }, [
        h('h2', {}, ['Missing']),
        h(
          'ul',
          {},
          fb.missing.map((m) => h('li', {}, [m])),
        ),
      ]),
    );
  }
  return panel;
}
