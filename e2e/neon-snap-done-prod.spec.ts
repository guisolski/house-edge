/** Prod: after Neon Snap clear, talking to Neon Snap never restarts stealth. */
import { test, expect } from '@playwright/test';

test('prod: Neon Snap completed line — no stealth restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 40, y: 40 } });
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: {
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
              addCredits: (n: number) => void;
            };
            story: {
              setFlag: (f: string, v: boolean) => void;
              completeBeat: (id: string) => void;
            };
            npcs: { id: string; x: number; y: number }[];
            interact: (fromInput?: boolean) => boolean;
            isStealthActive: () => boolean;
            getDialogue: () => { text: string }[];
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(200);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.story.setFlag('drone_ok', true);
    s.story.completeBeat('avenida-drone');
    const neon = s.npcs.find((n) => n.id === 'neon-snap')!;
    s.player.setPosition(neon.x, neon.y);
    s.interact(false);
  });
  await expect(page.locator('.dialogue-body')).toBeVisible();
  const text = await page.locator('.dialogue-body').innerText();
  expect(text.toLowerCase()).toMatch(/already|cleared|owed/);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  const stealth = await page.evaluate(() =>
    (
      window as unknown as {
        __HOUSE_EDGE__: { session: { isStealthActive: () => boolean } };
      }
    ).__HOUSE_EDGE__.session.isStealthActive(),
  );
  expect(stealth).toBe(false);
});
