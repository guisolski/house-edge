/**
 * Playtest #51 / v1.22.27: every visible text in panels/dialogue/cards/credits
 * ≥14px rendered; buttons ≥16; needle retry focuses Para!.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
] as const;

async function forceKeyboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('keyboard');
  });
}

async function assertVisibleTextFloors(page: Page, rootSel: string): Promise<void> {
  const samples = await page.locator(rootSel).evaluate((root) => {
    const scaleOf = (el: Element): number => {
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
      return scale;
    };
    const out: { tag: string; text: string; fs: number; isBtn: boolean }[] = [];
    for (const el of root.querySelectorAll('*')) {
      const he = el as HTMLElement;
      if (he.hidden || he.getAttribute('aria-hidden') === 'true') continue;
      const st = getComputedStyle(he);
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') {
        continue;
      }
      const text = (he.innerText || he.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const childText = [...he.children].some(
        (c) => ((c as HTMLElement).innerText || '').trim().length > 0,
      );
      const isBtn = he.tagName === 'BUTTON' || he.classList.contains('btn');
      if (childText && !isBtn) continue;
      out.push({
        tag: `${he.tagName}.${he.className}`.slice(0, 80),
        text: text.slice(0, 48),
        fs: parseFloat(st.fontSize) * scaleOf(he),
        isBtn,
      });
    }
    return out;
  });
  expect(samples.length, `${rootSel} should have text`).toBeGreaterThan(0);
  for (const s of samples) {
    const floor = s.isBtn ? 15.5 : 13.5;
    expect(s.fs, `${rootSel} ${s.tag} "${s.text}" → ${s.fs}px`).toBeGreaterThanOrEqual(
      floor,
    );
  }
}

async function openDialogueWithChoices(page: Page): Promise<void> {
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
            showDialogue: (
              lines: {
                speaker: string;
                text: string;
                choices?: { label: string }[];
              }[],
            ) => void;
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
        text: 'Rita, a casa cobra o peixe.',
        choices: [{ label: 'Aceitar a aposta' }, { label: 'Sair' }],
      },
    ]);
  });
}

async function openLockpick(page: Page): Promise<void> {
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
    he.session.forceStorySkill('feira-lockbox');
    he.hud.syncScreen();
    he.hud.showSkill();
  });
}

async function openWinCard(page: Page): Promise<void> {
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
}

async function assertDialogueWidth(page: Page, vw: number): Promise<void> {
  const dlgW = await page
    .locator('.dialogue-panel:not([hidden])')
    .evaluate((el) => el.getBoundingClientRect().width);
  const floor = vw <= 420 ? vw * 0.92 : Math.min(960, Math.max(520, vw * 0.6));
  expect(dlgW).toBeGreaterThanOrEqual(floor - 2);
}

async function assertWinCardHeight(page: Page): Promise<void> {
  const heights = await page.evaluate(() => {
    const panel = document.querySelector('.skill-panel') as HTMLElement | null;
    const card = document.querySelector('.skill-result-panel') as HTMLElement | null;
    return {
      panel: panel?.getBoundingClientRect().height ?? 0,
      card: card?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(Math.abs(heights.card - heights.panel)).toBeLessThanOrEqual(2);
}

for (const vp of VIEWPORTS) {
  test.describe(`type scale ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(({ browserName }, testInfo) => {
      void browserName;
      test.skip(testInfo.project.name === 'mobile-chromium', 'own viewports');
    });

    test('dialogue + skill + win card text floors', async ({ page }) => {
      test.setTimeout(90_000);
      await page.addInitScript(() => {
        try {
          localStorage.setItem('house-edge-locale', 'pt-BR');
        } catch {
          /* ignore */
        }
      });
      await page.goto('/');
      await expect(page.locator('.title-screen')).toBeVisible();
      await assertVisibleTextFloors(page, '.title-screen');
      await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
      await expect(page.locator('.play-hud')).toBeVisible();
      await forceKeyboard(page);
      await openDialogueWithChoices(page);
      await expect(page.locator('.dialogue-panel:not([hidden])')).toBeVisible();
      await assertVisibleTextFloors(page, '.dialogue-panel:not([hidden])');
      await assertDialogueWidth(page, vp.width);
      await openLockpick(page);
      await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible();
      await assertVisibleTextFloors(page, '.skill-panel:not([hidden])');
      await expect(page.locator('.skill-lockpick-timer-slot')).toBeVisible();
      await expect(page.locator('.skill-pin-hint')).toHaveCount(3);
      await openWinCard(page);
      await expect(page.locator('.skill-result-panel')).toBeVisible();
      await assertVisibleTextFloors(page, '.skill-result-panel');
      await assertWinCardHeight(page);
    });
  });
}

test.describe('needle retry focuses Para!', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name === 'mobile-chromium', 'desktop');
  });

  test('open + soft-miss retry focus .btn-needle-stop', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('house-edge-locale', 'pt-BR');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
    await forceKeyboard(page);
    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              skipTutorialNow: () => void;
              forceStorySkill: (id: string) => boolean;
              player: { addCredits: (n: number) => void };
            };
            hud: { syncScreen: () => void; showSkill: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.session.skipTutorialNow();
      he.session.player.addCredits(500);
      he.session.forceStorySkill('agua-gelada');
      he.hud.syncScreen();
      he.hud.showSkill();
    });
    await expect(page.locator('.btn-needle-stop')).toBeVisible();
    await expect(page.locator('.btn-needle-stop')).toBeFocused({ timeout: 3000 });

    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              clearNeedleArm?: () => void;
              submitSkill: (v: number) => boolean;
            };
            hud: { syncScreen: () => void; showSkill: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.session.clearNeedleArm?.();
      he.session.submitSkill(0.05);
      he.hud.syncScreen();
      he.hud.showSkill();
    });
    const retry = page.getByRole('button', { name: /Tentar de novo|Try again/i });
    await expect(retry).toBeVisible({ timeout: 8000 });
    await retry.click();
    await expect(page.locator('.btn-needle-stop')).toBeVisible();
    await expect(page.locator('.btn-needle-stop')).toBeFocused({ timeout: 3000 });
  });
});

test.describe('lockpick timer reset on retry', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name === 'mobile-chromium', 'desktop');
  });

  test('retry restores full scaled budget (no 42→116 jump)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('house-edge-locale', 'pt-BR');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/?timescale=0.33&minigame=lockpick');
    await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible({
      timeout: 15_000,
    });
    await forceKeyboard(page);
    await expect(page.locator('.skill-lockpick-timer')).toContainText(/\d/, {
      timeout: 3000,
    });
    const first = await page.locator('.skill-lockpick-timer').textContent();
    const firstSecs = Number((first ?? '').replace(/[^\d]/g, ''));
    expect(firstSecs).toBeGreaterThanOrEqual(120);

    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: { submitSkill: (v: number) => boolean };
            hud: { syncScreen: () => void; showSkill: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.session.submitSkill(0);
      he.hud.syncScreen();
      he.hud.showSkill();
    });
    const retry = page.getByRole('button', { name: /Tentar de novo|Try again/i });
    await expect(retry).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await retry.click();
    await expect(page.locator('.skill-lockpick-timer')).toBeVisible();
    const after = await page.locator('.skill-lockpick-timer').textContent();
    const afterSecs = Number((after ?? '').replace(/[^\d]/g, ''));
    expect(afterSecs).toBeGreaterThanOrEqual(firstSecs - 3);
    expect(afterSecs).toBeLessThanOrEqual(firstSecs + 1);
  });
});
