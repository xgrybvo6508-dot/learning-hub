import { expect, test } from '@playwright/test';

const MODULE_LABELS = [
  'Mindmap trainer',
  'Courses',
  'Mistakes',
  'Anki',
  'Feynman',
  'Interleave',
  'Voice',
];

test('home shows seven module tiles and settings saves presets', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/\/learning-hub\/#\/$/);
  await expect(page.getByRole('link', { name: 'Learning Hub' })).toBeVisible();
  for (const label of MODULE_LABELS) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.locator('#provider-preset').selectOption('openrouter');
  await page.locator('#text-model').fill('custom-text-model');
  await page.locator('#text-model').dispatchEvent('change');
  await page.locator('#vision-model').fill('custom-vision-model');
  await page.locator('#vision-model').dispatchEvent('change');
  await page.reload();
  await expect(page.locator('#provider-preset')).toHaveValue('openrouter');
  await expect(page.locator('#text-model')).toHaveValue('custom-text-model');
  await expect(page.locator('#vision-model')).toHaveValue('custom-vision-model');
});
