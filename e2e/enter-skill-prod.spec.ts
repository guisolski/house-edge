/**
 * Playtest #27 P1: after Nair needle, Enter spam must not reopen + bet;
 * first E at Luna must work (not eaten by stale rematch arm).
 */
import { test, expect } from '@playwright/test';

test('prod: Enter×4 after Nair needle does not reopen bet; Luna E works', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.btn-take-bet')).toBeVisible();
  await page.locator('.btn-take-bet').click();
  await expect(page.locator('.btn-needle-stop')).toBeVisible({ timeout: 3000 });
  // Freeze needle in the green zone, then Stop with the mouse (Interact not held).
  await page.evaluate(() => {
    const meter = document.querySelector('.skill-meter') as HTMLElement | null;
    const tick = meter?.dataset.needleTick;
    if (tick) window.clearInterval(Number(tick));
    const needle = document.querySelector('.skill-needle') as HTMLElement | null;
    if (needle) needle.style.left = '55%';
  });
  await page.locator('.btn-needle-stop').click();
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
  await expect(page.locator('.skill-body')).toHaveCount(0);

  // Unlock Luna + stand on her tile — first E must open (not eaten by rematch arm).
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { setPosition: (x: number, y: number) => void };
            story: { setFlag: (k: string, v: boolean) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('antena_ok', true);
    he.session.player.setPosition(22, 16);
  });
  await page.waitForTimeout(750);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
});
