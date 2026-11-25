/**
 * Playtest #28: full-story pt-BR walk — scan HUD/dialog/bet/credits/signs/NPC
 * tags for English leftovers (not only district 1).
 */
import { test, expect } from '@playwright/test';

const ENGLISH_BLOCKLIST = [
  'WASD move ·',
  'Stake at risk',
  'Green zone',
  'Ready to roll',
  'Win chance',
  'Nobody in range',
  'Missed the pour',
  'Stop!',
  'Esc cancels',
  'Take the bet',
  'Walk away',
  'New Game',
  'Side Jobs',
  'Upgrades',
  'Ice-cold water',
  'Street pixo',
  'Travel to Central',
  'Built with Excalibur',
  'Skip anytime',
  'Onboarding timing',
  'Almost clean',
  'The house takes its cut',
  'Rita Odds — timed',
  'Stage Hand',
  'Radio Pirate',
  'Mole Contact',
  'Cage Runner',
  'VIP SALON',
  'POLICE LINE',
  'CENTRAL FAIR',
  'PIT FLOOR',
  'Use Elevator',
  'The credits roll for everyone',
  'honest ice, open laje',
];

const STORY_BEATS = [
  'boteco-nair',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-tipster',
  'prova-luna',
  'avenida-twist',
  'lobby-margin',
  'torre-foyer',
  'torre-pit',
  'torre-elevator',
  'torre-vip',
  'torre-final',
  'epilogue-laje',
];

test('pt-BR full story walk: no English leftovers in panels/HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Português (Brasil)' }).click();
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const blob = await page.evaluate((beats: string[]) => {
    type HeSession = {
      world: { unlock: (id: string) => boolean };
      player: { addCredits: (n: number) => void; setDistrict: (id: string) => void };
      ui: { is: (s: string) => boolean };
      runStoryBeat: (id: string) => boolean;
      pickDialogueChoice?: () => void;
      hasPendingStoryBet?: () => boolean;
      cancelBet?: () => void;
      closeModal?: () => void;
      offerBet: (id: string) => boolean;
      story: { setFlag: (f: string, v: boolean) => void };
    };
    const he = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__;
    const s = he.session;
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) s.world.unlock(id);
    s.player.addCredits(500);
    const chunks: string[] = [];
    const scrape = (): void => {
      const nodes = [
        ...document.querySelectorAll(
          '.play-hud, .input-hints, .objective, .dialogue-panel, .toast, .tutorial-panel, .bet-panel, .skill-panel, .credits-roll, .interact-prompt, .npc-tag, .ending-panel',
        ),
      ];
      chunks.push(nodes.map((n) => n.textContent ?? '').join('\n'));
    };
    scrape();
    for (const beat of beats) {
      try {
        s.runStoryBeat(beat);
        scrape();
        if (s.ui.is('dialogue')) {
          s.pickDialogueChoice?.();
          scrape();
        }
        if (s.hasPendingStoryBet?.() || s.ui.is('bet')) {
          scrape();
          s.cancelBet?.();
        }
        s.closeModal?.();
      } catch {
        /* beat may require flags — scrape what we can */
      }
    }
    // Non-objective bet panel (pixo)
    try {
      s.player.setDistrict('avenida-odds');
      s.offerBet('pixo-challenge');
      scrape();
      s.cancelBet?.();
    } catch {
      /* ignore */
    }
    // Credits
    try {
      s.story.setFlag('casa_quebrada', true);
      s.runStoryBeat('epilogue-laje');
      scrape();
    } catch {
      /* ignore */
    }
    return chunks.join('\n---\n');
  }, STORY_BEATS);

  const hits = ENGLISH_BLOCKLIST.filter((w) => blob.includes(w));
  expect(hits, `English leftovers in pt-BR UI:\n${blob.slice(0, 2000)}`).toEqual([]);
});
