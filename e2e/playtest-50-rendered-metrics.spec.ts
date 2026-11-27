/**
 * Playtest #50 / v1.22.26: rendered font/width floors for dialogue, title,
 * win/fail cards, sequence glyphs; duel hack timer respects ?timescale=.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
] as const;

function panelFloor(vw: number): number {
  if (vw <= 420) return Math.floor(vw * 0.92);
  return Math.min(960, Math.max(520, Math.floor(vw * 0.6)));
}

async function forceKeyboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('keyboard');
  });
}

async function renderedFs(page: Page, sel: string): Promise<number> {
  return page
    .locator(sel)
    .first()
    .evaluate((el) => {
      let scale = 1;
      let node: Element | null = el;
      while (node) {
        const tr = getComputedStyle(node).transform;
        if (tr && tr !== 'none') {
          const m = new DOMMatrixReadOnly(tr);
          scale *= Math.hypot(m.a, m.b) || 1;
        }
        node = node.parentElement;
      }
      if (window.visualViewport?.scale) scale *= window.visualViewport.scale;
      return parseFloat(getComputedStyle(el).fontSize) * scale;
    });
}

async function panelWidth(page: Page, sel: string): Promise<number> {
  return page.locator(sel).evaluate((el) => el.getBoundingClientRect().width);
}

async function assertTitleFloors(page: Page): Promise<void> {
  await expect(page.locator('.title-screen')).toBeVisible();
  const logoFs = await renderedFs(page, '.title-screen .logo');
  const tagFs = await renderedFs(page, '.title-screen .tagline');
  const btnFs = await renderedFs(page, '.title-screen .btn');
  expect(logoFs, 'logo').toBeGreaterThanOrEqual(16);
  expect(tagFs, 'title tagline').toBeGreaterThanOrEqual(15.5);
  expect(btnFs, 'title button').toBeGreaterThanOrEqual(15.5);
}

async function assertDialogueFloors(page: Page, vw: number): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            skipTutorialNow: () => void;
            player: { addCredits: (n: number) => void };
          };
          hud: {
            syncScreen: () => void;
            showDialogue: (lines: { speaker: string; text: string }[]) => void;
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.skipTutorialNow();
    he.session.player.addCredits(500);
    he.hud.syncScreen();
    he.hud.showDialogue([
      {
        speaker: 'Dona Nair',
        text: 'Rita, a casa cobra o peixe. Escuta o radar e não pisca.',
      },
    ]);
  });
  await expect(page.locator('.dialogue-panel:not([hidden])')).toBeVisible({
    timeout: 8000,
  });
  const dlgW = await panelWidth(page, '.dialogue-panel:not([hidden])');
  const dlgFs = await renderedFs(
    page,
    '.dialogue-panel:not([hidden]) .dialogue-body, .dialogue-panel:not([hidden]) .line',
  );
  expect(dlgW, 'dialogue width').toBeGreaterThanOrEqual(panelFloor(vw) - 2);
  expect(dlgFs, 'dialogue body').toBeGreaterThanOrEqual(16.5);
}

async function assertSequenceGlyphFloors(page: Page): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            cancelBet: () => void;
            forceStorySkill: (id: string) => boolean;
            player: { addCredits: (n: number) => void };
          };
          hud: { syncScreen: () => void; showSkill: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.cancelBet();
    he.session.player.addCredits(500);
    he.session.forceStorySkill('feira-radio');
    he.hud.syncScreen();
    he.hud.showSkill();
  });
  await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible();
  const metaFs = await renderedFs(page, '.skill-panel:not([hidden]) .skill-meta');
  const patternFs = await renderedFs(page, '.skill-panel:not([hidden]) .skill-pattern');
  expect(metaFs, 'skill meta').toBeGreaterThanOrEqual(13.5);
  expect(patternFs, 'sequence glyphs').toBeGreaterThanOrEqual(27.5);
}

async function assertWinCardFloors(page: Page, vw: number, vh: number): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            completeSkillPerfect: (o?: { keepBanner?: boolean }) => boolean;
          };
          hud: { syncScreen: () => void; showSkill: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.completeSkillPerfect({ keepBanner: true });
    he.hud.syncScreen();
    he.hud.showSkill();
  });
  await expect(page.locator('.skill-result-panel')).toBeVisible({ timeout: 8000 });
  const winW = await panelWidth(page, '.skill-result-panel');
  const winH = await page
    .locator('.skill-result-panel')
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(winW, 'win card width').toBeGreaterThanOrEqual(panelFloor(vw) - 2);
  expect(winH, 'win card min-height').toBeGreaterThanOrEqual(
    Math.min(vh * 0.72, 600) - 8,
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`rendered metrics ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(({ browserName }, testInfo) => {
      void browserName;
      test.skip(testInfo.project.name === 'mobile-chromium', 'own viewports');
    });

    test('title + dialogue + skill glyphs + win card floors', async ({ page }) => {
      test.setTimeout(120_000);
      await page.addInitScript(() => {
        try {
          localStorage.setItem('house-edge-locale', 'pt-BR');
        } catch {
          /* ignore */
        }
      });
      await page.goto('/');
      await assertTitleFloors(page);
      await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
      await expect(page.locator('.play-hud')).toBeVisible();
      await forceKeyboard(page);
      await assertDialogueFloors(page, vp.width);
      await assertSequenceGlyphFloors(page);
      await assertWinCardFloors(page, vp.width, vp.height);
    });
  });
}

test.describe('duel hack timer respects timescale', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name === 'mobile-chromium', 'desktop QA');
  });

  test('?chapter=vip&timescale=0.33 keeps scaled hack input budget', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('house-edge-locale', 'pt-BR');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/?chapter=vip&timescale=0.33');
    await expect(page.locator('.play-hud')).toBeVisible({ timeout: 15_000 });
    const scale = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: { session: { getQaTimescale: () => number } };
        }
      ).__HOUSE_EDGE__;
      return he.session.getQaTimescale();
    });
    expect(scale).toBeCloseTo(0.33, 2);

    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              forceStorySkill: (id: string) => boolean;
              player: { addCredits: (n: number) => void };
              submitSkill: (v: number) => boolean;
              clearNeedleArm?: () => void;
              getSkillProgress: () => {
                phaseIndex: number;
                def: { phases: { target?: number }[] };
              } | null;
            };
            hud: { syncScreen: () => void; showSkill: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.session.player.addCredits(2000);
      he.session.forceStorySkill('duelo-casa');
      he.session.clearNeedleArm?.();
      he.session.submitSkill(0.5);
      const p = he.session.getSkillProgress();
      const target = p?.def.phases[p.phaseIndex]?.target ?? 1;
      he.session.submitSkill(target);
      he.hud.syncScreen();
      he.hud.showSkill();
    });

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
    const timerText = await page
      .locator('.skill-panel:not([hidden]) .skill-seq-timer')
      .textContent();
    const secs = Number((timerText ?? '').replace(/[^\d]/g, ''));
    // Unscaled duel hack is 16s; at 0.33 → ~48s. Assert well above unscaled.
    expect(secs, `timer "${timerText}"`).toBeGreaterThanOrEqual(40);
  });
});
