/**
 * Playtest #49 / v1.22.25: Augusto duel win + lose at timescale 0.33 (real key timing).
 * Screenshots land in artifacts/panels-v1.22.25/ (keyboard mode, Português).
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.join('artifacts', 'panels-v1.22.25');
const KEY: Record<string, string> = {
  R: 'KeyR',
  G: 'KeyG',
  B: 'KeyB',
  Y: 'KeyY',
  '↑': 'ArrowUp',
  '→': 'ArrowRight',
  '↓': 'ArrowDown',
  '←': 'ArrowLeft',
};

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

async function forceKeyboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('keyboard');
  });
}

async function shot(page: Page, name: string): Promise<void> {
  await forceKeyboard(page);
  await page.screenshot({ path: path.join(ART, name) });
}

async function bootDuel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('house-edge-locale', 'pt-BR');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/?timescale=0.33');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await forceKeyboard(page);
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            skipTutorialNow: () => void;
            setQaTimescale: (n: number) => void;
            player: { addCredits: (n: number) => void };
            story: { setFlag: (f: string, v: boolean) => void };
            world: { unlock: (id: string) => void };
            travelTo: (id: string) => boolean;
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            forceStorySkill: (id: string) => boolean;
          };
          hud: { syncScreen: () => void; showSkill: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.skipTutorialNow();
    he.session.setQaTimescale(0.33);
    he.session.player.addCredits(2000);
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'antena_ok',
      'feira_ok',
      'avenida_ok',
      'vazamento_ok',
      'vip_ok',
      'negotiate_ok',
      'pit_ok',
      'elevator_ok',
    ]) {
      he.session.story.setFlag(f, true);
    }
    for (const d of ['feira-central', 'avenida-odds', 'torre-casa']) {
      he.session.world.unlock(d);
    }
    he.session.travelTo('torre-casa');
    void (
      he.session.forceStorySkill('duelo-casa') ||
      (he.session.runStoryBeat('torre-final') && he.session.acceptStoryBet())
    );
    he.hud.syncScreen();
    he.hud.showSkill();
  });
  await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible({
    timeout: 10_000,
  });
}

async function stopWhenInZone(page: Page): Promise<boolean> {
  await expect(page.locator('.btn-needle-stop')).toBeEnabled({ timeout: 45_000 });
  return page.evaluate(async () => {
    const deadline = performance.now() + 45_000;
    while (performance.now() < deadline) {
      const zone = document.querySelector('.skill-zone') as HTMLElement | null;
      const needle = document.querySelector('.skill-needle') as HTMLElement | null;
      const btn = document.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
      if (zone && needle && btn && !btn.disabled) {
        const left = parseFloat(zone.style.left);
        const width = parseFloat(zone.style.width);
        const at = parseFloat(needle.style.left);
        if (
          [left, width, at].every(Number.isFinite) &&
          at >= left &&
          at <= left + width
        ) {
          btn.click();
          return true;
        }
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return false;
  });
}

async function playHackPhase(page: Page): Promise<void> {
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 8000 });
  // Reveal → hold must show all glyphs (no dots) for the memorize bar phase.
  await page.waitForFunction(
    () => {
      const panel = document.querySelector(
        '.skill-panel:not([hidden])',
      ) as HTMLElement | null;
      if (!panel || panel.dataset.seqPhase !== 'hold') return false;
      const el = panel.querySelector('.skill-pattern') as HTMLElement | null;
      const text = el?.textContent ?? '';
      return text.length > 0 && !text.includes('·');
    },
    { timeout: 60_000 },
  );
  await shot(page, 'augusto-duel-hack-hold.png');
  await page.waitForFunction(
    () => !document.querySelector('.skill-panel:not([hidden]) .skill-seq-flash'),
    { timeout: 45_000 },
  );
  await shot(page, 'augusto-duel-hack-input.png');
  const seq = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillProgress: () => {
              def: { phases: { sequence?: string[] }[] };
              phaseIndex: number;
            } | null;
          };
        };
      }
    ).__HOUSE_EDGE__;
    const p = he.session.getSkillProgress();
    return p?.def.phases[p.phaseIndex]?.sequence ?? ['R', '↑', 'B', '↓'];
  });
  for (const k of seq) {
    await page.keyboard.press(KEY[k] ?? 'KeyR');
    await page.waitForTimeout(120);
  }
}

async function pickLedgerChoice(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /Livro nervoso|Ledger twitch/i });
  await expect(btn).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);
  await btn.click();
}

async function waitHackInputArmed(page: Page): Promise<void> {
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 12_000 });
  await page.waitForFunction(
    () => {
      const panel = document.querySelector(
        '.skill-panel:not([hidden])',
      ) as HTMLElement | null;
      return panel?.dataset.seqPhase === 'hold';
    },
    { timeout: 60_000 },
  );
  await page.waitForFunction(
    () => !document.querySelector('.skill-panel:not([hidden]) .skill-seq-flash'),
    { timeout: 45_000 },
  );
}

async function exhaustHackMisses(page: Page): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
    if (i >= 3) break;
    await expect(page.locator('.skill-miss-panel')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Tentar de novo|Retry/i }).click();
    await waitHackInputArmed(page);
  }
}

test.describe('Augusto duel full clear', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'duel screenshots are desktop keyboard',
    );
  });

  test('needle + choice + hack win at timescale 0.33', async ({ page }) => {
    test.setTimeout(240_000);
    await bootDuel(page);
    await expect(page.locator('.hud')).toHaveAttribute('data-input-mode', 'keyboard');
    await shot(page, 'augusto-duel-needle-start.png');
    await expect(page.locator('.btn-needle-stop')).toBeDisabled();
    expect(await stopWhenInZone(page)).toBe(true);
    await shot(page, 'augusto-duel-needle-win.png');
    await shot(page, 'augusto-duel-choice.png');
    await pickLedgerChoice(page);
    await playHackPhase(page);
    await expect(page.locator('.skill-result-win')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.skill-result-win')).toContainText(/Augusto|feed|torre/i);
    await shot(page, 'augusto-duel-win.png');
    const done = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              getSkillProgress: () => { done: boolean; won: boolean } | null;
              getSkillResult: () => { won: boolean; skillKind?: string } | null;
              story: { getFlag: (f: string) => boolean };
            };
          };
        }
      ).__HOUSE_EDGE__;
      const progress = he.session.getSkillProgress();
      const result = he.session.getSkillResult();
      return {
        progressWon: progress?.won ?? null,
        resultWon: result?.won ?? null,
        skillKind: result?.skillKind ?? null,
        casa: he.session.story.getFlag('casa_quebrada'),
      };
    });
    expect(
      done.resultWon === true || done.progressWon === true || done.casa === true,
      JSON.stringify(done),
    ).toBe(true);
  });

  test('duel hack exhaust shows lose result (not silent world drop)', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootDuel(page);
    expect(await stopWhenInZone(page)).toBe(true);
    await pickLedgerChoice(page);
    await waitHackInputArmed(page);
    await exhaustHackMisses(page);
    await expect(page.locator('.skill-result-lose')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.skill-result-lose')).toContainText(
      /Augusto|casa|Failed|Falhou/i,
    );
    await shot(page, 'augusto-duel-lose.png');
    await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible();
  });
});
