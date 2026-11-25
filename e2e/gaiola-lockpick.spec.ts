/**
 * Playtest #33: solve Gaiola using only on-screen feedback within 4 attempts.
 * Never reads internal pin targets — only .skill-lockpick-feedback text.
 */
import { test, expect } from '@playwright/test';

async function openGaiola(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
            pickDialogueChoice: (a?: string, b?: string) => void;
            acceptStoryBet: () => boolean;
            player: { addCredits: (n: number) => void };
          };
          hud: { syncScreen: () => void; showDialogue: (lines: unknown) => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(400);
    for (const id of ['feira-central', 'avenida-odds'] as const) {
      he.session.world.unlock(id);
    }
    he.session.travelTo('avenida-odds');
    he.session.story.setFlag('unlocked_avenida', true);
    he.session.story.setFlag('radar_ok', true);
    he.session.runStoryBeat('avenida-server');
    he.hud.syncScreen();
  });
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(450);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 3_000 });
  await page.locator('.btn-take-bet').click();
  await expect(page.locator('.lockpick-pin').first()).toBeVisible({ timeout: 8_000 });
}

function parseVerdicts(text: string, count: number): ('ok' | 'low' | 'high' | null)[] {
  const out: ('ok' | 'low' | 'high' | null)[] = Array.from({ length: count }, () => null);
  for (let i = 0; i < count; i += 1) {
    const re = new RegExp(`(?:Pin|Pino)\\s*${i + 1}\\s*:\\s*([^·]+)`, 'i');
    const m = text.match(re);
    if (!m) continue;
    const v = m[1]!.toLowerCase();
    if (/certo|set|click|\bok\b/.test(v)) out[i] = 'ok';
    else if (/baixo|low/.test(v)) out[i] = 'low';
    else if (/alto|high/.test(v)) out[i] = 'high';
  }
  return out;
}

test('Gaiola solvable from on-screen feedback within 4 attempts', async ({ page }) => {
  await openGaiola(page);
  const pins = page.locator('.lockpick-pin');
  const count = await pins.count();
  expect(count).toBeGreaterThanOrEqual(3);
  const submit = page.getByRole('button', { name: /Submit lock|Enviar fechadura/i });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await submit.click();
    await page.waitForTimeout(400);
    if ((await pins.count()) === 0) {
      expect(attempt).toBeLessThan(4);
      return;
    }
    const feedback = await page.locator('.skill-lockpick-feedback').innerText();
    expect(feedback).toMatch(/Pino|Pin/i);
    const verdicts = parseVerdicts(feedback, count);
    for (let i = 0; i < count; i += 1) {
      const v = verdicts[i];
      if (v === 'ok' || v === null) continue;
      await pins.nth(i).click();
      await page.waitForTimeout(40);
    }
  }
  await submit.click();
  await expect(pins).toHaveCount(0, { timeout: 5_000 });
});
