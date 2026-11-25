import { chromium } from '../node_modules/playwright/index.mjs';
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:43123/');
await page.getByRole('button', { name: 'New Game' }).click();
await page.locator('.world-canvas').click({ position: { x: 48, y: 48 } });
const t0 = Date.now();
const result = await page.evaluate(async () => {
  const he = window.__HOUSE_EDGE__;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let skills = 0,
    dialogueMs = 0,
    bets = 0;
  const MAX = 5000;
  let steps = 0;
  const walkable = (x, y) => {
    const m = he.session.getMap();
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return false;
    return m.tiles[y * m.width + x] !== 'blocked';
  };
  const nextStep = (tx, ty) => {
    const s = he.session.player.getStats();
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const goals = new Set([`${tx},${ty}`]);
    if (!walkable(tx, ty)) {
      goals.clear();
      for (const [dx, dy] of dirs) {
        const ax = tx + dx,
          ay = ty + dy;
        if (walkable(ax, ay)) goals.add(`${ax},${ay}`);
      }
    }
    if (goals.has(`${s.x},${s.y}`)) return null;
    const key = (x, y) => `${x},${y}`;
    const q = [{ x: s.x, y: s.y }];
    const seen = new Set([key(s.x, s.y)]);
    const parent = new Map();
    let found = null;
    while (q.length) {
      const cur = q.shift();
      if (goals.has(key(cur.x, cur.y))) {
        found = cur;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx,
          ny = cur.y + dy,
          k = key(nx, ny);
        if (seen.has(k) || !walkable(nx, ny)) continue;
        seen.add(k);
        parent.set(k, cur);
        q.push({ x: nx, y: ny });
      }
    }
    if (!found) return null;
    let cur = found;
    while (parent.has(key(cur.x, cur.y))) {
      const p = parent.get(key(cur.x, cur.y));
      if (p.x === s.x && p.y === s.y) return [cur.x - s.x, cur.y - s.y];
      cur = p;
    }
    return null;
  };
  const handleModal = async () => {
    if (he.session.ui.is('dialogue')) {
      const lines = he.session.getDialogue?.() || [];
      const wait = Math.max(1400, lines.length * 900);
      dialogueMs += wait;
      await sleep(wait);
      he.session.pickDialogueChoice?.('rita_loud', 'Loud.');
      if (he.session.acceptStoryBet()) {
        await sleep(400);
        if (he.session.ui.is('skill')) {
          // Pace skill phases like a human (~2.5s each phase, duel=3).
          const phases = he.session.getSkillProgress()?.def.phases.length || 1;
          await sleep(phases * 2500);
          he.session.completeSkillPerfect();
          skills += 1;
          await sleep(500);
          return;
        }
        await sleep(1200);
        he.session.confirmBet();
        bets += 1;
        await sleep(600);
        return;
      }
      he.session.closeModal();
      return;
    }
    if (he.session.ui.is('skill')) {
      const phases = he.session.getSkillProgress()?.def.phases.length || 1;
      await sleep(phases * 2500);
      he.session.completeSkillPerfect();
      skills += 1;
      await sleep(500);
      return;
    }
    if (he.session.ui.is('bet')) {
      await sleep(1200);
      he.session.confirmBet();
      bets += 1;
      await sleep(600);
    }
  };
  while (steps < MAX) {
    steps += 1;
    if (he.session.ui.is('ending')) {
      he.session.continueExploring();
      break;
    }
    if (he.session.story.getCompleted().includes('torre-final')) break;
    if (!he.session.ui.is('play')) {
      await handleModal();
      continue;
    }
    const obj = he.session.objective();
    if (obj.targetX === undefined) {
      if (obj.text.startsWith('Broke') || /odd jobs/i.test(obj.text)) {
        he.session.player.addCredits(25);
        continue;
      }
      break;
    }
    const s = he.session.player.getStats();
    const dist = Math.hypot(obj.targetX - s.x, obj.targetY - s.y);
    if (dist <= 1.5 || (he.session.nearbyExit() && dist <= 3)) {
      he.session.interact();
      await sleep(200);
      await handleModal();
      continue;
    }
    const step = nextStep(obj.targetX, obj.targetY);
    if (!step) break;
    he.session.player.setFacing(step[0], step[1]);
    he.session.move(step[0], step[1]);
    await sleep(90); // paced walk
  }
  return {
    ending: he.session.story.getCompleted().includes('torre-final'),
    skills,
    bets,
    dialogueMs,
    steps,
    completed: he.session.story.getCompleted().length,
  };
});
const elapsedSec = (Date.now() - t0) / 1000;
console.log(
  JSON.stringify(
    {
      ...result,
      elapsedSec: +elapsedSec.toFixed(1),
      elapsedMin: +(elapsedSec / 60).toFixed(2),
    },
    null,
    2,
  ),
);
await page.screenshot({ path: '/opt/cursor/artifacts/v113-ending.png' });
await browser.close();
