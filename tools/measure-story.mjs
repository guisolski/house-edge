import { chromium } from '../node_modules/playwright/index.mjs';

const beats = [
  'boteco-nair',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-catador',
  'bia-set',
  'feira-forro',
  'feira-radio',
  'feira-tipster',
  'feira-courier',
  'prova-luna',
  'avenida-twist',
  'avenida-checkpoint',
  'avenida-influencer',
  'avenida-radar',
  'avenida-atm',
  'lobby-margin',
  'morro-return-nair',
  'torre-foyer',
  'torre-pit',
  'torre-elevator',
  'torre-vip',
  'torre-final',
  'epilogue-laje',
];

const districts = {
  'boteco-nair': 'morro-neon',
  'morro-antena': 'morro-neon',
  'luna-beco': 'morro-neon',
  'morro-fios': 'morro-neon',
  'seu-ze-banca': 'morro-neon',
  'feira-kiko': 'feira-central',
  'feira-catador': 'feira-central',
  'bia-set': 'feira-central',
  'feira-forro': 'feira-central',
  'feira-radio': 'feira-central',
  'feira-tipster': 'feira-central',
  'feira-courier': 'feira-central',
  'prova-luna': 'feira-central',
  'avenida-twist': 'avenida-odds',
  'avenida-checkpoint': 'avenida-odds',
  'avenida-influencer': 'avenida-odds',
  'avenida-radar': 'avenida-odds',
  'avenida-atm': 'avenida-odds',
  'lobby-margin': 'avenida-odds',
  'morro-return-nair': 'morro-neon',
  'torre-foyer': 'torre-casa',
  'torre-pit': 'torre-casa',
  'torre-elevator': 'torre-casa',
  'torre-vip': 'torre-casa',
  'torre-final': 'torre-casa',
  'epilogue-laje': 'morro-neon',
};

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:43123/');
await page.getByRole('button', { name: 'New Game' }).click();
await page.locator('.world-canvas').click({ position: { x: 48, y: 48 } });
const t0 = Date.now();
const result = await page.evaluate(
  async ({ beats, districts }) => {
    const he = window.__HOUSE_EDGE__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let lines = 0;
    let bets = 0;
    let safe = 0;
    const go = (d) => {
      if (
        he.session.player.getStats().districtId !== d &&
        he.session.world.isUnlocked(d)
      ) {
        he.session.travelTo(d);
      }
    };
    for (const id of beats) {
      if (he.session.ui.is('ending')) he.session.continueExploring();
      go(districts[id]);
      await sleep(700);
      for (let a = 0; a < 40; a++) {
        while (he.session.player.getStats().credits < 15 && safe < 200) {
          const before = he.session.player.getStats().credits;
          he.session.doSafeJob(`safe-${he.session.player.getStats().districtId}`);
          if (he.session.player.getStats().credits === before) {
            he.session.player.addCredits(25);
          }
          safe++;
          await sleep(180);
        }
        if (!he.session.runStoryBeat(id)) break;
        const dlg = he.session.getDialogue?.() || [];
        lines += dlg.length;
        await sleep(Math.max(1100, dlg.length * 850));
        if (!he.session.acceptStoryBet()) {
          he.session.closeModal();
          if (he.session.story.getCompleted().includes(id)) break;
          continue;
        }
        await sleep(2200);
        he.session.confirmBet();
        bets++;
        await sleep(700);
        if (he.session.story.getCompleted().includes(id)) break;
      }
    }
    if (he.session.ui.is('ending')) he.session.continueExploring();
    return {
      ending: he.session.story.getCompleted().includes('torre-final'),
      epilogue: he.session.story.getCompleted().includes('epilogue-laje'),
      lines,
      bets,
      safe,
      objective: he.session.objective().text,
    };
  },
  { beats, districts },
);
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
await browser.close();
