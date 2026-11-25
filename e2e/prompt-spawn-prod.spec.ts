import { test, expect } from '@playwright/test';

test('prod: spawn E-prompt names Dona Nair', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.waitForTimeout(200);
  const prompt = page.locator('.interact-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText(/Dona Nair/i);
});
