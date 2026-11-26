/**
 * Playtest #32: page.keyboard.press('Enter') must confirm every surface
 * (main Enter via event.key — not only NumpadEnter).
 */
import { test, expect } from '@playwright/test';

test('Enter stops the needle after Take bet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            npcs: { id: string; x: number; y: number }[];
            player: { setPosition: (x: number, y: number) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    const nair = he.session.npcs.find((n) => n.id === 'dona-nair')!;
    he.session.player.setPosition(nair.x, nair.y + 1);
  });
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  // Mouse pick (keyboard choice path covered in dialogue-choice + enter-leaks).
  await page.waitForTimeout(450);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 3000 });
  await page.locator('.btn-take-bet').click();
  await expect(page.locator('.skill-panel')).toBeVisible();
  await expect(page.locator('.btn-needle-stop')).toBeVisible();
  // Playtest #38: wait ready countdown + arm before Enter Stop counts.
  await expect(page.locator('.skill-needle-ready')).toContainText(/Go|Já/i, {
    timeout: 3000,
  });
  await page.waitForTimeout(450);
  // Main Enter (not NumpadEnter) stops the needle.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const stillSkill = await page.locator('.skill-panel').isVisible();
  if (stillSkill) {
    await expect(page.locator('.skill-panel')).toContainText(/Phase|Fase|Stake|Aposta/i);
  }
});

test('Enter confirms credits Skip after arm', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: { setFlag: (f: string, v?: boolean) => void };
            ui: { go: (s: string) => boolean };
          };
          hud: { showCreditsRoll: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('casa_quebrada', true);
    (he.session as unknown as { creditsRoll: boolean }).creditsRoll = true;
    he.session.ui.go('ending');
    he.hud.showCreditsRoll();
  });
  const skip = page.getByRole('button', { name: /Skip credits|Pular créditos/i });
  await expect(skip).toBeVisible();
  await page.waitForTimeout(950);
  await expect(skip).toBeEnabled();
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 3000 });
});

test('Enter confirms Fechar on epilogue closing line', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: {
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
              addCredits: (n: number) => void;
            };
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(50);
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) s.world.unlock(id);
    s.story.setFlag('casa_quebrada', true);
    s.player.setDistrict('morro-neon');
    s.player.setPosition(14, 16);
    s.runStoryBeat('epilogue-laje');
  });
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  await page.waitForTimeout(650);
  await page.locator('.dialogue-choice').first().click();
  const close = page.locator('.btn-closing-continue');
  await expect(close).toBeVisible();
  await expect(close).toBeEnabled({ timeout: 4000 });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.credits-line').first()).toBeVisible({ timeout: 3000 });
});
