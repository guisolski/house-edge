import { test, expect } from '@playwright/test';

test('Skip credits closes the roll (Enter/E/Space/click)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: { setFlag: (f: string, v: boolean) => void };
            ui: { go: (s: string) => boolean };
          };
          hud: { showCreditsRoll: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('casa_quebrada', true);
    he.session.story.setFlag('epilogue_done', true);
    he.session.ui.go('ending');
    he.hud.showCreditsRoll();
  });

  const skip = page.getByRole('button', { name: 'Skip credits' });
  await expect(skip).toBeVisible();
  await expect(page.locator('.ending-panel.ending-credits')).toBeVisible();

  // Click path (also covered by keyboard focus+Enter below in a second assert).
  await skip.click();
  await expect(page.locator('.ending-panel')).toBeHidden();
  await expect(page.locator('.play-hud')).toBeVisible();

  // Re-open and dismiss with Enter on the focused Skip button.
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { ui: { go: (s: string) => boolean } };
          hud: { showCreditsRoll: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.ui.go('ending');
    he.hud.showCreditsRoll();
  });
  await expect(skip).toBeVisible();
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ending-panel')).toBeHidden();
  await expect(page.locator('.play-hud')).toBeVisible();
});

test('document title matches package version after load', async ({ page }) => {
  await page.goto('/');
  const version = await page.locator('.version').innerText();
  const title = await page.title();
  expect(title).toMatch(/House Edge v\d+\.\d+\.\d+/);
  expect(title).toContain(version.replace(/^v/, 'v') === version ? version : version);
  // .version is "v1.16.0"; title is "House Edge v1.16.0"
  expect(title).toBe(`House Edge ${version}`);
});
