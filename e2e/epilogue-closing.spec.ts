import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

test('epilogue closing line is visible in the viewport before credits', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
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
            story: {
              setFlag: (f: string, v: boolean) => void;
              completeBeat: (id: string) => unknown;
            };
            runStoryBeat: (id: string) => boolean;
            pickDialogueChoice: (id: string, reply: string) => void;
            getPendingStoryBeat: () => string | null;
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(50);
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) {
      s.world.unlock(id);
    }
    s.story.setFlag('casa_quebrada', true);
    s.player.setDistrict('morro-neon');
    s.player.setPosition(14, 16);
    s.runStoryBeat('epilogue-laje');
  });

  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  // Epilogue arms choices for ~500ms so Enter doesn't skip the beat.
  await page.waitForTimeout(600);
  await page.locator('.dialogue-choice').first().click();

  const closing = page.locator('.dialogue-closing-line');
  await expect(closing).toBeVisible();
  await expect(closing).toContainText(/Saúde/i);

  // Must be in the viewport (not below the fold of the scroll box).
  const inView = await closing.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
  });
  expect(inView).toBe(true);

  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(ART, 'v201-epilogue-closing-line.png'),
    fullPage: true,
  });

  // Close stays disabled until the hold ends — credits must NOT auto-open.
  await page.waitForTimeout(500);
  await expect(page.locator('.credits-roll, .ending-panel .credits-line')).toHaveCount(0);
  const closeBtn = page.locator('.btn-closing-continue');
  await expect(closeBtn).toBeDisabled();
  await expect(closeBtn).toBeEnabled({ timeout: 4000 });
  await closeBtn.click();
  await expect(page.locator('.credits-line').first()).toBeVisible({ timeout: 3000 });
});
