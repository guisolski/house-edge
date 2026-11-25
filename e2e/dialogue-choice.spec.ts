import { test, expect } from '@playwright/test';

test('dialogue choices: post-arm Enter activates option 1', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  // Walk to Dona Nair and open first story dialogue with choices.
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            npcs: { id: string; x: number; y: number }[];
            player: { setPosition: (x: number, y: number) => void };
            interact: () => boolean;
          };
        };
      }
    ).__HOUSE_EDGE__;
    const nair = he.session.npcs.find((n) => n.id === 'dona-nair')!;
    he.session.player.setPosition(nair.x, nair.y);
    he.session.interact();
  });

  const panel = page.locator('.dialogue-panel');
  await expect(panel).toBeVisible();
  const choices = panel.locator('button.dialogue-choice');
  await expect(choices).toHaveCount(2);
  // Playtest #32: no default focus at open — mash Enter must not pick option 1.
  await expect(choices.nth(0)).not.toBeFocused();

  // Playtest #34: after arm, option 1 focused — fresh Enter activates without Tab.
  await page.waitForTimeout(500);
  await expect(choices.nth(0)).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(panel.locator('button.dialogue-choice')).toHaveCount(0);
  await expect(panel).toContainText(/Take the bet|Style|Quiet|Estilo|Baixo/i);
  await expect(
    panel.getByRole('button', { name: /Take the bet|Aceitar/i }),
  ).toBeVisible();

  const loud = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: { session: { story: { getFlag: (f: string) => boolean } } };
      }
    ).__HOUSE_EDGE__;
    return he.session.story.getFlag('rita_loud');
  });
  expect(loud).toBe(true);
});
