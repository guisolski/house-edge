/**
 * Playtest #39: hold only ArrowRight/D from the west end of Avenida at several
 * y values — x must increase past world px 750 (tile ~15.6).
 */
import { test, expect } from '@playwright/test';

test('Avenida hold-east on y10–13 clears past world x=750', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const report = await page.evaluate(async () => {
    type He = {
      session: {
        world: { unlock: (id: string) => boolean };
        player: {
          setDistrict: (id: string) => void;
          setPosition: (x: number, y: number) => void;
          getStats: () => { x: number; y: number };
        };
        move: (dx: number, dy: number) => boolean;
        setRunHeld: (held: boolean) => void;
      };
    };
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    he.session.world.unlock('feira-central');
    he.session.world.unlock('avenida-odds');
    he.session.player.setDistrict('avenida-odds');
    const TILE_PX = 48;
    const rows: { y: number; x: number; px: number; ok: boolean }[] = [];
    for (const y of [10, 11, 12, 13]) {
      he.session.player.setPosition(3, y);
      he.session.setRunHeld(true);
      for (let i = 0; i < 80; i += 1) {
        const before = he.session.player.getStats();
        he.session.move(1, 0);
        const after = he.session.player.getStats();
        if (after.x === before.x && after.y === before.y) break;
        if (after.x * TILE_PX > 750) break;
      }
      he.session.setRunHeld(false);
      const s = he.session.player.getStats();
      rows.push({
        y,
        x: s.x,
        px: s.x * TILE_PX,
        ok: s.x * TILE_PX > 750,
      });
    }
    return rows;
  });

  for (const row of report) {
    expect(row.ok, `y=${row.y} ended at x=${row.x} px=${row.px}`).toBe(true);
  }
});
