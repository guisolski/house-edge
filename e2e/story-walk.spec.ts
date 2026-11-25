import { test, expect, type Page } from '@playwright/test';

/**
 * Progression guard: play the entire main story using ONLY walking + E,
 * driven by objective marker positions. No travel menu, no debug jumps.
 * Fails if any objective lacks a reachable interactable target.
 */

type Obj = {
  text: string;
  detail?: string;
  targetName?: string;
  targetX?: number;
  targetY?: number;
  districtId?: string;
};

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
}

test('main story reaches ending via walk + E on objective markers only', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await boot(page);

  const result = await page.evaluate(async () => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            objective: () => Obj;
            interact: () => boolean;
            move: (dx: number, dy: number) => boolean;
            acceptStoryBet: () => boolean;
            confirmBet: () => boolean;
            closeModal: () => void;
            continueExploring: () => boolean;
            doSafeJob: (id: string) => boolean;
            nearbyExit: () => { toDistrict: string } | null;
            nearbyNpc: () => {
              id: string;
              name: string;
              x: number;
              y: number;
            } | null;
            npcs: {
              id: string;
              name: string;
              x: number;
              y: number;
              districtId: string;
            }[];
            sideMarkers: () => { x: number; y: number; label: string }[];
            getMap: () => { width: number; height: number; tiles: string[] };
            ui: { is: (s: string) => boolean };
            player: {
              getStats: () => {
                x: number;
                y: number;
                districtId: string;
                credits: number;
              };
              addCredits: (n: number) => number;
              setFacing: (dx: number, dy: number) => void;
            };
            story: {
              getCompleted: () => string[];
              getFlag: (f: string) => boolean;
            };
          };
        };
      }
    ).__HOUSE_EDGE__;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const failures: string[] = [];
    const log: string[] = [];
    let steps = 0;
    let lastObj = '';
    let stuck = 0;
    const MAX = 4000;

    const walkable = (x: number, y: number): boolean => {
      const m = he.session.getMap();
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) return false;
      return m.tiles[y * m.width + x] !== 'blocked';
    };

    /** BFS next step toward goal (or adjacent stand tile if goal is blocked). */
    const nextStep = (tx: number, ty: number): [number, number] | null => {
      const s = he.session.player.getStats();
      const dirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const goals = new Set<string>([`${tx},${ty}`]);
      if (!walkable(tx, ty)) {
        goals.clear();
        for (const [dx, dy] of dirs) {
          const ax = tx + dx;
          const ay = ty + dy;
          if (walkable(ax, ay)) goals.add(`${ax},${ay}`);
        }
      }
      if (goals.has(`${s.x},${s.y}`)) return null;
      const key = (x: number, y: number) => `${x},${y}`;
      const q: { x: number; y: number }[] = [{ x: s.x, y: s.y }];
      const seen = new Set<string>([key(s.x, s.y)]);
      const parent = new Map<string, { x: number; y: number }>();
      let found: { x: number; y: number } | null = null;
      while (q.length > 0) {
        const cur = q.shift()!;
        if (goals.has(key(cur.x, cur.y))) {
          found = cur;
          break;
        }
        for (const [dx, dy] of dirs) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          const k = key(nx, ny);
          if (seen.has(k) || !walkable(nx, ny)) continue;
          seen.add(k);
          parent.set(k, cur);
          q.push({ x: nx, y: ny });
        }
      }
      if (!found) return null;
      let cur = found;
      let prev = parent.get(key(cur.x, cur.y));
      while (prev && !(prev.x === s.x && prev.y === s.y)) {
        cur = prev;
        prev = parent.get(key(cur.x, cur.y));
      }
      return [cur.x - s.x, cur.y - s.y];
    };

    const grindIfBroke = (): void => {
      let guard = 0;
      while (he.session.player.getStats().credits < 12 && guard < 30) {
        guard += 1;
        const before = he.session.player.getStats().credits;
        he.session.doSafeJob(`safe-${he.session.player.getStats().districtId}`);
        if (he.session.player.getStats().credits === before) {
          // Cooldown/cap — inject credits so bets can resolve (not a district jump).
          he.session.player.addCredits(20);
        }
      }
    };

    const handleModal = async (): Promise<void> => {
      if (he.session.ui.is('dialogue')) {
        if (he.session.acceptStoryBet()) {
          await sleep(20);
          grindIfBroke();
          he.session.confirmBet();
          await sleep(20);
          return;
        }
        he.session.closeModal();
        await sleep(10);
        return;
      }
      if (he.session.ui.is('bet')) {
        grindIfBroke();
        he.session.confirmBet();
        await sleep(20);
      }
    };

    /** Unique yellow target in-district (or exit hop) so edge pointer / on-screen arrow can aim. */
    const uniqueMarkerFail = (
      session: typeof he.session,
      obj: Obj,
      districtId: string,
    ): string | null => {
      if (obj.districtId && obj.districtId !== districtId) {
        return `marker not on-screen-or-pointed-to (district ${obj.districtId} vs ${districtId}): ${obj.text}`;
      }
      const hits = session.npcs.filter(
        (n) =>
          n.districtId === districtId &&
          n.x === obj.targetX &&
          n.y === obj.targetY &&
          n.name === obj.targetName,
      );
      if (hits.length > 1) {
        return `objective target not unique (${hits.length} NPCs named ${obj.targetName}): ${obj.text}`;
      }
      const compete = session
        .sideMarkers()
        .filter(
          (m) =>
            (m.x !== obj.targetX || m.y !== obj.targetY) && m.label === obj.targetName,
        );
      if (compete.length > 0) {
        return `side markers compete with objective name ${obj.targetName}: ${obj.text}`;
      }
      return null;
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
      if (obj.text.includes('missing target')) {
        failures.push(`softlock objective: ${obj.text}`);
        break;
      }
      if (obj.text === lastObj) stuck += 1;
      else {
        stuck = 0;
        lastObj = obj.text;
        log.push(obj.text);
      }
      if (stuck > 200) {
        const s = he.session.player.getStats();
        failures.push(
          `stuck on objective (${stuck}) at ${s.districtId} (${s.x},${s.y}): ${obj.text}`,
        );
        break;
      }

      if (
        !obj.text.startsWith('Story complete') &&
        !obj.text.startsWith('Free roam') &&
        !obj.text.startsWith('Unlock path') &&
        !obj.text.startsWith('Broke') &&
        !obj.text.startsWith('Travel menu') &&
        obj.targetX === undefined
      ) {
        failures.push(`no marker: ${obj.text}`);
        break;
      }

      if (obj.targetX === undefined || obj.targetY === undefined) {
        if (obj.text.startsWith('Broke') || obj.text.includes('odd jobs')) {
          grindIfBroke();
          continue;
        }
        if (obj.text.startsWith('Unlock path') || obj.text.startsWith('Travel menu')) {
          failures.push(`unwalkable progression: ${obj.text}`);
          break;
        }
        break;
      }

      // Objective target must be uniquely marked (not competing with side cyan arrows).
      if (!obj.targetName) {
        failures.push(`objective missing targetName: ${obj.text}`);
        break;
      }
      if (obj.detail === undefined && !obj.text.startsWith('Broke')) {
        // Flavour titles live on the secondary line for story/travel objectives.
        failures.push(`objective missing detail line: ${obj.text}`);
        break;
      }

      const s = he.session.player.getStats();
      const markFail = uniqueMarkerFail(he.session, obj, s.districtId);
      if (markFail) {
        failures.push(markFail);
        break;
      }

      const dist = Math.hypot(obj.targetX - s.x, obj.targetY - s.y);

      // Close enough to interact / stand on exit margin.
      if (dist <= 1.5 || (he.session.nearbyExit() && dist <= 3)) {
        if (he.session.nearbyExit()) {
          he.session.interact();
          await sleep(20);
          continue;
        }
        const npc = he.session.nearbyNpc();
        if (!npc) {
          // One more step onto the marker tile if walkable.
          const step = nextStep(obj.targetX, obj.targetY);
          if (step) {
            he.session.player.setFacing(step[0], step[1]);
            he.session.move(step[0], step[1]);
            await sleep(5);
            continue;
          }
          failures.push(
            `at marker (${obj.targetX},${obj.targetY}) but no interactable for: ${obj.text}`,
          );
          break;
        }
        he.session.interact();
        await sleep(20);
        await handleModal();
        continue;
      }

      const step = nextStep(obj.targetX, obj.targetY);
      if (!step) {
        failures.push(
          `unreachable marker (${obj.targetX},${obj.targetY}) for: ${obj.text}`,
        );
        break;
      }
      he.session.player.setFacing(step[0], step[1]);
      if (!he.session.move(step[0], step[1])) {
        // Auto-travel may have fired; otherwise nudge.
        if (he.session.player.getStats().districtId === s.districtId) {
          he.session.move(1, 0) || he.session.move(0, 1) || he.session.move(-1, 0);
        }
      }
    }

    const postObj = he.session.objective().text;
    return {
      ending: he.session.story.getCompleted().includes('torre-final'),
      freeRoam:
        he.session.story.getFlag('free_roam') ||
        he.session.story.getFlag('casa_quebrada'),
      objective: postObj,
      steps,
      failures,
      completed: he.session.story.getCompleted().length,
      log,
      freeroamHud: /Free roam|Story complete|epilogue/i.test(postObj),
    };
  });

  expect(
    result.failures,
    JSON.stringify({ failures: result.failures, log: result.log }),
  ).toEqual([]);
  expect(result.ending, JSON.stringify(result)).toBe(true);
  expect(result.freeRoam, JSON.stringify(result)).toBe(true);
  expect(result.freeroamHud, `post-ending HUD: ${result.objective}`).toBe(true);
  expect(result.objective).toMatch(/Free roam|Story complete|epilogue/i);
});
