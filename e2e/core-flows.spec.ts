import { test, expect } from '@playwright/test';

test.describe('House Edge core flows', () => {
  test('boots title screen and starts a new game', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'HOUSE EDGE' })).toBeVisible();
    await expect(page.locator('.version')).toContainText('v1.7');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('.play-hud')).toBeVisible();
    await expect(page.locator('.stats')).toContainText('Credits');
    await expect(page.locator('.objective')).toContainText('Dona Nair');
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

  test('opens side jobs from menu and offers a bet', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Side Jobs' }).click();
    await expect(page.locator('.jobs-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Boteco water rotation' }).click();
    await expect(page.locator('.bet-panel')).toBeVisible();
    await expect(page.locator('.bet-panel')).toContainText('Stake');
  });

  test('touch mode shows virtual stick and actions', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.evaluate(() => {
      (
        window as unknown as {
          __HOUSE_EDGE__: { forceMode: (m: string) => void };
        }
      ).__HOUSE_EDGE__.forceMode('touch');
    });
    await expect(page.locator('.touch-controls')).toBeVisible();
    await expect(page.locator('.stick-zone')).toBeVisible();
    await expect(page.locator('.touch-btn').first()).toBeVisible();
  });
});
