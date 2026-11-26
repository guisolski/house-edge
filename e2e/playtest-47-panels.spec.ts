/**
 * Playtest #47 / v1.22.23: panel screenshots at 1280×720 and 390×844.
 * Desktop captures force keyboard mode (no touch chrome). Locale: Português.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.join('artifacts', 'panels-v1.22.23');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

type Kind = 'lockpick' | 'sequence' | 'needle' | 'offer' | 'hack' | 'quiz';
type Vp = { name: string; width: number; height: number };

async function forceKeyboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('keyboard');
  });
}

async function forcePt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const he = window as unknown as {
      __HOUSE_EDGE__?: { session?: { setLocale?: (c: string) => void } };
    };
    // Prefer i18n setLocale via dynamic import fallback on window if exposed.
    const w = window as unknown as {
      __setLocale?: (c: string) => void;
    };
    if (typeof w.__setLocale === 'function') w.__setLocale('pt-BR');
    void he;
    try {
      localStorage.setItem('house-edge-locale', 'pt-BR');
    } catch {
      /* ignore */
    }
  });
}

async function shot(page: Page, name: string): Promise<void> {
  await forceKeyboard(page);
  await page.screenshot({ path: path.join(ART, name) });
}

async function forceMiss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { submitSkill: (v: number) => boolean };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.submitSkill(0.99);
    he.hud.syncScreen();
  });
}

async function captureFailIfAny(page: Page, kind: Kind, vp: string): Promise<void> {
  if (await page.locator('.skill-miss-panel, .skill-result-lose').count()) {
    await shot(page, `${kind}-fail-card-${vp}.png`);
  }
}

async function tryWinCard(page: Page, kind: Kind, vp: string): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillMissCard: () => unknown;
            retrySkillMiss: () => void;
            completeSkillPerfect: (opts?: { keepBanner?: boolean }) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    if (he.session.getSkillMissCard()) he.session.retrySkillMiss();
    he.session.completeSkillPerfect({ keepBanner: true });
    he.hud.syncScreen();
  });
  await page.waitForTimeout(200);
  if ((await page.locator('.skill-result-win').count()) > 0) {
    await shot(page, `${kind}-win-card-${vp}.png`);
  }
}

async function phaseNeedle(page: Page, kind: Kind, vp: string): Promise<void> {
  await expect(page.locator('.btn-needle-stop')).toBeDisabled();
  await shot(page, `${kind}-hold-${vp}.png`);
  await expect(page.locator('.btn-needle-stop')).toBeEnabled({ timeout: 12_000 });
  await shot(page, `${kind}-input-${vp}.png`);
  await forceMiss(page);
  await expect(page.locator('.skill-miss-panel')).toBeVisible({ timeout: 3000 });
  await shot(page, `${kind}-after-wrong-${vp}.png`);
  await shot(page, `${kind}-fail-card-${vp}.png`);
}

async function phaseChoice(page: Page, kind: Kind, vp: string): Promise<void> {
  await page.waitForTimeout(400);
  await shot(page, `${kind}-input-${vp}.png`);
  // Offer: title must not be duplicated as subtitle.
  if (kind === 'offer') {
    const dup = await page.evaluate(() => {
      const panel = document.querySelector('.skill-panel:not([hidden])');
      if (!panel) return true;
      const title = (panel.querySelector('.skill-title, h2')?.textContent ?? '').trim();
      const prompt = (panel.querySelector('.skill-prompt')?.textContent ?? '').trim();
      return Boolean(prompt) && prompt === title;
    });
    expect(dup, 'offer title must not be duplicated as prompt').toBe(false);
  }
  const btn = page.locator('.skill-actions .btn').first();
  if (!(await btn.isVisible())) return;
  await page.waitForTimeout(500);
  await btn.click();
  await page.waitForTimeout(300);
  await shot(page, `${kind}-after-wrong-${vp}.png`);
  await captureFailIfAny(page, kind, vp);
}

