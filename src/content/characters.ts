export type CharacterDef = {
  id: string;
  name: string;
  role: string;
  districtId: string;
  slang: string;
  color: string;
};

export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: 'rita',
    name: 'Rita Odds',
    role: 'Protagonist',
    districtId: 'morro-neon',
    slang: 'If life is a bet, I play it peito aberto.',
    color: '#ff2bd6',
  },
  {
    id: 'seu-ze',
    name: 'Seu Zé',
    role: 'Operator of a licensed rooftop odds booth',
    districtId: 'morro-neon',
    slang: 'The old street games are dead. Now every number belongs to the Casa.',
    color: '#ffdf00',
  },
  {
    id: 'luna',
    name: 'Luna Pixel',
    role: 'Hill hacker / ex-Casa intern',
    districtId: 'morro-neon',
    slang: 'Rita, I leaked their RNG. Now you just need guts.',
    color: '#2bfff2',
  },
  {
    id: 'dona-nair',
    name: 'Dona Nair',
    role: 'Boteco queen and gossip broker',
    districtId: 'morro-neon',
    slang: 'Chopp is cold and the gossip is hot, meu bem.',
    color: '#1faa5a',
  },
  {
    id: 'kiko',
    name: 'Kiko Calçadão',
    role: 'Odds camelô at the Central Fair',
    districtId: 'feira-central',
    slang: 'Olha o pastel! Olha a odd! Everything’s almost free.',
    color: '#f5c518',
  },
  {
    id: 'bia-forro',
    name: 'Bia Forró',
    role: 'Pirate synth-forró DJ',
    districtId: 'feira-central',
    slang: 'If the bass doesn’t shake the laje, the revolution won’t stick.',
    color: '#ff6eb4',
  },
  {
    id: 'dr-margin',
    name: 'Dr. Margin',
    role: 'OddsCorp Brasil lobbyist',
    districtId: 'avenida-odds',
    slang: 'Regulation is just another table. The house always eats.',
    color: '#002776',
  },
  {
    id: 'capita',
    name: 'Captain Vespera',
    role: 'Corporate security with a Carioca accent',
    districtId: 'avenida-odds',
    slang: 'Papers and chips. No odd, no passage.',
    color: '#b8ff2b',
  },
  {
    id: 'ceo-casa',
    name: 'Augusto Casa',
    role: 'CEO of Casa Suprema',
    districtId: 'torre-casa',
    slang: 'All of Brazil is my casino. You’re just another chip.',
    color: '#ff3b5c',
  },
] as const;

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
