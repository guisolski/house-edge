/**
 * Playtest #44: skill panel rows must never overlap (lockpick Testar / sequence pad).
 * Asserts every skill panel type at 1280×800 and 390×844.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;

/** One bet id per interactive skill panel kind (evade is world stealth, not a panel). */
const SKILL_BETS: { id: string; kind: string }[] = [
  { id: 'samba-odds', kind: 'timing' },
  { id: 'feira-lockbox', kind: 'lockpick' },
  { id: 'feira-radio', kind: 'hack' },
  { id: 'fio-corrida', kind: 'chase' },
  { id: 'laje-lottery', kind: 'choice' },
  { id: 'pastel-surpresa', kind: 'puzzle' },
  { id: 'torre-negotiate', kind: 'negotiate' },
  { id: 'duelo-casa', kind: 'duel' },
];

type Box = { left: number; top: number; right: number; bottom: number; label: string };

function intersects(a: Box, b: Box, slack = 0.5): boolean {
  return !(
    a.right <= b.left + slack ||
    b.right <= a.left + slack ||
    a.bottom <= b.top + slack ||
    b.bottom <= a.top + slack
  );
}

function clip(box: Box, clipTo: Box): Box | null {
  const left = Math.max(box.left, clipTo.left);
  const top = Math.max(box.top, clipTo.top);
  const right = Math.min(box.right, clipTo.right);
  const bottom = Math.min(box.bottom, clipTo.bottom);
  if (right - left < 1 || bottom - top < 1) return null;
  return { left, top, right, bottom, label: box.label };
}

async function openSkill(page: Page, betId: string): Promise<void> {
  await page.evaluate((id) => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            cancelBet: () => void;
            dismissSkillResult: () => void;
            forceStorySkill: (betId: string) => boolean;
            player: { addCredits: (n: number) => void };
          };
          hud: { syncScreen: () => void; showSkill: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.cancelBet();
    he.session.dismissSkillResult();
    he.session.player.addCredits(800);
    he.session.forceStorySkill(id);
    he.hud.syncScreen();
    he.hud.showSkill();
  }, betId);
  await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible({
    timeout: 8_000,
  });
}

async function assertNoRowOverlap(page: Page, kind: string): Promise<void> {
  const panel = page.locator('.skill-panel:not([hidden])');
  await expect(panel).toBeVisible();
  // Let sequence reveal paint the reserved pattern row once.
  if (kind === 'hack' || kind === 'chase' || kind === 'duel') {
    await page.waitForTimeout(200);
  }
  const report = await panel.evaluate((root) => {
    const toBox = (el: Element, i: number): Box => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        label: `${(el as HTMLElement).className || el.tagName}:${i}:${((el as HTMLElement).textContent ?? '').slice(0, 40)}`,
      };
    };
    const body = root.querySelector('.skill-body') as HTMLElement | null;
    const actions = root.querySelector('.skill-actions') as HTMLElement | null;
    const bodyClip = body ? toBox(body, -1) : null;
    const actionClip = actions ? toBox(actions, -2) : null;
    const bodyRows = body
      ? ([...body.children] as HTMLElement[]).map((el, i) => toBox(el, i))
      : [];
    const actionRows = actions
      ? ([...actions.children] as HTMLElement[]).map((el, i) => toBox(el, 100 + i))
      : [];
    return { bodyClip, actionClip, bodyRows, actionRows };
  });

  const checkSiblings = (rows: Box[], clipTo: Box | null, where: string): void => {
    const visible = rows
      .map((r) => (clipTo ? clip(r, clipTo) : r))
      .filter((r): r is Box => Boolean(r));
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i]!;
        const b = visible[j]!;
        expect(
          intersects(a, b),
          `${kind}/${where}: overlap ${a.label} × ${b.label}`,
        ).toBe(false);
      }
    }
  };

  checkSiblings(report.bodyRows, report.bodyClip, 'body');
  checkSiblings(report.actionRows, report.actionClip, 'actions');

  // Actions must sit below the visible body — catches sticky/absolute overlays.
  if (report.bodyClip && report.actionClip) {
    expect(
      report.actionClip.top + 0.5 >= report.bodyClip.bottom,
      `${kind}: actions overlap body (actions.top=${report.actionClip.top} body.bottom=${report.bodyClip.bottom})`,
    ).toBe(true);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`skill layout ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(({ browserName }, testInfo) => {
      void browserName;
      // Fixed viewports — skip the mobile project so we don't double-run.
      test.skip(
        testInfo.project.name === 'mobile-chromium',
        'layout cases set their own viewports',
      );
    });

    test(`no overlapping skill rows (${SKILL_BETS.length} kinds)`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
      await expect(page.locator('.play-hud')).toBeVisible();
      for (const { id, kind } of SKILL_BETS) {
        await openSkill(page, id);
        if (kind === 'lockpick') {
          const pin = page.locator('.lockpick-pin').first();
          await expect(pin).toBeVisible();
          await expect(pin).toContainText(/\([0-9]\)/);
          await expect(pin).toContainText(/[▮▯]/);
        }
        await assertNoRowOverlap(page, kind);
      }
    });
  });
}
