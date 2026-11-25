/**
 * Playtest #28 P1: district exit pad zone — off-arrow tiles still show travel
 * prompt and respond to E (not "nobody in range").
 */
import { test, expect } from '@playwright/test';

test('exit pad zone: off-arrow tile shows travel prompt and E travels', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: {
              setPosition: (x: number, y: number) => void;
              setFacing: (dx: number, dy: number) => void;
            };
            move: (dx: number, dy: number) => boolean;
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.world.unlock('feira-central');
    he.session.player.setPosition(37, 22);
    he.session.player.setFacing(1, 0);
    he.session.move(0, 0);
  });
  await page.waitForTimeout(200);
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  const prompt = page.locator('.interact-prompt');
  await expect(prompt).toBeVisible({ timeout: 3000 });
  const text = (await prompt.textContent()) ?? '';
  expect(text).toMatch(/Travel|Viajar|Fair|Feira/i);
  expect(text).not.toMatch(/Ninguém por perto|Nobody in range/i);

  await page.keyboard.press('KeyE');
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __HOUSE_EDGE__: {
                session: { player: { getStats: () => { districtId: string } } };
              };
            }
          ).__HOUSE_EDGE__.session.player.getStats().districtId,
      ),
    )
    .toBe('feira-central');
});
