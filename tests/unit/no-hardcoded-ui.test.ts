import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const FILES = [
  'src/ui/panels.ts',
  'src/ui/hud.ts',
  'src/systems/session.ts',
  'src/systems/minigame.ts',
  'src/systems/upgrade.ts',
  'src/game/wiring.ts',
  'src/world/maps.ts',
  'src/rendering/world-view.ts',
  'src/systems/interaction.ts',
  'src/content/districts.ts',
  'src/content/bets.ts',
  'src/systems/grind.ts',
  'src/systems/betting.ts',
  'src/systems/label-policy.ts',
  'src/systems/objectives.ts',
];

/** Known English player-facing phrases that must live in i18n catalogs. */
const BLOCKLIST = [
  'Stake at risk',
  'Stop!',
  'Green zone',
  'Ready to roll',
  'Nobody in range',
  'Missed the pour',
  'Path locked',
  'Offer expires',
  'Submit lock',
  'Side hustle',
  'SIDE HUSTLE',
  'Combo ×',
  'Clue:',
  'Win chance',
  'Not enough credits',
  'Cleared —',
  'Duel vs Augusto',
  'Pick durability',
  'Esc cancels',
  'Ice-cold water',
  'Street pixo',
  'Travel to',
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
  'Odd jobs — flat',
  'We’re done here',
];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function stringLiterals(src: string): string[] {
  const out: string[] = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[1] === '`') continue;
    out.push(m[2]!);
  }
  return out;
}

describe('no hardcoded UI strings', () => {
  for (const rel of FILES) {
    it(`${rel} has no blocklisted English literals`, () => {
      const src = stripComments(readFileSync(join(root, rel), 'utf8'));
      const literals = stringLiterals(src);
      const hits: string[] = [];
      for (const lit of literals) {
        if (lit.length < 4) continue;
        for (const phrase of BLOCKLIST) {
          if (lit.includes(phrase)) hits.push(`${phrase} in "${lit.slice(0, 60)}…"`);
        }
      }
      expect(hits).toEqual([]);
    });
  }
});
