export type UpgradeId = 'sorte' | 'bolso' | 'fama' | 'filtro-agua';

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
};

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'sorte',
    name: 'Ipê amulet',
    description: '+2% win chance on bets (per level).',
    cost: 80,
    maxLevel: 3,
  },
  {
    id: 'bolso',
    name: 'Armored wallet',
    description: '+40 credits cushion on grind turns.',
    cost: 100,
    maxLevel: 2,
  },
  {
    id: 'fama',
    name: 'Signed pixo',
    description: '+1 extra reputation on wins.',
    cost: 120,
    maxLevel: 2,
  },
  {
    id: 'filtro-agua',
    name: 'Homemade filter',
    description: 'Water purchase odds cost 20% less.',
    cost: 60,
    maxLevel: 1,
  },
];

export class UpgradeSystem {
  private levels = new Map<UpgradeId, number>();

  getLevel(id: UpgradeId): number {
    return this.levels.get(id) ?? 0;
  }

  canBuy(id: UpgradeId, credits: number): boolean {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    if (this.getLevel(id) >= def.maxLevel) return false;
    return credits >= this.nextCost(id);
  }

  nextCost(id: UpgradeId): number {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return Infinity;
    return def.cost * (this.getLevel(id) + 1);
  }

  buy(id: UpgradeId, credits: number): number | null {
    if (!this.canBuy(id, credits)) return null;
    const cost = this.nextCost(id);
    this.levels.set(id, this.getLevel(id) + 1);
    return cost;
  }

  luckBonus(): number {
    return this.getLevel('sorte') * 0.02;
  }

  fameBonus(): number {
    return this.getLevel('fama');
  }

  waterDiscount(): number {
    return this.getLevel('filtro-agua') > 0 ? 0.2 : 0;
  }

  export(): Record<string, number> {
    return Object.fromEntries(this.levels);
  }

  hydrate(data: Record<string, number>): void {
    this.levels = new Map(Object.entries(data) as [UpgradeId, number][]);
  }
}
