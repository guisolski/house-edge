import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest/v122');
const OUT = '/opt/cursor/artifacts';
fs.mkdirSync(ART, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/local/bin/google-chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:43123/');
await page.waitForTimeout(500);
const pt = page.getByRole('button', { name: /Português|pt-BR|BR/i });
if (await pt.count()) await pt.first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(ART, 'title-pt-BR.png') });
await page.getByRole('button', { name: /Novo jogo|New Game/i }).click();
await page.waitForSelector('.play-hud');
await page.evaluate(() => {
  const he = /** @type {any} */ (window).__HOUSE_EDGE__;
  he?.forceTutorial?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(ART, 'tutorial.png') });
await page.evaluate(() => {
  const he = /** @type {any} */ (window).__HOUSE_EDGE__;
  he?.skipTutorial?.();
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const he = /** @type {any} */ (window).__HOUSE_EDGE__;
  const s = he.session;
  const nair = s.npcs.find((n) => n.id === 'dona-nair');
  s.player.setPosition(nair.x, nair.y);
  s.interact();
});
await page.waitForSelector('.dialogue-body', { timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(ART, 'nair-dialog-pt-BR.png') });
await page.evaluate(() => {
  const he = /** @type {any} */ (window).__HOUSE_EDGE__;
  he.session.closeModal();
  he.session.world.unlock('feira-central');
  he.session.player.setDistrict('feira-central');
  he.session.player.setPosition(18, 12);
  he.hud?.showHud?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(ART, 'after-district-fair.png') });
await page.evaluate(() => {
  const he = /** @type {any} */ (window).__HOUSE_EDGE__;
  he.session.player.setDistrict('morro-neon');
  he.session.player.setPosition(14, 16);
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(ART, 'after-scale-morro.png') });
const files = [
  'before-scale-morro.png',
  'after-scale-morro.png',
  'before-district-fair.png',
  'after-district-fair.png',
  'tutorial.png',
  'title-pt-BR.png',
  'nair-dialog-pt-BR.png',
  'walk-strip-right-4x.png',
  'walk-cycle-right.gif',
];
for (const f of files) {
  const src = path.join(ART, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, `v122-${f}`));
}
console.log('ok', files.filter((f) => fs.existsSync(path.join(ART, f))).join(', '));
await browser.close();
