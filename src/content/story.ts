import type { StoryBeat } from '../core/types';

/** Main story (~20 min) — English text, Brazilian cyberpunk flavor. */
export const STORY_BEATS: readonly StoryBeat[] = [
  {
    id: 'intro-laje',
    title: 'Wake up on the laje',
    districtId: 'morro-neon',
    requiredFlags: [],
    setsFlags: ['conheceu_rita'],
    dialogue: [
      {
        speaker: 'Rita Odds',
        text: 'Another day, another odd. Even the sun over Morro Neon looks sponsored.',
      },
      {
        speaker: 'Rita Odds',
        text: 'My debt to Casa Suprema is due at midnight. I need a plan — or a miracle.',
      },
    ],
  },
  {
    id: 'boteco-nair',
    title: "Dona Nair's boteco",
    districtId: 'morro-neon',
    requiredFlags: ['conheceu_rita'],
    setsFlags: ['falou_nair'],
    betId: 'agua-gelada',
    dialogue: [
      {
        speaker: 'Dona Nair',
        text: 'E aí, Rita? Face of someone who owes the corp. Want water? You have to bet — city law.',
      },
      {
        speaker: 'Rita Odds',
        text: 'What a country. Hit me with the ice-water odd.',
      },
      {
        speaker: 'Dona Nair',
        text: 'Luna’s been sniffing around the LED antenna. Pirate signal nonsense. Ask the tech on the hill first.',
      },
      {
        speaker: 'Dona Nair',
        text: 'And drink slow. Casa bills the ice cubes now. Take the stairs up the spine — one wide climb, whole hill.',
      },
    ],
  },
  {
    id: 'morro-antena',
    title: 'Climb the LED antenna',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair'],
    setsFlags: ['antena_ok'],
    betId: 'antena-sinal',
    dialogue: [
      {
        speaker: 'Antena Tech',
        text: 'Casa chopped the hill’s Wi‑Fi and sold it back drip by drip. I can jack a pirate feed off the LED tower — if you bet the climb.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Up the rust ladder, past the neon cross. Let’s see if this hill still hears the street.',
      },
      {
        speaker: 'Antena Tech',
        text: 'Signal’s clean, you hear Luna on the beco. If you wipe out, I catch the antenna — not you.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Pirate feed tastes like static and hope. I’m taking both down the stairs.',
      },
    ],
  },
  {
    id: 'luna-beco',
    title: 'Pixo alley',
    districtId: 'morro-neon',
    requiredFlags: ['antena_ok'],
    setsFlags: ['conheceu_luna'],
    betId: 'laje-lottery',
    dialogue: [
      {
        speaker: 'Luna Pixel',
        text: 'Rita… I pulled a slice of their algorithm. But Seu Zé only trades the pendrive if you beat the rooftop draw.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Street lotteries got wiped when the corps took over. Now even the laje plays by Casa rules.',
      },
      {
        speaker: 'Luna Pixel',
        text: 'Seu Zé’s booth sits east of the stairs. Don’t let Fio snatch the copper mid-hand — he runs the wires.',
      },
    ],
  },
  {
    id: 'morro-fios',
    title: 'Wire chase on the lajes',
    districtId: 'morro-neon',
    requiredFlags: ['conheceu_luna'],
    setsFlags: ['fios_ok'],
    betId: 'fio-corrida',
    dialogue: [
      {
        speaker: 'Fio Ladrão',
        text: 'Your chip’s on my line, oddsmom. I sprint the lajes faster than Casa billing.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Thief! Every meter of copper on this hill is community property.',
      },
      {
        speaker: 'Fio Ladrão',
        text: 'Bet the chase. Catch me and Seu Zé gets his wire back. Lose and I vanish into the neon.',
      },
    ],
  },
  {
    id: 'seu-ze-banca',
    title: "Seu Zé's booth",
    districtId: 'morro-neon',
    requiredFlags: ['fios_ok'],
    setsFlags: ['unlocked_feira'],
    betId: 'corrida-moto',
    unlocksDistrict: 'feira-central',
    dialogue: [
      {
        speaker: 'Seu Zé',
        text: 'Everything’s licensed now, kid. Want Luna’s chip? Win the rooftop moto race.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Deal. Let’s see if this race is enough to buy Luna’s chip.',
      },
      {
        speaker: 'Seu Zé',
        text: 'Pode crer. Win first — routes come after.',
      },
    ],
  },
  {
    id: 'feira-kiko',
    title: 'Sidewalk of odds',
    districtId: 'feira-central',
    requiredFlags: ['unlocked_feira'],
    setsFlags: ['falou_kiko'],
    betId: 'pastel-surpresa',
    dialogue: [
      {
        speaker: 'Kiko Calçadão',
        text: 'Olha o pastel! Olha a odd! The calçadão shines like Copacabana, except every stone is a market.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I need Odds Avenue. The Casa is hiding the code.',
      },
      {
        speaker: 'Kiko Calçadão',
        text: 'Talk to the catador by the stalls. He sees everything tossed in the calçadão trash.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Fair ground smells like oil and guaraná. Keep me pointed at the scavenger.',
      },
    ],
  },
  {
    id: 'feira-catador',
    title: 'Bottle scavenger',
    districtId: 'feira-central',
    requiredFlags: ['falou_kiko'],
    setsFlags: ['catador_ok'],
    betId: 'feira-garrafa',
    dialogue: [
      {
        speaker: 'Catador da Feira',
        text: 'Corp bottle deposit pays pennies. I bet the sack weight — you help me sift the plaza before militia sweeps.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Fine. If your pile hits quota, what do I get?',
      },
      {
        speaker: 'Catador da Feira',
        text: 'Rumor Bia’s forró set is tonight. Win the garrafa odd and I point you to the speakers.',
      },
    ],
  },
  {
    id: 'bia-set',
    title: 'Pirate synth-forró set',
    districtId: 'feira-central',
    requiredFlags: ['catador_ok'],
    setsFlags: ['festa_rolando'],
    betId: 'samba-odds',
    dialogue: [
      {
        speaker: 'Bia Forró',
        text: 'If the bass doesn’t shake the laje, the revolution won’t stick. Bet on samba against the corp jingle.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Bet. Tonight the floor is ours.',
      },
      {
        speaker: 'Bia Forró',
        text: 'After the set, find the DJ. He reads the crowd better than any Casa sensor.',
      },
    ],
  },
  {
    id: 'feira-forro',
    title: 'Crowd surge on the calçadão',
    districtId: 'feira-central',
    requiredFlags: ['festa_rolando'],
    setsFlags: ['forro_ok'],
    betId: 'forro-crowd',
    dialogue: [
      {
        speaker: 'DJ Forró',
        text: 'Corpo wants a static crowd — easy to count, easy to tax. Bet whether this square erupts into dance.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If the calçadão moves, militia gets nervous. I’m wagering on sweat and sax.',
      },
      {
        speaker: 'DJ Forró',
        text: 'Party peaks, Luna slides the pendrive handoff. Miss the beat and we try again.',
      },
    ],
  },
  {
    id: 'feira-radio',
    title: 'Pirate radio odds',
    districtId: 'feira-central',
    requiredFlags: ['forro_ok'],
    setsFlags: ['radio_ok'],
    betId: 'feira-radio',
    dialogue: [
      {
        speaker: 'Radio Pirate',
        text: 'Forró’s shaking the meters. My pirate stack needs one more odd — bet the next track jumps the Casa noise filter.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If the filter trips, militia hears static instead of Luna’s handoff. I’m in.',
      },
      {
        speaker: 'Radio Pirate',
        text: 'Win and the calçadão stays loud for ten quiet minutes. Lose and we sweat the sniffer vans.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Ten minutes is enough. Roll it.',
      },
    ],
  },
  {
    id: 'feira-tipster',
    title: 'Tipster at the mango crates',
    districtId: 'feira-central',
    requiredFlags: ['radio_ok'],
    setsFlags: ['tipster_ok'],
    betId: 'feira-tipster',
    dialogue: [
      {
        speaker: 'Barraca Tia',
        text: 'Radio’s loud, kid. Before you chase pendrives — a tip: Casa pays snitches in mango crates. Want to bet which crate’s wired?',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’d rather not eat a tracker. Point me at the clean one.',
      },
      {
        speaker: 'Barraca Tia',
        text: 'East crates look sweeter. West crates hum. Place the odd — then Lavador will walk you to Luna.',
      },
      {
        speaker: 'Rita Odds',
        text: 'East it is. After this, asphalt only.',
      },
    ],
  },
  {
    id: 'feira-courier',
    title: 'Calçadão courier tip',
    districtId: 'feira-central',
    requiredFlags: ['tipster_ok'],
    setsFlags: ['courier_ok'],
    dialogue: [
      {
        speaker: 'Lavador da Feira',
        text: 'Tia cleared the wired crate. Luna’s waiting with the pendrive — militia still sniffs USB heat.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Then I need a clean walk to her. Any cover?',
      },
      {
        speaker: 'Lavador da Feira',
        text: 'Stay on the asphalt strip. She’s just past the pink ODDS 24h sign — cyan hair, same asphalt lane. Don’t climb the stalls.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Asphalt past ODDS 24h. Got it.',
      },
      {
        speaker: 'Lavador da Feira',
        text: 'When you’re done, the east exit on this same strip goes to Odds Avenue — once Luna’s file unlocks it.',
      },
    ],
  },
  {
    id: 'prova-luna',
    title: 'Pendrive on a freela',
    districtId: 'feira-central',
    requiredFlags: ['courier_ok'],
    setsFlags: ['unlocked_avenida', 'tem_prova'],
    betId: 'prova-vazamento',
    unlocksDistrict: 'avenida-odds',
    dialogue: [
      {
        speaker: 'Luna Pixel',
        text: 'While the party rolls, we slip the leak through. Bet whether the file opens.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If it opens, Odds Avenue is next — and I’m bringing the whole city on my back.',
      },
    ],
  },
  {
    id: 'avenida-twist',
    title: 'Leak or plant?',
    districtId: 'avenida-odds',
    requiredFlags: ['unlocked_avenida'],
    setsFlags: ['twist_visto'],
    betId: 'twist-vazamento',
    dialogue: [
      {
        speaker: 'Mole Contact',
        text: 'Your “leak” smells like Casa bait. I heard whispers — could be a mole feeding Luna bad bytes.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Luna wouldn’t… would she? I need truth before I march on the boulevard.',
      },
      {
        speaker: 'Mole Contact',
        text: 'Bet the twist. Win and we know if the vazamento is real. Lose and assume the corp wrote the script.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If it’s bait, I still walk the boulevard. Truth or trap — I need eyes on Capita’s checkpoint next.',
      },
      {
        speaker: 'Mole Contact',
        text: 'Whatever you decide, don’t tell the influencer. Their glow’s on Casa payroll.',
      },
    ],
  },
  {
    id: 'avenida-checkpoint',
    title: "Captain's checkpoint",
    districtId: 'avenida-odds',
    requiredFlags: ['twist_visto'],
    setsFlags: ['passou_checkpoint'],
    betId: 'pixo-challenge',
    dialogue: [
      {
        speaker: 'Captain Vespera',
        text: 'Papers and chips. No odd, no passage. Or… paint the facade and prove you’ve got street blood.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ll take pixo over a stamp. The boulevard already chose a side.',
      },
      {
        speaker: 'Captain Vespera',
        text: 'Then wager the spray. Win and the militia looks the other way — for a block.',
      },
    ],
  },
  {
    id: 'avenida-influencer',
    title: 'Influencer duel',
    districtId: 'avenida-odds',
    requiredFlags: ['passou_checkpoint'],
    setsFlags: ['influencer_ok'],
    betId: 'influencer-duelo',
    dialogue: [
      {
        speaker: 'Odds Influencer',
        text: 'Live from Odds Avenue! Casa pays me per view. Bet whether street pixo beats my sponsored glow.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Your audience is rented. Mine grew up on this asphalt.',
      },
    ],
  },
  {
    id: 'avenida-radar',
    title: 'Neon radar shop',
    districtId: 'avenida-odds',
    requiredFlags: ['influencer_ok'],
    setsFlags: ['radar_ok'],
    dialogue: [
      {
        speaker: 'Mensageiro',
        text: 'Influencer’s feed is cooked. Militia radar vans circle the ATM strip — wait for the sweep to pass.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I don’t wait for vans. I time them.',
      },
      {
        speaker: 'Mensageiro',
        text: 'Militia vans sweep west-to-east. When the boulevard clears, cut south off the asphalt to the ATM hacker by the glass strip.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Wait for the sweep, then south to the ATM. Got it.',
      },
    ],
  },
  {
    id: 'avenida-atm',
    title: 'ATM glitch hunt',
    districtId: 'avenida-odds',
    requiredFlags: ['radar_ok'],
    setsFlags: ['atm_ok'],
    betId: 'avenida-atm',
    dialogue: [
      {
        speaker: 'ATM Hacker',
        text: 'Casa ATMs round down to the centavo and pocket the drift. Bet you can trigger the glitch before lockout.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Every chipped coin buys time. Run the exploit.',
      },
      {
        speaker: 'ATM Hacker',
        text: 'Machine’s south of the glass strip — away from Margin’s coffee. Don’t mix my glitch with his hearing.',
      },
    ],
  },
  {
    id: 'lobby-margin',
    title: 'Coffee with Dr. Margin',
    districtId: 'avenida-odds',
    requiredFlags: ['atm_ok'],
    setsFlags: ['escandalo_aberto', 'unlocked_torre'],
    betId: 'audiencia-publica',
    unlocksDistrict: 'torre-casa',
    dialogue: [
      {
        speaker: 'Dr. Margin',
        text: 'Regulation is just another table. Want a public hearing? Wager. Win, and the scandal trends.',
      },
      {
        speaker: 'Rita Odds',
        text: 'People will see the house edge eating schools, hospitals, and water.',
      },
      {
        speaker: 'Dr. Margin',
        text: 'The hearing decides everything. Place your chips — win, and the scandal trends citywide.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Then I buy the mic back with scandal. Let’s open the books.',
      },
    ],
  },
  {
    id: 'morro-return-nair',
    title: 'Return: trust the hill',
    districtId: 'morro-neon',
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['morro_return_ok', 'trusted_hill'],
    skipIfFlag: 'morro_return_ok',
    betId: 'morro-return-nair',
    dialogue: [
      {
        speaker: 'Dona Nair',
        text: 'Scandal’s trending and you’re back for water. Good. The hill decides who walks into that tower.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Luna’s file, Fio’s wires, your ice — all of it. I need the hill behind me.',
      },
      {
        speaker: 'Dona Nair',
        text: 'Bet that the lajes hold. Win and we back you. Or talk to Fio if you’d rather cut your own deal.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’m not cutting the hill out. Place it.',
      },
      {
        speaker: 'Dona Nair',
        text: 'Either way: west exit stays Morro, east through Fair then Avenue. The tower doesn’t open for tourists.',
      },
    ],
  },
  {
    id: 'morro-return-fio',
    title: 'Return: cut a private wire',
    districtId: 'morro-neon',
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['morro_return_ok', 'cut_private'],
    skipIfFlag: 'morro_return_ok',
    betId: 'morro-return-fio',
    dialogue: [
      {
        speaker: 'Fio Ladrão',
        text: 'Tower’s open and you’re sniffing copper again. I can ghost you a private line past security — for a price.',
      },
      {
        speaker: 'Rita Odds',
        text: 'A private line means fewer people know. Safer — or lonelier.',
      },
      {
        speaker: 'Fio Ladrão',
        text: 'Bet the splice. Win and you climb alone. Nair’s path is the loud one if you prefer company.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Company or silence — I still walk the asphalt myself. Place it.',
      },
    ],
  },
  {
    id: 'torre-foyer',
    title: 'Foyer badge check',
    districtId: 'torre-casa',
    requiredFlags: ['unlocked_torre', 'escandalo_aberto', 'morro_return_ok'],
    setsFlags: ['foyer_ok'],
    betId: 'torre-foyer',
    dialogue: [
      {
        speaker: 'Foyer Guard',
        text: 'Badge or bet. Casa doesn’t let street odds into the pit for free.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I brought scandal and a hill. That badge enough?',
      },
      {
        speaker: 'Foyer Guard',
        text: 'Cute. Wager the bluff. Win and the velvet rope lifts. Lose and you wait with the tourists.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’m done waiting. Place it.',
      },
    ],
  },
  {
    id: 'torre-pit',
    title: 'Pit floor warm-up',
    districtId: 'torre-casa',
    requiredFlags: ['foyer_ok'],
    setsFlags: ['pit_ok'],
    betId: 'torre-pit',
    dialogue: [
      {
        speaker: 'Pit Dealer',
        text: 'VIP’s upstairs, but the pit wants a warm-up hand. House chips only — your street credits convert at a cut.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Convert, then. One clean hand before the high rollers.',
      },
      {
        speaker: 'Pit Dealer',
        text: 'Cards are marked in three places. Bet you spot the real deck before the floor manager does.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I grew up reading marked asphalt. Deal.',
      },
    ],
  },
  {
    id: 'torre-elevator',
    title: 'Elevator odds',
    districtId: 'torre-casa',
    requiredFlags: ['pit_ok'],
    setsFlags: ['elevator_ok'],
    betId: 'torre-elevator',
    dialogue: [
      {
        speaker: 'Elevator',
        text: 'VIP’s upstairs. Coin flip — express car or security stop. Bet the shaft.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ve climbed worse stairs. Call the car.',
      },
      {
        speaker: 'Elevator',
        text: 'Win and the doors open on chrome. Lose and you ride with the busboys. Place it.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Chrome or freight — I’m going up either way. Deal.',
      },
    ],
  },
  {
    id: 'torre-vip',
    title: 'VIP floor',
    districtId: 'torre-casa',
    requiredFlags: ['elevator_ok'],
    setsFlags: ['vip_ok'],
    betId: 'torre-vip',
    dialogue: [
      {
        speaker: 'VIP Host',
        text: 'Elevator spit you out clean. High rollers want entertainment now. Skim the VIP table — bet the rake before security blinks.',
      },
      {
        speaker: 'Rita Odds',
        text: 'One quiet hand at the top, then I face Augusto himself.',
      },
      {
        speaker: 'VIP Host',
        text: 'Whatever you decided on the hill — trust or silence — the rake doesn’t care. Place it.',
      },
      {
        speaker: 'Rita Odds',
        text: 'The rake can wait. My debt can’t. Let’s skim.',
      },
      {
        speaker: 'VIP Host',
        text: 'Augusto’s table is past the gold rail. Don’t talk until the chips land.',
      },
    ],
  },
  {
    id: 'torre-final',
    title: 'Duel at Casa Suprema Tower',
    districtId: 'torre-casa',
    requiredFlags: ['vip_ok'],
    setsFlags: ['casa_quebrada', 'final_bom', 'free_roam'],
    betId: 'duelo-casa',
    isEnding: true,
    endingId: 'povo-no-controle',
    dialogue: [
      {
        speaker: 'Augusto Casa',
        text: 'All of Brazil is my casino. You’re just another chip.',
      },
      {
        speaker: 'Rita Odds',
        text: 'A chip? I’m the hill, the fair, the calçadão, and the pixo. Roll the dice.',
      },
      {
        speaker: 'Augusto Casa',
        text: 'One last odd, then. High stakes. No appeals.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Good. I’m done playing by your meter. Deal the city.',
      },
    ],
  },
  {
    id: 'epilogue-laje',
    title: 'Epilogue on the laje',
    districtId: 'morro-neon',
    requiredFlags: ['casa_quebrada'],
    setsFlags: ['epilogue_done'],
    optional: true,
    dialogue: [
      {
        speaker: 'Dona Nair',
        text: 'Tower’s quiet. Fair’s loud. Avenue’s confused. Sit. Water’s on the house — for once.',
      },
      {
        speaker: 'Rita Odds',
        text: 'For once. The hill still has debts, but they’re ours to name.',
      },
      {
        speaker: 'Luna Pixel',
        text: 'Feed’s still pirate. Side jobs stay open if you want another odd. The city doesn’t clock out.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Neither do I. But tonight the laje belongs to us.',
      },
    ],
  },
  // —— Optional side quests (small rewards, never gate the main path) ——
  {
    id: 'side-morro-copper',
    title: 'Spare copper odd',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair'],
    setsFlags: ['side_morro_ok'],
    betId: 'side-morro-copper',
    optional: true,
    dialogue: [
      {
        speaker: 'Catador do Morro',
        text: 'Spare wire on the lower laje. Bet the haul weight — small credits, no corp meter.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ll take a quiet odd. Keep the bag light.',
      },
    ],
  },
  {
    id: 'side-morro-tank',
    title: 'Water tank odd',
    districtId: 'morro-neon',
    requiredFlags: ['antena_ok'],
    setsFlags: ['side_morro_tank'],
    betId: 'side-morro-tank',
    optional: true,
    dialogue: [
      {
        speaker: 'Antena Tech',
        text: 'Tank’s half empty again. Bet whether tonight’s refill arrives before the hill wakes thirsty.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Water shouldn’t be a wager. Tonight it is — place it.',
      },
    ],
  },
  {
    id: 'side-feira-mango',
    title: 'Mango stall odd',
    districtId: 'feira-central',
    requiredFlags: ['falou_kiko'],
    setsFlags: ['side_feira_ok'],
    betId: 'side-feira-mango',
    optional: true,
    dialogue: [
      {
        speaker: 'Barraca Tia',
        text: 'Mangoes or moths — tonight’s crate is a gamble. Small stake, sweet payout.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If it’s ripe, I’m buying. If not, I’m learning.',
      },
    ],
  },
  {
    id: 'side-feira-ice',
    title: 'Ice cart odd',
    districtId: 'feira-central',
    requiredFlags: ['festa_rolando'],
    setsFlags: ['side_feira_ice'],
    betId: 'side-feira-ice',
    optional: true,
    dialogue: [
      {
        speaker: 'Kiko',
        text: 'Ice cart’s late and the pastel oil’s hot. Bet whether the blocks show before the fryer dies.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Hot oil, cold wager. Fine.',
      },
    ],
  },
  {
    id: 'side-avenida-neon',
    title: 'Neon photo odd',
    districtId: 'avenida-odds',
    requiredFlags: ['passou_checkpoint'],
    setsFlags: ['side_avenida_ok'],
    betId: 'side-avenida-neon',
    optional: true,
    dialogue: [
      {
        speaker: 'Neon Snap',
        text: 'Corp billboards pay per fake smile. Bet whether street neon outshines their LED.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Street light never needed a sponsor. Roll it.',
      },
    ],
  },
  {
    id: 'side-torre-tip',
    title: 'Dealer tip odd',
    districtId: 'torre-casa',
    requiredFlags: ['vip_ok'],
    setsFlags: ['side_torre_ok'],
    betId: 'side-torre-tip',
    optional: true,
    dialogue: [
      {
        speaker: 'Busboy',
        text: 'High rollers tip in chips that “fall.” Bet you can pocket one before cameras blink.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Quiet hand, quiet exit. Let’s see.',
      },
    ],
  },
] as const;

export function getBeat(id: string): StoryBeat | undefined {
  return STORY_BEATS.find((b) => b.id === id);
}
