/**
 * Playtest #47 / v1.22.23: sequence fail card, R pause, title focus, QA sandbox return.
 */
import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { skipTutorialNow: () => void };
          forceMode: (m: string) => void;
        };
      }
    ).__HOUSE_EDGE__;
    he.session.skipTutorialNow();
    he.forceMode('keyboard');
  });
}

async function openRadio(page: Page): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            forceStorySkill: (id: string) => boolean;
            setQaTimescale: (n: number) => void;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.setQaTimescale(1);
    he.session.player.addCredits(300);
    he.session.forceStorySkill('feira-radio');
    he.hud.syncScreen();
  });
  await expect(page.locator('.skill-pattern')).toBeVisible();
  await page.waitForFunction(
    () => !document.querySelector('.skill-panel:not([hidden]) .skill-seq-flash'),
    { timeout: 20_000 },
  );
}

test.describe('playtest 47 sequence fail', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name === 'mobile-chromium', 'desktop keyboard cases');
  });

  test('wrong sequence key shows Errou fail card (Retry/Leave, no auto-close)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('house-edge-locale', 'pt-BR');
      } catch {
        /* ignore */
      }
    });
    await boot(page);
    await openRadio(page);
    await page.keyboard.press('KeyW'); // ↑ — wrong for ← first
    await expect(page.locator('.skill-miss-panel')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.skill-miss-panel')).toContainText(/Errou\s*1\s*\/\s*2/i);
    await expect(page.getByRole('button', { name: /Tentar de novo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sair$/i })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator('.skill-miss-panel')).toBeVisible();
  });

  test('R pauses sequence timer instead of adding time', async ({ page }) => {
    await boot(page);
    await openRadio(page);
    const before = await page.locator('.skill-seq-timer').innerText();
    const beforeSec = Number((before.match(/(\d+)/) ?? [])[1] ?? 0);
    expect(beforeSec).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    await page.keyboard.press('KeyR');
    await expect(page.locator('.skill-seq-flash')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(400);
    const mid = await page.locator('.skill-seq-timer').innerText();
    const midSec = Number((mid.match(/(\d+)/) ?? [])[1] ?? 0);
    expect(midSec).toBeLessThanOrEqual(beforeSec);
    expect(midSec).toBeGreaterThan(0);
  });
});

test.describe('playtest 47 title + sandbox', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name === 'mobile-chromium', 'desktop keyboard cases');
  });

  test('title ArrowDown moves focus, not language', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (
        window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
      ).__HOUSE_EDGE__.forceMode('keyboard');
    });
    const title = page.locator('.title-screen');
    await expect(title).toBeVisible();
    const newGame = title.getByRole('button', { name: /New Game|Novo jogo/i });
    await newGame.focus();
    await expect(newGame).toBeFocused();
    await page.keyboard.press('ArrowDown');
    const focused = await page.evaluate(() => {
      const ae = document.activeElement as HTMLElement | null;
      return {
        text: ae?.textContent?.trim() ?? '',
        inLang: Boolean(ae?.closest('.lang-row')),
      };
    });
    // Continue may be disabled (no save) but must still receive focus before language.
    expect(focused.inLang).toBe(false);
    expect(focused.text).toMatch(/Continue|Continuar|Credits|Créditos/i);
  });

  test('?minigame win returns to world without story dialogue', async ({ page }) => {
    await page.goto('/?minigame=quiz&timescale=0.33');
    await expect(page.locator('.skill-panel')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            forceMode: (m: string) => void;
            session: {
              completeSkillPerfect: (opts?: { keepBanner?: boolean }) => boolean;
              dismissSkillResult: () => void;
            };
            hud: { syncScreen: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.forceMode('keyboard');
      he.session.completeSkillPerfect({ keepBanner: true });
      he.hud.syncScreen();
      he.session.dismissSkillResult();
      he.hud.syncScreen();
    });
    await expect(page.locator('.dialogue-panel')).toBeHidden();
    const state = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              getDialogue: () => unknown[];
              getPendingStoryBeat: () => string | null;
              ui: { is: (s: string) => boolean };
              isQaSandbox: () => boolean;
            };
          };
        }
      ).__HOUSE_EDGE__;
      return {
        dialogue: he.session.getDialogue().length,
        beat: he.session.getPendingStoryBeat(),
        play: he.session.ui.is('play'),
        sandbox: he.session.isQaSandbox(),
      };
    });
    expect(state.dialogue).toBe(0);
    expect(state.beat).toBeNull();
    expect(state.play).toBe(true);
    expect(state.sandbox).toBe(false);
  });
});
