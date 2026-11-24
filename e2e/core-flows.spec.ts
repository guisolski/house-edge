import { test, expect } from '@playwright/test';

test.describe('House Edge core flows', () => {
  test('boots title screen and starts a new game', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'HOUSE EDGE' })).toBeVisible();
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('.play-hud')).toBeVisible();
    await expect(page.locator('.stats')).toContainText('Credits');
  });

  test('moves via keyboard and opens menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(page.locator('.menu-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.locator('.menu-panel')).toBeHidden();
  });

  test('runs a bet interaction from the HUD', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.getByRole('button', { name: 'Side Jobs' }).click();
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
  });

  test('mobile viewport shows touch controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('.touch-controls')).toBeVisible();
  });
});
