---
name: Read handwritten mind maps
description: >-
  Use when the user sends a handwritten mind map (Goodnotes export, notebook
  scan, whiteboard photo) and wants it read as structure, tasks, a prompt, or
  expanded into a detailed explanation or brief for another AI.
---
# Read handwritten mind maps

Mind maps here are the author's **private, compressed thinking**: half-words, implicit links, many centers, everything connected. The job is not just to read the ink but to recover the meaning, quickly and without inventing anything.

## 0. Input
- Best input: a full-resolution **image export** (e.g. Goodnotes → Share → Export → Image). Screenshots lose small text, and PDFs aren't needed.
- **Self-zoom:** if text is small on the overview and you have a shell, tile the image yourself instead of asking the user: a 3×3 grid with ~10–15% overlap; grayscale, invert a dark canvas, autocontrast; read every tile, then merge. Ask for a close-up only if a block is still unreadable.
- Several images in one message → one reply, labeled `A / B / C`.

## 1. Detect the context (silently)
- **Learning:** subject terms, formulas, graphs, geometry, «понять», «тема 1/2», interleaving, «почему?». Arrows mean logic or derivation.
- **Work / life planning:** projects, agents, money, `[ ]`, times, «сделать», «как», problems. Arrows mean sequence, dependency, or next step.
- **Mixed:** split the answer into **Учёба** and **Работа** blocks. If unclear, add one line `контекст: ?`.

## 2. Modes

### Fast read (default)
Reply in the user's language with this shape:
- **Суть:** one sentence.
- **Кластеры:** nested bullets with clear nodes only.
- **Задачи:** `[ ]` items, if any.
- **?:** open questions on the map, plus unclear words or edges (1–5 lines).
- **Дальше:** up to 3 actions, only if the map is a work prompt. Do them after a yes.

### Expand (when asked to «распиши подробно», explain a process, or brief another AI)
1. Do the fast read internally, then interpret: what each cluster means, why it links to the others, and what the author is solving.
2. Write full prose: general meaning → each cluster (on the map / как понимаю) → links between clusters → problems or insights → process step by step.
3. Always separate what is **written on the map** from your **interpretation** («понимаю так»).
4. End with 1–3 check questions on the riskiest interpretations.
5. For another AI: a self-contained brief (goal, context, steps, constraints) with no map shorthand.

## 3. Legend (default; the user's corrections win)

| Mark | Meaning |
|---|---|
| `→` thin arrow | leads to / next |
| `⇒` or a double-stroke arrow | strong result / outcome |
| `↔` | mutual link, or interleaving |
| plain or wavy line | loose association |
| `{ }` `[ ]` brackets around lines | one group or concept |
| oval / circled word | core concept; a circled word near the center is often the main goal |
| rectangle / box | goal, unit, or named chunk |
| `[ ]` checkbox | task (empty = open) |
| underline / double underline | emphasis; double = key or final |
| crossed out | dropped, or replaced by the word beside it |
| `?` / `??` | open question |
| `=` | definition or outcome |
| `+ ИИ` | AI in the loop |
| times like `14:00–15:30` | a schedule block |
| `√…` around a word | evaluate or estimate |

Layout habits: there are often several centers; margin text is meta (mood, schedule, constraints). Keep mixed RU/EN labels as written, and treat Goodnotes tab names as labels only.

## 4. Drawings and math
- Ordinary drawings (a person, an object): name them in one word.
- **Function graph:** `график: y = e^x`, plus its shape (growth, asymptotes) if visible.
- **Calculations:** LaTeX, step by step as drawn. A blank `___` is the unknown; don't fill it unless asked.
- **Geometry:** figures, plus labeled points, sides, and angles.
- **Discrete math:** graph → vertices and edges; Euler circles → sets and operations; tree → nested list; table → Markdown table.
- A label beside a drawing (`geometry`, `ф-ла`, `picture`, `вычисления`) gives its type; trust the label over your guess.
- A hard task drawn on the map: restate the task in 1–2 lines, wait for an OK, then solve.

## 5. Accuracy rules
- Never put an unread word or a guessed arrow into the outline; it goes under `?`.
- Don't complete the map from world knowledge; use only what is on the page, plus clearly marked interpretation.
- Relations are harder than words; prefer listing an uncertain edge over drawing a wrong tree.
- Don't narrate the reading process.

## 6. Learning from corrections
When the user fixes a symbol or a meaning (for example «утюжок = отпариватель»), adopt it at once, mention it once, and add it to the **Личный словарь** below so other models get it too.

## Личный словарь
(empty; add the user's terms here)

## Ritual: map as prompt
The user sends a map → fast read (or expand) → the user corrects in one line → only then organize or execute.
