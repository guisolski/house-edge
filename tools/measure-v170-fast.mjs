/** Compact paced timing for REPORT (dialogue @ ~220 wpm, short skill thinks). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ART = path.resolve('artifacts/playtest');
fs.mkdirSync(ART, { recursive: true });
const beats = JSON.parse(fs.readFileSync('/tmp/beats.json', 'utf8'));

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
page.setDefaultTimeout(60_000);
await page.goto('http://127.0.0.1:43123/');
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForSelector('.play-hud');
const t0 = Date.now();
const stamps = [{ label: 'New Game', iso: new Date(t0).toISOString(), ms: 0 }];
const sleep = (ms) => page.waitForTimeout(ms);

for (const id of beats) {
  const step = await page.evaluate(
    ({ beatId, dest }) => {
      const he = window.__HOUSE_EDGE__;
      if (he.session.ui.is('ending')) he.session.continueExploring();
      if (he.session.ui.is('transition')) he.session.ui.go('play');
      if (
        he.session.player.getStats().districtId !== dest &&
        he.session.world.isUnlocked(dest)
      ) {
        he.session.travelTo(dest);
      }
      while (he.session.player.getStats().credits < 15) {
        he.session.player.addCredits(25);
      }
      if (!he.session.runStoryBeat(beatId)) return { ok: false, words: 0 };
      const dlg = he.session.getDialogue?.() || [];
      const words = dlg.reduce(
        (n, l) =>
          n +
          String(l.text || '')
            .split(/\s+/)
            .filter(Boolean).length,
        0,
      );
      return { ok: true, words };
    },
    { beatId: id, dest: districtFor(id) },
  );
  if (!step.ok) continue;
  await sleep(
    Math.min(4500, Math.max(900, Math.round((step.words / 220) * 60_000) + 400)),
  );
  await page.evaluate(() =>
    window.__HOUSE_EDGE__.session.pickDialogueChoice?.('rita_loud', 'Loud.'),
  );
  if (id === 'epilogue-laje') await sleep(2800);
  else await sleep(250);
  const kind = await page.evaluate(() => {
    const he = window.__HOUSE_EDGE__;
    if (!he.session.acceptStoryBet()) {
      he.session.closeModal();
      return null;
    }
    if (he.session.isStealthActive?.()) return 'stealth';
    if (he.session.ui.is('skill'))
      return he.session.getSkillProgress()?.def?.kind ?? 'skill';
    he.session.confirmBet();
    return 'bet';
  });
  if (kind && kind !== 'bet') {
    await sleep(kind === 'stealth' ? 4000 : kind === 'lockpick' ? 3500 : 1500);
    await page.evaluate(() => window.__HOUSE_EDGE__.session.completeSkillPerfect());
    await page.evaluate(async () => {
      const he = window.__HOUSE_EDGE__;
      for (let i = 0; i < 15 && he.session.ui.is('transition'); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (he.session.ui.is('transition')) he.session.ui.go('play');
    });
  }
  stamps.push({ label: id, iso: new Date().toISOString(), ms: Date.now() - t0 });
}

const tEnd = Date.now();
stamps.push({ label: 'Ending wall', iso: new Date(tEnd).toISOString(), ms: tEnd - t0 });
await page.screenshot({ path: path.join(ART, 'v17-02-after-story.png') });
const completed = await page.evaluate(() =>
  window.__HOUSE_EDGE__.session.story.getCompleted(),
);
const fps = await page.evaluate(async () => {
  const he = window.__HOUSE_EDGE__;
  he.setShowFps(true);
  he.session.ui.go('play');
  he.session.travelTo('morro-neon');
  await new Promise((r) => setTimeout(r, 200));
  he.session.travelTo('feira-central');
  await new Promise((r) => setTimeout(r, 700));
  he.session.travelTo('avenida-odds');
  await new Promise((r) => setTimeout(r, 700));
  const samples = [];
  for (let i = 0; i < 40; i++) {
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
await page.screenshot({ path: path.join(ART, 'v17-07-fps-travel.png') });
await browser.close();
const wallSec = Math.round((tEnd - t0) / 1000);
const report = {
  documentTitle: 'House Edge v1.17.0',
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
fs.writeFileSync(path.join(ART, 'v17-timing.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
