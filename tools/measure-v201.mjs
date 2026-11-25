/** v1.20.1 — prod preview screenshots + paced story timing. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ART = path.join(root, 'artifacts/playtest');
fs.mkdirSync(ART, { recursive: true });

const BASE = process.env.MEASURE_BASE || 'http://127.0.0.1:43126/';

const STORY_IDS = [
  'boteco-nair',
  'side-morro-copper',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-catador',
  'bia-set',
  'feira-dancer',
  'feira-forro',
  'feira-lockbox',
  'feira-radio',
  'feira-tipster',
  'feira-courier',
  'prova-luna',
  'avenida-twist',
  'avenida-checkpoint',
  'avenida-courier',
  'avenida-influencer',
  'avenida-drone',
  'avenida-radar',
  'avenida-server',
  'avenida-atm',
  'avenida-stealth',
  'avenida-betrayal',
  'lobby-margin',
  'morro-return-nair',
  'morro-return-fio',
  'torre-foyer',
  'torre-pit',
  'torre-elevator',
  'torre-vip',
  'torre-negotiate',
  'torre-final',
  'epilogue-laje',
];

function districtFor(id) {
  if (id.startsWith('feira') || id === 'prova-luna' || id === 'bia-set')
    return 'feira-central';
  if (id.startsWith('avenida') || id === 'lobby-margin') return 'avenida-odds';
  if (id.startsWith('torre')) return 'torre-casa';
  return 'morro-neon';
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120_000);
await page.goto(BASE);
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForSelector('.play-hud');

const t0 = Date.now();
const stamps = [{ label: 'New Game', iso: new Date(t0).toISOString(), ms: 0 }];
const shot = async (name) => page.screenshot({ path: path.join(ART, name) });
await shot('v201-01-title-play.png');

const sleep = (ms) => page.waitForTimeout(ms);

for (const id of STORY_IDS) {
  const step = await page.evaluate(
    ({ beatId, dest }) => {
      const he = window.__HOUSE_EDGE__;
      if (he.session.ui.is('ending')) he.session.continueExploring();
      if (
        !he.session.ui.is('play') &&
        !he.session.ui.is('dialogue') &&
        !he.session.ui.is('skill') &&
        !he.session.ui.is('bet')
      ) {
        he.session.ui.go('play');
      }
      for (const d of ['feira-central', 'avenida-odds', 'torre-casa']) {
        he.session.world.unlock(d);
      }
      he.session.player.setDistrict(dest);
      const ok = he.session.runStoryBeat(beatId);
      return { ok, beatId, dest, ui: he.session.ui.screen };
    },
    { beatId: id, dest: districtFor(id) },
  );
  stamps.push({
    label: id,
    ok: step.ok,
    ui: step.ui,
    ms: Date.now() - t0,
  });
  if (!step.ok) continue;

  await sleep(80);
  if (await page.locator('.dialogue-choice').count()) {
    await sleep(550);
    await page.locator('.dialogue-choice').first().click();
    await sleep(120);
  }
  if (await page.locator('.btn-take-bet').count()) {
    await page.locator('.btn-take-bet').click();
    await sleep(100);
  }
  // Skills / stealth: auto-clear
  await page.evaluate(() => {
    const s = window.__HOUSE_EDGE__.session;
    if (s.getSkillProgress?.() || s.getStealthProgress?.()) {
      s.completeSkillPerfect?.();
      s.noteInteractRelease?.();
    }
  });
  const closing = page.locator('.btn-closing-continue');
  if (await closing.count()) {
    await sleep(3100);
    await closing.click();
  } else if (await page.getByRole('button', { name: 'Close' }).count()) {
    await page.getByRole('button', { name: 'Close' }).first().click();
  }
  await sleep(60);
}

// Explicit epilogue closing screenshot on prod build
await page.evaluate(() => {
  const s = window.__HOUSE_EDGE__.session;
  if (s.ui.is('ending')) s.continueExploring();
  s.story.setFlag('casa_quebrada', true);
  s.player.setDistrict('morro-neon');
  s.player.setPosition(14, 16);
  s.runStoryBeat('epilogue-laje');
});
await page.waitForSelector('.dialogue-choice');
await sleep(600);
await page.locator('.dialogue-choice').first().click();
await page.waitForSelector('.dialogue-closing-line');
await shot('v201-epilogue-closing-line-prod.png');
await sleep(3100);
await page.locator('.btn-closing-continue').click();
await page.waitForSelector('.credits-line');
await shot('v201-credits-prod.png');

const totalMs = Date.now() - t0;
const report = {
  version: '1.20.1',
  base: BASE,
  totalMs,
  totalMin: +(totalMs / 60000).toFixed(2),
  stamps,
  note: 'Paced scripted beats (not human walking). Human playtest #23 walking ~29 min on v1.20.0.',
};
fs.writeFileSync(path.join(ART, 'v201-timing.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
