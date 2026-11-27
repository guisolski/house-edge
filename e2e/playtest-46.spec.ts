/**
 * Playtest #46 / v1.22.22: needle countdown arm, epilogue credits + menu,
 * soft-miss fail card, QA minigame sandbox panel screenshots.
 */
import { test, expect, type Page } from '@playwright/test';
async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { session: { skipTutorialNow: () => void } };
      }
    ).__HOUSE_EDGE__.session.skipTutorialNow();
  });
}

async function openNeedle(page: Page): Promise<void> {
  const ok = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { forceStorySkill: (id: string) => boolean };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    const opened =
      he.session.forceStorySkill('samba-odds') ||
      he.session.forceStorySkill('agua-gelada');
    he.hud.syncScreen();
    return opened;
  });
  expect(ok).toBe(true);
  await expect(page.locator('.skill-meter')).toBeVisible();
}

test.describe('needle countdown arm', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('E at Em 3/2/1 never misses; Parar stays disabled', async ({ page }) => {
    await boot(page);
    await openNeedle(page);
    await expect(page.locator('.btn-needle-stop')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.locator('.skill-needle-ready')).toContainText(/Em 3|Ready in 3/i);

    for (const tick of [3, 2, 1]) {
      await expect(page.locator('.skill-needle-ready')).toContainText(
        new RegExp(`Em ${tick}|Ready in ${tick}`, 'i'),
        { timeout: 2000 },
      );
      await page.keyboard.press('KeyE');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await expect(page.locator('.skill-miss-panel')).toHaveCount(0);
      await expect(page.locator('.toast')).not.toContainText(/Errou|Missed|fase|phase/i);
      await expect(page.locator('.btn-needle-stop')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }

    await expect(page.locator('.skill-needle-ready')).toContainText(/Já|Go/i, {
      timeout: 2000,
    });
    await expect(page.locator('.btn-needle-stop')).not.toHaveAttribute(
      'aria-disabled',
      'true',
      { timeout: 1000 },
    );
    const misses = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: { getSkillProgress: () => { misses: number } | null };
          };
        }
      ).__HOUSE_EDGE__;
      return he.session.getSkillProgress()?.misses ?? -1;
    });
    expect(misses).toBe(0);
  });

  test('E mash under CPU throttle + slow frames never misses', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await boot(page);
    await openNeedle(page);

    // Mash only while countdown text is visible — stop before input arms.
    const start = Date.now();
    while (Date.now() - start < 12_000) {
      const ready = await page.locator('.skill-needle-ready').innerText();
      if (/Já|Go/i.test(ready)) break;
      await page.keyboard.press('KeyE');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
    }

    await expect(page.locator('.skill-miss-panel')).toHaveCount(0);
    await expect(page.locator('.toast')).not.toContainText(/Errou|Missed|fase|phase/i);
    await expect(page.locator('.skill-meter')).toBeVisible();
    await expect(page.locator('.btn-needle-stop')).not.toHaveAttribute(
      'aria-disabled',
      'true',
      { timeout: 2000 },
    );
    const misses = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: { getSkillProgress: () => { misses: number } | null };
          };
        }
      ).__HOUSE_EDGE__;
      return he.session.getSkillProgress()?.misses ?? -1;
    });
    expect(misses).toBe(0);
  });
});

test.describe('epilogue credits + menu', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('?chapter=epilogue → Nair Fechar rolls credits; Esc has Créditos', async ({
    page,
  }) => {
    await page.goto('/?chapter=epilogue');
    await expect(page.locator('.play-hud')).toBeVisible({ timeout: 8000 });

    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              npcs: { id: string; x: number; y: number }[];
              player: { setPosition: (x: number, y: number) => void };
              runStoryBeat: (id: string) => boolean;
            };
            hud: { syncScreen: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      const nair = he.session.npcs.find((n) => n.id === 'dona-nair');
      if (nair) he.session.player.setPosition(nair.x, nair.y + 1);
      he.session.runStoryBeat('epilogue-laje');
      he.hud.syncScreen();
    });

    await expect(page.locator('.dialogue-choice').first()).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(550);
    await page.locator('.dialogue-choice').first().click();
    await expect(page.locator('.dialogue-closing-line')).toContainText(/Saúde/i);
    const closeBtn = page.locator('.btn-closing-continue');
    await expect(closeBtn).toBeEnabled({ timeout: 2000 });
    await closeBtn.click();

    await expect(page.locator('.ending-panel.ending-credits')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('.credits-line').first()).toBeVisible();
    // Leave still armed — Enter must not dismiss.
    await page.keyboard.press('Enter');
    await expect(page.locator('.ending-panel.ending-credits')).toBeVisible();
    await expect(page.locator('.ending-panel')).toHaveAttribute('data-credits-arm', '0');

    await expect(page.locator('.ending-panel')).toHaveAttribute('data-credits-arm', '1', {
      timeout: 2000,
    });
    await page.getByRole('button', { name: /Skip credits|Pular créditos/i }).click();
    await expect(page.locator('.play-hud')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.menu-panel')).toBeVisible();
    await expect(page.getByRole('button', { name: /Credits|Créditos/i })).toBeVisible();
  });
});

test.describe('soft-miss fail card', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('wrong quiz answer shows fail card with retry/leave', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              player: { addCredits: (n: number) => void };
              forceStorySkill: (id: string) => boolean;
            };
            hud: { syncScreen: () => void };
          };
        }
      ).__HOUSE_EDGE__;
      he.session.player.addCredits(200);
      he.session.forceStorySkill('feira-tipster');
      he.hud.syncScreen();
    });
    await expect(page.locator('.skill-panel')).toBeVisible();
    // Pick a wrong option if choices exist.
    const choice = page.locator('.skill-actions .btn').first();
    await expect(choice).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(500);
    await choice.click();
    // Soft miss → miss card (or full fail result).
    await expect(
      page.locator('.skill-miss-panel, .skill-result-lose').first(),
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /Retry|Tentar de novo|Continue|Continuar/i }),
    ).toBeVisible();
  });
});
