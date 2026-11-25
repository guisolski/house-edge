import { test, expect } from '@playwright/test';

test('prod: Enter spam after Close does not reopen a dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: { session: { runStoryBeat: (id: string) => boolean } };
      }
    ).__HOUSE_EDGE__.session;
    s.runStoryBeat('boteco-nair');
  });
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.locator('.dialogue-choice').first().click();
  // Bet offer after the choice — Walk away closes without starting a skill.
  await expect(page.getByRole('button', { name: 'Walk away' })).toBeVisible();
  await page.getByRole('button', { name: 'Walk away' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
});