async function phaseLockpick(page: Page, kind: Kind, vp: string): Promise<void> {
  await shot(page, `${kind}-input-${vp}.png`);
  await page.getByRole('button', { name: /Test|Testar/i }).click();
  await page.waitForTimeout(300);
  await shot(page, `${kind}-after-wrong-${vp}.png`);
  await captureFailIfAny(page, kind, vp);
}

async function phaseSequence(page: Page, kind: Kind, vp: string): Promise<void> {
  await expect(page.locator('.skill-pattern').first()).toBeVisible({ timeout: 8000 });
  // Wait until full-sequence hold shows every glyph (no · placeholders).
  await page.waitForFunction(
    () => {
      const el = document.querySelector(
        '.skill-panel:not([hidden]) .skill-pattern.skill-seq-flash',
      ) as HTMLElement | null;
      if (!el) return false;
      const text = el.textContent ?? '';
      return text.length > 0 && !text.includes('·');
    },
    { timeout: 12_000 },
  );
  await shot(page, `${kind}-hold-${vp}.png`);
  // Also write the required sequence-hold artifact name.
  if (kind === 'sequence' && vp === 'desktop') {
    await shot(page, 'sequence-hold-desktop.png');
  }
  await page.waitForFunction(
    () => !document.querySelector('.skill-panel:not([hidden]) .skill-seq-flash'),
    { timeout: 12_000 },
  );
  await shot(page, `${kind}-input-${vp}.png`);
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(300);
  await expect(page.locator('.skill-miss-panel')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.skill-miss-panel')).toContainText(
    /Errou|Missed|1\s*\/\s*2/i,
  );
  await expect(
    page.getByRole('button', { name: /Tentar|Retry|Try again/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Sair|Leave|Exit/i })).toBeVisible();
  await shot(page, `${kind}-after-wrong-${vp}.png`);
  await captureFailIfAny(page, kind, vp);
}

async function captureKindPhases(page: Page, kind: Kind, vp: string): Promise<void> {
  if (kind === 'needle') await phaseNeedle(page, kind, vp);
  else if (kind === 'quiz' || kind === 'offer') await phaseChoice(page, kind, vp);
  else if (kind === 'lockpick') await phaseLockpick(page, kind, vp);
  else if (kind === 'sequence') await phaseSequence(page, kind, vp);
  else await shot(page, `${kind}-input-${vp}.png`);
}

const kinds: Kind[] = ['lockpick', 'sequence', 'needle', 'offer', 'hack', 'quiz'];
const viewports: Vp[] = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const vp of viewports) {
  test.describe(`panels v1.22.23 ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.beforeEach(({ browserName }, testInfo) => {
      void browserName;
      test.skip(
        testInfo.project.name === 'mobile-chromium' && vp.name === 'desktop',
        'desktop viewport cases run on desktop-chromium',
      );
      test.skip(
        testInfo.project.name === 'desktop-chromium' && vp.name === 'mobile',
        'mobile viewport cases run on mobile-chromium',
      );
    });
    for (const kind of kinds) {
      test(`${kind} phases`, async ({ page }) => {
        await page.addInitScript(() => {
          try {
            localStorage.setItem('house-edge-locale', 'pt-BR');
          } catch {
            /* ignore */
          }
        });
        await page.goto(`/?minigame=${kind}&timescale=0.33`);
        await forceKeyboard(page);
        await forcePt(page);
        await expect(page.locator('.skill-panel')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.hud')).toHaveAttribute('data-input-mode', 'keyboard');
        await expect(page.locator('.touch-controls')).toBeHidden();
        await page.waitForTimeout(kind === 'sequence' ? 800 : 350);
        await shot(page, `${kind}-reveal-${vp.name}.png`);
        await captureKindPhases(page, kind, vp.name);
        await tryWinCard(page, kind, vp.name);
      });
    }
  });
}
