---
title: "Courses — индекс"
type: index
tags: [type/index, course/discrete-math, course/learning-science]
created: 2026-10-08
---

# Курсы Влада — индекс

Формат «**я + ИИ**»: решаю и строю структуру сам, ИИ — спарринг (вопросы, проверка, вариации задач, чтение карт). Трудные задачи, короткие блоки, нелинейная структура.

## Как начать (10 минут)
1. Скопируй папку `courses/` в хранилище Obsidian (или открой её как vault). Mermaid-карты рендерятся в Obsidian без плагинов (если `mindmap` не отображается — обнови Obsidian).
2. Импортируй в Anki (ПК или AnkiDroid на Pixel): `discrete-math/anki/discrete-math.apkg` и `learning-science/anki/learning-science.apkg`. Тип записи *Vlad Deep Connection (MathJax)* — формулы в `\( \)` рендерятся сами. CSV-копии лежат рядом (заголовок для импорта в Anki уже есть).
3. Открой [[interleaving-plan]] → День 1.

## Структура
- **Дискретная математика** — [[discrete-math/00-overview|обзор]]
  - [[01-logic-proofs]] · [[02-induction-invariants]] · [[03-combinatorics]] · [[04-recurrences-gf]] · [[05-graphs]]
- **Learning Science** — [[learning-science/00-overview|обзор]]
  - [[01-encoding-retrieval]] · [[02-chunking-cognitive-load]] · [[03-mindmapping-grinde]] · [[04-spacing-interleaving]] · [[05-higher-order-metacognition]] · [[06-adhd-friendly-practice]]
- [[mindmapping-drills]] — 12 дриллов по методу Justin Sung (GRINDE) + протокол фидбека ИИ
- [[interleaving-plan]] — 2 недели, 9–22 октября 2026, оба курса вперемешку
- [[next-courses]] — нейропсихология и коммуникация с ИИ, английский (списки модулей)

## Как устроен каждый модуль
1. **Ключевые идеи как связи** — не словарь определений, а «что из чего следует / чем отличается».
2. **Майндмэп-дрилл** — тема, ограничения (слова, чанки, подписанные связи), рубрика, отправка фото Grok Bot.
3. **5–8 hard-задач** — решения свёрнуты в `> [!note]- Решение`.
4. **Фейнман-проверка** — промпт для ИИ-«студента», что должно быть в объяснении, типичные пробелы.
5. **Anki** — вопросы модуля + свёрнутые ответы (то же, что в колоде).

## Связь с другими системами
- Карты читаются навыком *Read handwritten mind maps* (легенда символов та же) — отправляй **экспорт изображения**, не скриншот.
- Инсайты → Obsidian (`#insight/learning`, `#insight/dm`).
- Пересборка колод после правки карточек: `_build/cards_*.py` → `../.venv/bin/python _build/build_anki.py` (перезапишет .apkg/.csv и списки карточек в модулях).

## Счётчики
| Курс | Модулей | Задач | Anki-карточек |
|---|---|---|---|
| Discrete Math (Vlad) | 5 | 39 | 46 |
| Learning Science (Vlad) | 6 | 36 | 44 |
