import { test, expect } from '@playwright/test';

async function openFeiraLockbox(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
            pickDialogueChoice: (id: string, label: string) => void;
            acceptStoryBet: () => boolean;
            player: { addCredits: (n: number) => void };
            skipTutorialNow: () => void;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.skipTutorialNow();
    he.session.player.addCredits(200);
    he.session.world.unlock('feira-central');
    he.session.travelTo('feira-central');
    he.session.story.setFlag('forro_ok', true);
    he.session.runStoryBeat('feira-lockbox');
    he.session.pickDialogueChoice('lockbox_for_hill', 'ok');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });

  await expect(page.locator('.lockpick-pin').first()).toBeVisible({ timeout: 8_000 });
  // Keep touch chrome from eating pin clicks on some viewports.
  await page.evaluate(() => {
    const touch = document.querySelector('.touch-controls') as HTMLElement | null;
    if (touch) touch.style.display = 'none';
  });
}

/** Pins for feira-lockbox: [1, 2, 0] — raise left once, middle twice. */
async function setCorrectPins(page: import('@playwright/test').Page): Promise<void> {
  const pins = page.locator('.lockpick-pin');
  await pins.nth(0).click({ force: true });
  await pins.nth(1).click({ force: true });
  await pins.nth(1).click({ force: true });
}

/** Playtest #21: keyboard-only lockpick submit (Enter on pin / Tab). */
test('lockpick Enter on pin submits', async ({ page }) => {
  await openFeiraLockbox(page);
  await setCorrectPins(page);
  const pin = page.locator('.lockpick-pin').first();
  await pin.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lockpick-pin')).toHaveCount(0, { timeout: 5_000 });
});

test('lockpick Tab submits', async ({ page }) => {
  await openFeiraLockbox(page);
  await setCorrectPins(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.lockpick-pin')).toHaveCount(0, { timeout: 5_000 });
});
