import { test, expect } from '@playwright/test';

test('prod: spawn shows E prompt near Dona Nair', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.waitForTimeout(200);
  const prompt = page.locator('.interact-prompt');
  await expect(prompt).toBeVisible();
  // Playtest #36: chip is short "E"; name lives on the canvas nameplate.
  await expect(prompt).toHaveText(/^E$/);
  const near = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { nearbyNpc: () => { id: string; name: string } | null };
        };
      }
    ).__HOUSE_EDGE__;
    const n = he.session.nearbyNpc();
    return n ? { id: n.id, name: n.name } : null;
  });
  expect(near?.id).toMatch(/nair/i);
});
