/**
 * Playtest #46: QA `?minigame=` panel screenshots at 1280×720 and 390×844.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.join('artifacts', 'panels-v1.22.22');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

type Kind = 'lockpick' | 'sequence' | 'needle' | 'offer' | 'hack' | 'quiz';
type Vp = { name: string; width: number; height: number };

async function shot(page: Page, name: string): Promise<void> {
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
  await expect(page.locator('.btn-needle-stop')).toHaveAttribute('aria-disabled', 'true');
  await shot(page, `${kind}-hold-${vp}.png`);
  await expect(page.locator('.btn-needle-stop')).not.toHaveAttribute(
    'aria-disabled',
    'true',
    { timeout: 12_000 },
  );
  await shot(page, `${kind}-input-${vp}.png`);
  await forceMiss(page);
  await expect(page.locator('.skill-miss-panel')).toBeVisible({ timeout: 3000 });
  await shot(page, `${kind}-after-wrong-${vp}.png`);
  await shot(page, `${kind}-fail-card-${vp}.png`);
}

async function phaseChoice(page: Page, kind: Kind, vp: string): Promise<void> {
  await page.waitForTimeout(400);
  await shot(page, `${kind}-input-${vp}.png`);
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
  await shot(page, `${kind}-hold-${vp}.png`);
  await page.waitForTimeout(2500);
  await shot(page, `${kind}-input-${vp}.png`);
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(300);
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
  test.describe(`panels ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const kind of kinds) {
      test(`${kind} phases`, async ({ page }) => {
        await page.goto(`/?minigame=${kind}&timescale=0.33`);
        await expect(page.locator('.skill-panel')).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(kind === 'sequence' ? 800 : 350);
        await shot(page, `${kind}-reveal-${vp.name}.png`);
        await captureKindPhases(page, kind, vp.name);
        await tryWinCard(page, kind, vp.name);
      });
    }
  });
}
