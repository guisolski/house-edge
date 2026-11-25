/** v1.20.2 — full story on prod preview; Neon Snap uses real KeyD only. */
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
page.setDefaultTimeout(45_000);
await page.goto(BASE);
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForSelector('.play-hud');
const t0 = Date.now();
const stamps = [{ label: 'New Game', ms: 0 }];
const shot = (name) => page.screenshot({ path: path.join(ART, name), fullPage: true });
await shot('v202-01-title-play.png');
const sleep = (ms) => page.waitForTimeout(ms);
const log = (msg) => console.error(`[measure] ${msg} @${Date.now() - t0}ms`);

async function dismissUi() {
  await page.evaluate(() => {
    const s = window.__HOUSE_EDGE__.session;
    if (s.ui.is('ending')) s.continueExploring();
    if (s.ui.is('credits')) {
      try {
        s.continueExploring?.();
      } catch {
        /* ignore */
      }
      s.ui.go('play');
    }
    if (
      !s.ui.is('play') &&
      !s.ui.is('dialogue') &&
      !s.ui.is('skill') &&
      !s.ui.is('bet')
    ) {
      s.ui.go('play');
    }
  });
  if (await page.locator('.btn-closing-continue').count()) {
    await sleep(3100);
    await page
      .locator('.btn-closing-continue')
      .click({ timeout: 5_000 })
      .catch(() => {});
  }
  if (await page.getByRole('button', { name: 'Close' }).count()) {
    await page
      .getByRole('button', { name: 'Close' })
      .first()
      .click({ timeout: 3_000 })
      .catch(() => {});
  }
  if (await page.getByRole('button', { name: 'Skip credits' }).count()) {
    await page
      .getByRole('button', { name: 'Skip credits' })
      .click({ timeout: 3_000 })
      .catch(() => {});
  }
  await dismissUiSoft();
}

async function dismissUiSoft() {
  await page.evaluate(() => {
    const s = window.__HOUSE_EDGE__.session;
    if (s.ui.is('ending')) s.continueExploring();
    if (
      !s.ui.is('play') &&
      !s.ui.is('dialogue') &&
      !s.ui.is('skill') &&
      !s.ui.is('bet')
    ) {
      s.ui.go('play');
    }
  });
}

async function clearNeonSnapReal() {
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 80 } });
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => {
      const s = window.__HOUSE_EDGE__.session;
      return {
        won: Boolean(s.story.getFlag('drone_ok')),
        active: Boolean(s.isStealthActive?.()),
        safe: Boolean(s.isStealthSafe?.()),
        x: s.player.getStats().x,
      };
    });
    if (st.won) {
      log(`Neon Snap cleared at x=${st.x}`);
      return;
    }
    if (!st.active) throw new Error(`stealth dropped during measure (x=${st.x})`);
    if (st.safe) {
      await page.keyboard.down('KeyD');
      await sleep(70);
      await page.keyboard.up('KeyD');
      await sleep(30);
    } else await sleep(70);
  }
  throw new Error('Neon Snap timed out');
}

for (const id of STORY_IDS) {
  log(`beat ${id}`);
  const dest = districtFor(id);
  await dismissUiSoft();
  await page.evaluate(
    ({ beatId, dest }) => {
      const s = window.__HOUSE_EDGE__.session;
      if (s.ui.is('ending')) s.continueExploring();
      if (
        !s.ui.is('play') &&
        !s.ui.is('dialogue') &&
        !s.ui.is('skill') &&
        !s.ui.is('bet')
      ) {
        s.ui.go('play');
      }
      for (const d of ['feira-central', 'avenida-odds', 'torre-casa']) s.world.unlock(d);
      while (s.player.getStats().credits < 40) s.player.addCredits(50);
      s.player.setDistrict(dest);
      s.runStoryBeat(beatId);
    },
    { beatId: id, dest },
  );
  stamps.push({ label: id, ms: Date.now() - t0 });
  await sleep(60);

  if (await page.locator('.dialogue-choice').count()) {
    await sleep(550);
    await page
      .locator('.dialogue-choice')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
    await sleep(80);
  }

  if (id === 'avenida-drone') {
    if (await page.locator('.btn-take-bet').count()) {
      await page.locator('.btn-take-bet').click({ timeout: 5_000 });
    } else {
      await page.evaluate(() => window.__HOUSE_EDGE__.session.acceptStoryBet());
    }
    await page.evaluate(() => window.__HOUSE_EDGE__.hud.showHud());
    await clearNeonSnapReal();
    await shot('v202-neon-snap-cleared-prod.png');
    continue;
  }

  if (await page.locator('.btn-take-bet').count()) {
    await page
      .locator('.btn-take-bet')
      .click({ timeout: 5_000 })
      .catch(() => {});
    await sleep(80);
  }

  await page.evaluate(() => {
    const s = window.__HOUSE_EDGE__.session;
    if (s.getSkillProgress?.() || s.getStealthProgress?.()) {
      s.completeSkillPerfect?.();
      s.noteInteractRelease?.();
    }
  });

  // Don't block on closing for non-epilogue beats — dismiss if present.
  if (id !== 'epilogue-laje') {
    if (await page.locator('.btn-closing-continue').count()) {
      await sleep(3100);
      await page
        .locator('.btn-closing-continue')
        .click({ timeout: 5_000 })
        .catch(() => {});
    } else if (await page.getByRole('button', { name: 'Close' }).count()) {
      await page
        .getByRole('button', { name: 'Close' })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {});
    }
    if (await page.getByRole('button', { name: 'Skip credits' }).count()) {
      await page
        .getByRole('button', { name: 'Skip credits' })
        .click({ timeout: 3_000 })
        .catch(() => {});
    }
  }
  await sleep(40);
}

// Explicit epilogue closing shot (force clean state)
log('epilogue closing shot');
await page.evaluate(() => {
  const s = window.__HOUSE_EDGE__.session;
  if (s.ui.is('ending')) s.continueExploring();
  s.story.setFlag('casa_quebrada', true);
  s.player.setDistrict('morro-neon');
  s.player.setPosition(14, 16);
  s.ui.go('play');
  s.runStoryBeat('epilogue-laje');
});
await page.waitForSelector('.dialogue-choice', { timeout: 10_000 });
await sleep(600);
await page.locator('.dialogue-choice').first().click();
await page.waitForSelector('.dialogue-closing-line', { timeout: 10_000 });
await shot('v202-epilogue-closing-line-prod.png');
await sleep(3100);
await page.locator('.btn-closing-continue').click({ timeout: 10_000 });
await page.waitForSelector('.credits-line', { timeout: 10_000 });
await shot('v202-credits-prod.png');

const totalMs = Date.now() - t0;
const report = {
  version: '1.20.2',
  base: BASE,
  totalMs,
  totalMin: +(totalMs / 60000).toFixed(2),
  stamps,
  note: 'Full story on prod; Neon Snap cleared with real KeyD (no completeSkillPerfect).',
};
fs.writeFileSync(path.join(ART, 'v202-timing.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
