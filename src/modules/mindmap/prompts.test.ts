import { describe, expect, it } from 'vitest';
import { buildMindmapSystemPrompt, GLOSSARY_HEADER, mindmapSkill } from './prompts';

describe('buildMindmapSystemPrompt', () => {
  it('includes legend, drawings/math, and accuracy rules from the skill doc', () => {
    const prompt = buildMindmapSystemPrompt({
      feedbackLanguage: 'Russian',
      glossaryMarkdown: '',
    });
    expect(prompt).toContain('## 3. Legend');
    expect(prompt).toContain('thin arrow');
    expect(prompt).toContain('## 4. Drawings and math');
    expect(prompt).toContain('Discrete math');
    expect(prompt).toContain('## 5. Accuracy rules');
    expect(prompt).toContain("Don't narrate the reading process");
    expect(prompt).toContain(mindmapSkill.trim());
  });

  it('includes critique wrapper with GRINDE and JSON contract', () => {
    const prompt = buildMindmapSystemPrompt({
      feedbackLanguage: 'English',
      glossaryMarkdown: '',
    });
    expect(prompt).toContain('GRINDE');
    expect(prompt).toContain('"nextDrill"');
    expect(prompt).toContain('Do not lecture');
    expect(prompt).toContain('Feedback language for strengths');
    expect(prompt).toContain('English');
  });

  it('appends the personal glossary when provided', () => {
    const glossary = '- `утюжок` = clothes steamer';
    const prompt = buildMindmapSystemPrompt({
      feedbackLanguage: 'Russian',
      glossaryMarkdown: glossary,
    });
    expect(prompt).toContain(GLOSSARY_HEADER);
    expect(prompt).toContain(glossary);
  });

  it('omits glossary section when empty', () => {
    const prompt = buildMindmapSystemPrompt({
      feedbackLanguage: 'Russian',
      glossaryMarkdown: '   ',
    });
    expect(prompt).not.toContain(GLOSSARY_HEADER);
  });
});
