/**
 * Playtest #45: skill panel fits without clipping/overlap at 1280×720 and 390×844.
 * Covers every skill kind × phases: reveal, input, after-wrong, offer.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1024, height: 576 },
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

function fullyInside(inner: Box, outer: Box, slack = 1): boolean {
  return (
    inner.left >= outer.left - slack &&
    inner.top >= outer.top - slack &&
    inner.right <= outer.right + slack &&
    inner.bottom <= outer.bottom + slack
  );
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

async function assertPanelMetrics(page: Page, tag: string): Promise<void> {
  const panel = page.locator('.skill-panel:not([hidden])');
  const metrics = await panel.evaluate((root) => {
    const title = root.querySelector('.skill-title, h2') as HTMLElement | null;
    const body = root.querySelector('.skill-body') as HTMLElement | null;
    const btn = root.querySelector('.skill-actions .btn') as HTMLElement | null;
    // Playtest #48: computed font × ancestor/visual scale = rendered CSS px.
    const scaleOf = (el: Element | null): number => {
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
    const titleFs = title ? parseFloat(getComputedStyle(title).fontSize) : 0;
    const bodyFs = body ? parseFloat(getComputedStyle(body).fontSize) : 0;
    const meta = root.querySelector('.skill-meta') as HTMLElement | null;
    const pattern = root.querySelector('.skill-pattern') as HTMLElement | null;
    const hint = root.querySelector('.skill-seq-hint') as HTMLElement | null;
    const scale = scaleOf(root);
    const btnH = btn ? btn.getBoundingClientRect().height : 0;
    const vw = window.innerWidth;
    // Playtest #49: desktop clamp(520, 60vw, 960); mobile ≥92vw.
    const expectedMin = vw <= 420 ? vw * 0.92 : Math.min(960, Math.max(520, vw * 0.6));
    return {
      width: root.getBoundingClientRect().width,
      expectedMin,
      titleFs: titleFs * scale,
      bodyFs: bodyFs * scale,
      metaFs: meta ? parseFloat(getComputedStyle(meta).fontSize) * scale : 0,
      patternFs: pattern ? parseFloat(getComputedStyle(pattern).fontSize) * scale : 0,
      hintFs: hint ? parseFloat(getComputedStyle(hint).fontSize) * scale : 0,
      btnH,
      scale,
      scrollOverflow:
        root.scrollHeight > root.clientHeight + 2 ||
        Boolean(body && body.scrollHeight > body.clientHeight + 2),
    };
  });
  expect(
    metrics.width,
    `${tag}: panel width ${metrics.width} < floor ${metrics.expectedMin}`,
  ).toBeGreaterThanOrEqual(metrics.expectedMin - 1);
  expect(
    metrics.titleFs,
    `${tag}: rendered title ${metrics.titleFs} (scale ${metrics.scale})`,
  ).toBeGreaterThanOrEqual(19.5);
  expect(
    metrics.bodyFs,
    `${tag}: rendered body ${metrics.bodyFs} (scale ${metrics.scale})`,
  ).toBeGreaterThanOrEqual(14.5);
  if (metrics.metaFs > 0) {
    expect(metrics.metaFs, `${tag}: meta`).toBeGreaterThanOrEqual(13.5);
  }
  if (metrics.patternFs > 0) {
    expect(metrics.patternFs, `${tag}: sequence glyphs`).toBeGreaterThanOrEqual(27.5);
  }
  if (metrics.hintFs > 0) {
    expect(metrics.hintFs, `${tag}: seq hint`).toBeGreaterThanOrEqual(14.5);
  }
  if (metrics.btnH > 0) {
    expect(metrics.btnH, `${tag}: button height ${metrics.btnH}`).toBeGreaterThanOrEqual(
      43.5,
    );
  }
  expect(metrics.scrollOverflow, `${tag}: panel/body should not scroll`).toBe(false);
}

async function assertLayout(page: Page, kind: string, phase: string): Promise<void> {
  const panel = page.locator('.skill-panel:not([hidden])');
  await expect(panel).toBeVisible();
  const tag = `${kind}/${phase}`;
  await assertPanelMetrics(page, tag);

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
    const panelBox = toBox(root, -10);
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
    const interactive = [
      ...root.querySelectorAll(
        '.lockpick-pin, .lockpick-pin-verdict, .skill-seq-pad .btn, .skill-meter, .skill-needle, .skill-zone, .skill-pattern, .skill-offer, .skill-actions .btn',
      ),
    ].map((el, i) => toBox(el, 200 + i));
    return { panelBox, bodyClip, actionClip, bodyRows, actionRows, interactive };
  });

  const checkSiblings = (rows: Box[], clipTo: Box | null, where: string): void => {
    const visible = rows
      .map((r) => (clipTo ? clip(r, clipTo) : r))
      .filter((r): r is Box => Boolean(r));
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i]!;
        const b = visible[j]!;
        expect(intersects(a, b), `${tag}/${where}: overlap ${a.label} × ${b.label}`).toBe(
          false,
        );
      }
    }
  };

  checkSiblings(report.bodyRows, report.bodyClip, 'body');
  checkSiblings(report.actionRows, report.actionClip, 'actions');

  if (report.bodyClip && report.actionClip) {
    expect(
      report.actionClip.top + 0.5 >= report.bodyClip.bottom,
      `${tag}: actions overlap body (actions.top=${report.actionClip.top} body.bottom=${report.bodyClip.bottom})`,
    ).toBe(true);
  }

  for (const box of report.interactive) {
    // Skip zero-size / offscreen placeholders.
    if (box.right - box.left < 2 || box.bottom - box.top < 2) continue;
    expect(
      fullyInside(box, report.panelBox),
      `${tag}: clipped ${box.label} outside panel`,
    ).toBe(true);
  }
}

async function wrongLockpick(page: Page): Promise<void> {
  // Leave pins at 0 — targets are non-zero — then Test.
  await page.locator('.skill-panel:not([hidden]) .skill-actions .btn').first().click();
  await page.waitForTimeout(120);
}

async function remountAfterMiss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillMissCard?: () => unknown;
            retrySkillMiss?: () => void;
          };
          hud: { syncScreen: () => void; showSkill: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    if (he.session.getSkillMissCard?.()) he.session.retrySkillMiss?.();
    he.hud.syncScreen();
    he.hud.showSkill();
  });
  await page.waitForTimeout(200);
}

async function wrongSequenceKey(page: Page): Promise<void> {
  // Guaranteed soft miss via harness — then remount past the fail card.
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillProgress: () => {
              seqIndex: number;
              def: { phases: { sequence?: string[] }[] };
              phaseIndex: number;
            } | null;
            submitSkill: (v: number) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    const p = he.session.getSkillProgress();
    if (!p) return;
    const phase = p.def.phases[p.phaseIndex];
    const seq = phase?.sequence ?? [];
    const want = seq[p.seqIndex] ?? '';
    // Alias pairs: R↔↑ G↔→ B↔↓ Y↔← — avoid both sides of the expected key.
    const alias: Record<string, string> = {
      R: '↑',
      '↑': 'R',
      G: '→',
      '→': 'G',
      B: '↓',
      '↓': 'B',
      Y: '←',
      '←': 'Y',
    };
    const keys = ['↑', '→', '↓', '←', 'R', 'G', 'B', 'Y'];
    const twin = alias[want] ?? '';
    const wrong = keys.findIndex((k) => k !== want && k !== twin);
    he.session.submitSkill(wrong >= 0 ? wrong : 1);
    he.hud.syncScreen();
  });
  await remountAfterMiss(page);
}

async function waitRevealPhase(page: Page): Promise<void> {
  await expect(page.locator('.skill-panel:not([hidden]) .skill-pattern')).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.locator('.skill-panel:not([hidden]) .skill-seq-flash')).toBeVisible({
    timeout: 8_000,
  });
  await page.waitForTimeout(250);
}

async function waitInputPhase(page: Page): Promise<void> {
  // Progressive + full hold for 3-key seq ≈ 2*1400+2000 = 4800ms; allow 7s.
  await page.waitForFunction(
    () => {
      const hint = document.querySelector(
        '.skill-panel:not([hidden]) .skill-seq-hint',
      ) as HTMLElement | null;
      const flash = document.querySelector('.skill-panel:not([hidden]) .skill-seq-flash');
      return Boolean(hint) && !flash;
    },
    { timeout: 12_000 },
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`skill layout ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(({ browserName }, testInfo) => {
      void browserName;
      test.skip(
        testInfo.project.name === 'mobile-chromium',
        'layout cases set their own viewports',
      );
    });

    test(`no clip/overlap for all kinds + phases`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto('/');
      await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
      await expect(page.locator('.play-hud')).toBeVisible();

      for (const { id, kind } of SKILL_BETS) {
        await openSkill(page, id);

        if (kind === 'lockpick') {
          await assertLayout(page, kind, 'input');
          await wrongLockpick(page);
          await remountAfterMiss(page);
          await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible();
          await assertLayout(page, kind, 'after-wrong-attempt');
          continue;
        }

        // Pure sequence panels (hack/chase). Duel starts on timing — handled below.
        if (kind === 'hack' || kind === 'chase') {
          await waitRevealPhase(page);
          await assertLayout(page, kind, 'reveal');
          await waitInputPhase(page);
          await assertLayout(page, kind, 'input');
          await wrongSequenceKey(page);
          await waitRevealPhase(page);
          await assertLayout(page, kind, 'after-wrong-attempt');
          continue;
        }

        if (kind === 'negotiate' || kind === 'choice' || kind === 'puzzle') {
          await assertLayout(page, kind, 'offer');
          continue;
        }

        if (kind === 'duel') {
          // Phase 1 timing → phase 2 offer → phase 3 sequence.
          await assertLayout(page, kind, 'input');
          await page.evaluate(() => {
            const he = (
              window as unknown as {
                __HOUSE_EDGE__: {
                  session: {
                    submitSkill: (v: number) => boolean;
                    clearNeedleArm?: () => void;
                  };
                  hud: { syncScreen: () => void; showSkill: () => void };
                };
              }
            ).__HOUSE_EDGE__;
            he.session.clearNeedleArm?.();
            he.session.submitSkill(0.5);
            he.hud.syncScreen();
            he.hud.showSkill();
          });
          await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible();
          await assertLayout(page, kind, 'offer');
          await page.evaluate(() => {
            const he = (
              window as unknown as {
                __HOUSE_EDGE__: {
                  session: {
                    getSkillProgress: () => {
                      phaseIndex: number;
                      def: { phases: { target?: number }[] };
                    } | null;
                    submitSkill: (v: number) => boolean;
                  };
                  hud: { syncScreen: () => void; showSkill: () => void };
                };
              }
            ).__HOUSE_EDGE__;
            const p = he.session.getSkillProgress();
            const target = p?.def.phases[p.phaseIndex]?.target ?? 1;
            he.session.submitSkill(target);
            he.hud.syncScreen();
            he.hud.showSkill();
          });
          await waitRevealPhase(page);
          await assertLayout(page, kind, 'reveal');
          await waitInputPhase(page);
          await assertLayout(page, kind, 'input');
          await wrongSequenceKey(page);
          await waitRevealPhase(page);
          await assertLayout(page, kind, 'after-wrong-attempt');
          continue;
        }

        // timing / default
        await assertLayout(page, kind, 'input');
      }
    });
  });
}
