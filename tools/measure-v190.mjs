/** Paced New Game → ending timing with screenshots (v1.19.0). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ART = path.join(root, 'artifacts/playtest');
fs.mkdirSync(ART, { recursive: true });

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
await page.goto('http://127.0.0.1:43123/');
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForSelector('.play-hud');

const t0 = Date.now();
const stamps = [{ label: 'New Game', iso: new Date(t0).toISOString(), ms: 0 }];
const shot = async (name) => page.screenshot({ path: path.join(ART, name) });
await shot('v19-01-title-play.png');

const sleep = (ms) => page.waitForTimeout(ms);

for (const id of STORY_IDS) {
  const step = await page.evaluate(
    ({ beatId, dest }) => {
      const he = window.__HOUSE_EDGE__;
      if (he.session.ui.is('ending')) he.session.continueExploring();
      if (
        he.session.player.getStats().districtId !== dest &&
        he.session.world.isUnlocked(dest)
      ) {
        he.session.travelTo(dest);
      }
      while (he.session.player.getStats().credits < 15) {
        he.session.doSafeJob(`safe-${he.session.player.getStats().districtId}`);
        if (he.session.player.getStats().credits < 15) he.session.player.addCredits(25);
      }
      if (!he.session.runStoryBeat(beatId)) {
        return { ok: false, reason: 'unavailable', words: 0, skill: null };
      }
      const dlg = he.session.getDialogue?.() || [];
      const words = dlg.reduce(
        (n, l) =>
          n +
          String(l.text || '')
            .split(/\s+/)
            .filter(Boolean).length,
        0,
      );
      return { ok: true, words, skill: null };
    },
    { beatId: id, dest: districtFor(id) },
  );
  if (!step.ok) continue;

  // Reading delay @ ~220 wpm + choice think.
  await sleep(
    Math.min(10_000, Math.max(1_600, Math.round((step.words / 220) * 60_000) + 700)),
  );
  await page.evaluate(() => {
    window.__HOUSE_EDGE__.session.pickDialogueChoice?.('rita_loud', 'Loud it is.');
  });
  await sleep(450);

  const bet = await page.evaluate(() => {
    const he = window.__HOUSE_EDGE__;
    if (!he.session.acceptStoryBet()) {
      he.session.closeModal();
      return { skill: false, kind: null, done: he.session.story.getCompleted() };
    }
    if (he.session.ui.is('skill') || he.session.isStealthActive?.()) {
      return {
        skill: true,
        kind: he.session.isStealthActive?.()
          ? 'stealth'
          : (he.session.getSkillProgress()?.def?.kind ?? 'timing'),
        done: he.session.story.getCompleted(),
      };
    }
    he.session.confirmBet();
    return { skill: false, kind: null, done: he.session.story.getCompleted() };
  });

  const stealth = await page.evaluate(() =>
    Boolean(window.__HOUSE_EDGE__.session.isStealthActive?.()),
  );
  if (bet.skill || stealth) {
    const skillMs = stealth
      ? 8_000
      : bet.kind === 'lockpick'
        ? 12_000
        : bet.kind === 'negotiate'
          ? 7_000
          : bet.kind === 'evade' || bet.kind === 'chase' || bet.kind === 'hack'
            ? 8_000
            : bet.kind === 'duel'
              ? 16_000
              : 4_500;
    await sleep(skillMs);
    await page.evaluate(() => window.__HOUSE_EDGE__.session.completeSkillPerfect());
    await sleep(350);
    // Elevator fade holds transition ~1.1s.
    await page.evaluate(async () => {
      const he = window.__HOUSE_EDGE__;
      for (let i = 0; i < 20 && he.session.ui.is('transition'); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
    });
  } else {
    await sleep(800);
  }

  stamps.push({
    label: id,
    iso: new Date().toISOString(),
    ms: Date.now() - t0,
  });
}

const tEnd = Date.now();
stamps.push({ label: 'Ending wall', iso: new Date(tEnd).toISOString(), ms: tEnd - t0 });
await shot('v19-02-after-story.png');

await page.evaluate(() => {
  const he = window.__HOUSE_EDGE__;
  he.session.ui.go('ending');
  he.hud.showCreditsRoll();
});
await sleep(300);
await shot('v19-03-credits-skip.png');
await page.getByRole('button', { name: 'Skip credits' }).click();
await sleep(200);

await page.evaluate(() => {
  const he = window.__HOUSE_EDGE__;
  he.session.ui.go('play');
  he.session.world.unlock('feira-central');
  he.session.travelTo('feira-central');
  he.session.story.setFlag('forro_ok', true);
  he.session.runStoryBeat('feira-lockbox');
  he.session.pickDialogueChoice('lockbox_for_hill', 'ok');
  he.session.acceptStoryBet();
});
await sleep(400);
await shot('v19-04-lockpick-tension.png');

await page.evaluate(() => {
  const he = window.__HOUSE_EDGE__;
  he.session.cancelBet();
  he.session.ui.go('play');
  he.session.world.unlock('avenida-odds');
  he.session.travelTo('avenida-odds');
  he.session.story.setFlag('influencer_ok', true);
  he.session.runStoryBeat('avenida-drone');
  he.session.pickDialogueChoice('drone_low', 'ok');
  he.session.acceptStoryBet();
});
await sleep(600);
await shot('v19-05-drone-stealth.png');

await page.evaluate(() => {
  const he = window.__HOUSE_EDGE__;
  he.session.cancelBet();
  he.session.ui.go('play');
  he.session.world.unlock('torre-casa');
  he.session.travelTo('torre-casa');
  he.session.story.setFlag('vip_ok', true);
  he.session.runStoryBeat('torre-negotiate');
  he.session.pickDialogueChoice('neg_mirror', 'ok');
  he.session.acceptStoryBet();
});
await sleep(400);
await shot('v19-06-negotiate.png');

const title = await page.title();
const version = await page
  .locator('.version')
  .innerText()
  .catch(() => 'v1.19.0');
const completed = await page.evaluate(() =>
  window.__HOUSE_EDGE__.session.story.getCompleted(),
);

const fps = await page.evaluate(async () => {
  const he = window.__HOUSE_EDGE__;
  he.setShowFps(true);
  he.session.cancelBet();
  he.session.ui.go('play');
  he.session.travelTo('morro-neon');
  await new Promise((r) => setTimeout(r, 200));
  he.session.travelTo('feira-central');
  await new Promise((r) => setTimeout(r, 900));
  he.session.travelTo('avenida-odds');
  await new Promise((r) => setTimeout(r, 900));
  const samples = [];
  for (let i = 0; i < 50; i++) {
    const s = he.getFps();
    samples.push(s?.avgFps ?? s?.fps ?? 0);
    await new Promise((r) => setTimeout(r, 40));
  }
  const ok = samples.filter((n) => n > 0);
  return {
    min: Math.min(...ok),
    avg: ok.reduce((a, b) => a + b, 0) / Math.max(1, ok.length),
  };
});
await shot('v19-07-fps-travel.png');

await browser.close();

const wallSec = Math.round((tEnd - t0) / 1000);
const report = {
  documentTitle: title,
  uiVersion: version,
  newGameIso: stamps[0].iso,
  endingIso: new Date(tEnd).toISOString(),
  wallClockMs: tEnd - t0,
  wallClock: `${Math.floor(wallSec / 60)}:${String(wallSec % 60).padStart(2, '0')}`,
  ending: completed.includes('torre-final'),
  epilogue: completed.includes('epilogue-laje'),
  drone: completed.includes('avenida-drone'),
  negotiate: completed.includes('torre-negotiate'),
  beatsStamped: stamps.length - 2,
  fps,
  completedCount: completed.length,
  stamps,
};
fs.writeFileSync(path.join(ART, 'v19-timing.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
