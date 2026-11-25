/**
 * Playtest #29 P0: Esc fully closes Neon Snap optional panel and releases WASD.
 */
import { test, expect } from '@playwright/test';

test('Esc on Neon Snap bet panel returns play + WASD moves', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });

  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: {
              addCredits: (n: number) => void;
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
            };
            world: { unlock: (id: string) => boolean };
            offerBet: (id: string) => boolean;
            ui: { get: () => string };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(200);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.setPosition(16, 12);
    s.offerBet('side-avenida-neon');
  });

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as {
            __HOUSE_EDGE__: { session: { ui: { get: () => string } } };
          }
        ).__HOUSE_EDGE__.session.ui.get(),
      ),
    )
    .toBe('bet');

  await page.keyboard.press('Escape');

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as {
            __HOUSE_EDGE__: { session: { ui: { get: () => string } } };
          }
        ).__HOUSE_EDGE__.session.ui.get(),
      ),
    )
    .toBe('play');

  const moved = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: {
              setPosition: (x: number, y: number) => void;
              getStats: () => { x: number; y: number };
            };
            move: (dx: number, dy: number) => boolean;
            ui: { get: () => string };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.setPosition(16, 12);
    const before = s.player.getStats();
    const ok = s.move(1, 0);
    const after = s.player.getStats();
    return { ui: s.ui.get(), ok, before, after };
  });

  expect(moved.ui).toBe('play');
  expect(moved.ok).toBe(true);
  expect(moved.after.x).toBe(moved.before.x + 1);
});

test('Esc on Neon Snap dialogue (Sair path) releases input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });

  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: {
              addCredits: (n: number) => void;
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
            };
            world: { unlock: (id: string) => boolean };
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
            hasPendingStoryBet: () => boolean;
            ui: { get: () => string };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(200);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.story.setFlag('influencer_ok', true);
    s.runStoryBeat('avenida-drone');
  });

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as {
            __HOUSE_EDGE__: { session: { ui: { get: () => string } } };
          }
        ).__HOUSE_EDGE__.session.ui.get(),
      ),
    )
    .toBe('dialogue');

  await page.keyboard.press('Escape');

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const s = (
          window as unknown as {
            __HOUSE_EDGE__: {
              session: {
                ui: { get: () => string };
                hasPendingStoryBet: () => boolean;
                move: (dx: number, dy: number) => boolean;
                player: {
                  setPosition: (x: number, y: number) => void;
                  getStats: () => { x: number };
                };
              };
            };
          }
        ).__HOUSE_EDGE__.session;
        s.player.setPosition(16, 12);
        const before = s.player.getStats().x;
        const ok = s.move(1, 0);
        return {
          ui: s.ui.get(),
          pending: s.hasPendingStoryBet(),
          ok,
          x: s.player.getStats().x,
          before,
        };
      }),
    )
    .toMatchObject({ ui: 'play', pending: false, ok: true });
});
