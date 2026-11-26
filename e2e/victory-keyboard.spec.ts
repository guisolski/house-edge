/**
 * Playtest #34: victory modal dismisses with keyboard only (no mouse).
 */
import { test, expect } from '@playwright/test';

async function openVictory(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            ui: { go: (s: string) => boolean; is: (s: string) => boolean };
          };
          hud: { showEnding: (t: string) => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.ui.go('ending');
    he.hud.showEnding('A Casa cai. A mesa é sua.');
  });
  await expect(page.locator('.ending-panel')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Continuar explorando|Continue exploring/i }),
  ).toBeVisible();
}

test('victory Continuar explorando dismisses with Enter', async ({ page }) => {
  await openVictory(page);
  const cont = page.getByRole('button', {
    name: /Continuar explorando|Continue exploring/i,
  });
  await expect(cont).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ending-panel')).toBeHidden({ timeout: 5_000 });
  await expect(page.locator('.play-hud')).toBeVisible();
});

test('victory Esc = Continuar explorando', async ({ page }) => {
  await openVictory(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ending-panel')).toBeHidden({ timeout: 5_000 });
  await expect(page.locator('.play-hud')).toBeVisible();
});

test('victory Space dismisses Continuar explorando', async ({ page }) => {
  await openVictory(page);
  const cont = page.getByRole('button', {
    name: /Continuar explorando|Continue exploring/i,
  });
  await expect(cont).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.ending-panel')).toBeHidden({ timeout: 5_000 });
  await expect(page.locator('.play-hud')).toBeVisible();
});
