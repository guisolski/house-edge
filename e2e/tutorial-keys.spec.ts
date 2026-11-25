/**
 * Playtest #27: tutorial advances by Next / action; hides under dialogue.
 * Title language row is a real menu (arrows + Enter), not a New Game trap.
 */
import { test, expect } from '@playwright/test';

async function forceTutorial(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const he = (window as unknown as { __HOUSE_EDGE__: { forceTutorial: () => void } })
      .__HOUSE_EDGE__;
    he.forceTutorial();
  });
  await expect(page.locator('.tutorial-panel')).toBeVisible();
}

test('tutorial advances with Next and hides under Nair dialogue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await forceTutorial(page);
  await expect(page.locator('.tutorial-panel h2')).toContainText(/1\s*\/\s*5/);
  await page.getByRole('button', { name: /Next|Próximo/i }).click();
  await expect(page.locator('.tutorial-panel h2')).toContainText(/2\s*\/\s*5/);
  await page.getByRole('button', { name: /Next|Próximo/i }).click();
  await expect(page.locator('.tutorial-panel h2')).toContainText(/3\s*\/\s*5/);
  // Tutorial corner card can sit over the canvas — force click for focus.
  await page.locator('canvas.world-canvas').click({
    position: { x: 80, y: 200 },
    force: true,
  });
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.tutorial-panel')).toBeHidden();
});

test('title language: arrows + Enter pick Português without starting New Game', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.title-screen')).toBeVisible();
  await page.getByRole('button', { name: 'English' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Português (Brasil)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-screen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo jogo' })).toBeVisible({
    timeout: 3000,
  });
  // play-hud exists in DOM but must stay hidden on the title screen.
  await expect(page.locator('.play-hud')).toBeHidden();
});
