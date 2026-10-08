import { expect, test } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/mindmap-sample.png');

const mockFeedback = {
  read: {
    core: 'A small test map.',
    clusters: [{ name: 'Center', nodes: ['idea'] }],
    relations: [{ from: 'idea', to: 'next', label: 'leads to' }],
    unreadable: [],
  },
  scores: {
    structure: 7,
    chunking: 6,
    relations: 7,
    coverage: 5,
    overall: 6,
  },
  strengths: ['Clear center'],
  issues: [{ type: 'gap', detail: 'Missing second cluster' }],
  missing: ['Contrast link'],
  nextDrill: 'Add a cross-cluster relation',
};

test('mindmap trainer shows feedback and saves history with mocked vision API', async ({
  page,
}) => {
  await page.route('**/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { role: 'assistant', content: JSON.stringify(mockFeedback) } }],
      }),
    });
  });

  await page.goto('./');
  await page.evaluate(() => {
    const settings = {
      version: 1,
      preset: 'custom',
      baseUrl: 'https://example.com/v1',
      textModel: 'test-text',
      visionModel: 'test-vision',
      apiKey: 'sk-test-key-for-e2e-only',
      feedbackLanguage: 'en',
      grokBotUrl: '',
      glossary: [],
    };
    localStorage.setItem('lh:settings', JSON.stringify(settings));
  });

  await page.getByRole('link', { name: 'Mindmap trainer' }).click();
  await expect(page).toHaveURL(/#\/mindmap$/);
  await page.getByTestId('mindmap-drill-list').locator('button').first().click();

  const fileInput = page.locator('#mindmap-file');
  await fileInput.setInputFiles(fixturePath);

  await page.getByTestId('mindmap-analyze').click();
  await expect(page.getByTestId('mindmap-feedback')).toBeVisible();
  await expect(page.getByText('What I read')).toBeVisible();
  await expect(page.getByText('A small test map.')).toBeVisible();

  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('Score history')).toBeVisible();
  await expect(page.getByText(/overall 6\/10/)).toBeVisible();
});
