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
  'Combo ×',
  'Clue:',
  'Win chance',
  'Not enough credits',
  'Cleared —',
  'Duel vs Augusto',
  'Pick durability',
  'Esc cancels',
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
