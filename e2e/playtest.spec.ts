import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
}

async function forceMode(
  page: Page,
  mode: 'keyboard' | 'touch' | 'gamepad',
): Promise<void> {
  await page.evaluate((m) => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { forceMode: (mode: string) => void };
      }
    ).__HOUSE_EDGE__.forceMode(m);
  }, mode);
}

async function walkTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ x, y }) => {
      const edge = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: { player: { setPosition: (x: number, y: number) => void } };
          };
        }
      ).__HOUSE_EDGE__;
      edge.session.player.setPosition(x, y);
    },
    { x, y },
  );
  // nudge a move so HUD prompt refreshes via bus
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
}

test.describe('Playtest golden path + input modes', () => {
  test('desktop keyboard golden path', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('response', (res) => {
      if (res.status() === 404) errors.push(`404 ${res.url()}`);
    });

    await startGame(page);
    await forceMode(page, 'keyboard');
    await page.screenshot({ path: path.join(ART, '01-title-play-keyboard.png') });
    await expect(page.locator('.touch-controls')).toBeHidden();
    await expect(page.locator('.input-hints')).toContainText('WASD');

    await walkTo(page, 14, 15);
    await expect(page.locator('.interact-prompt')).toBeVisible();
    await page.screenshot({ path: path.join(ART, '02-prompt-npc.png') });

    await page.keyboard.press('KeyE');
    await expect(page.locator('.dialogue-panel')).toBeVisible();
    await page.screenshot({ path: path.join(ART, '03-dialogue.png') });
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.bet-panel')).toBeVisible();
    await expect(page.locator('.bet-panel')).toContainText('Odds');
    await page.screenshot({ path: path.join(ART, '04-bet.png') });
    await page.getByRole('button', { name: 'Place bet' }).click();
    await expect(page.locator('.play-hud')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.menu-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Travel' }).click();
    await expect(page.locator('.travel-panel')).toBeVisible();
    await page.screenshot({ path: path.join(ART, '05-travel.png') });
    await page.getByRole('button', { name: 'Close' }).click();

    await page.screenshot({ path: path.join(ART, '06-world-art.png') });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('touch mode chrome', async ({ page }) => {
    await startGame(page);
    await forceMode(page, 'touch');
    await expect(page.locator('.hud')).toHaveAttribute('data-input-mode', 'touch');
    await expect(page.locator('.touch-controls')).toBeVisible();
    await expect(page.locator('.stick-knob')).toBeVisible();
    await page.screenshot({ path: path.join(ART, 'mobile-01-touch.png') });
    await page.locator('.touch-btn.touch-menu').click();
    await expect(page.locator('.menu-panel')).toBeVisible();
    await page.screenshot({ path: path.join(ART, 'mobile-02-menu.png') });
  });

  test('gamepad mode hints and menu nav', async ({ page }) => {
    await startGame(page);
    await forceMode(page, 'gamepad');
    await expect(page.locator('.hud')).toHaveAttribute('data-input-mode', 'gamepad');
    await expect(page.locator('.touch-controls')).toBeHidden();
    await expect(page.locator('.input-hints')).toContainText('Stick');
    await page.screenshot({ path: path.join(ART, 'gamepad-01-play.png') });

    await page.evaluate(() => {
      const edge = (
        window as unknown as {
          __HOUSE_EDGE__: {
            hud: { showMenu: (o: boolean) => void; gamepadNav: (d: string) => void };
            session: { openMenu: () => boolean };
          };
        }
      ).__HOUSE_EDGE__;
      edge.session.openMenu();
      edge.hud.showMenu(true);
      edge.hud.gamepadNav('down');
      edge.hud.gamepadNav('down');
      edge.hud.gamepadNav('confirm');
    });
    await expect(page.locator('.jobs-panel:not([hidden])')).toBeVisible();
    await page.screenshot({ path: path.join(ART, 'gamepad-02-menu-nav.png') });
  });
});
