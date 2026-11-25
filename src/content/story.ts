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
        text: 'What a country. Hit me with the ice-water odd — I’ll time the pour myself.',
        choices: [
          {
            label: 'Loud — then Take the bet',
            setsFlag: 'rita_loud',
            reply:
              'Loud it is. Style’s locked — next tap Take the bet for the ice pour. No more looping the menu.',
          },
          {
            label: 'Quiet — then Take the bet',
            setsFlag: 'rita_quiet',
            reply:
              'Quiet. Style’s locked — next tap Take the bet for the ice pour. The choices won’t come back.',
          },
        ],
      },
      {
        speaker: 'Dona Nair',
        text: 'Either way, the ice odd is the door. Win the pour and Catador weighs copper — miss and you retry with me. Nothing advances until the ice lands.',
      },
      {
        speaker: 'Dona Nair',
        text: 'Luna’s been sniffing around the LED antenna. Pirate signal nonsense. Drink slow. Casa bills the ice cubes now.',
      },
    ],
  },
  {
    id: 'side-morro-copper',
    title: 'Spare copper odd',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair'],
    setsFlags: ['side_morro_ok', 'copper_weighed'],
    betId: 'side-morro-copper',
    dialogue: [
      {
        speaker: 'Catador do Morro',
        text: 'Nair said you’d come. Spare wire on the lower laje — weigh the bright bag, not the rust.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Skill check, not a coin flip. Point me at the bags.',
      },
      {
        speaker: 'Catador do Morro',
        text: 'Win and Antena Tech will talk. Lose and you still owe the stake — try again with clearer eyes.',
      },
    ],
  },
  {
    id: 'morro-antena',
    title: 'Jack the LED antenna',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair', 'copper_weighed'],
    setsFlags: ['antena_ok'],
    betId: 'antena-sinal',
    dialogue: [
      {
        speaker: 'Antena Tech',
        text: 'Copper’s in. Casa chopped the hill’s Wi‑Fi and sold it back drip by drip. Match my splice tones — no dice.',
      },
      {
        speaker: 'Rita Odds',
        text: 'So I fund the splice, you hold the cable. Fair. Let’s hear if this hill still talks.',
      },
      {
        speaker: 'Antena Tech',
        text: 'Signal’s clean, you catch Luna on the beco. Wipe the sequence and I kill the feed — not you.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Pirate feed tastes like static and hope. Jack it.',
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
    // Playtest #29: moto dash — distinct from Luna's rooftop lottery.
    betId: 'corrida-moto',
    unlocksDistrict: 'feira-central',
    dialogue: [
      {
        speaker: 'Seu Zé',
        text: 'Everything’s licensed now, kid. Want Luna’s chip? Clear my moto gate on the laje first.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Deal. I’ll take the lane — pay out and point me to the Fair.',
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
        text: 'If the bass doesn’t shake the laje, the revolution won’t stick. Time the samba against the corp jingle — no dice.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Needle on the downbeat. Tonight the floor is ours.',
        choices: [
          {
            label: 'Dance with the crowd',
            setsFlag: 'rita_danced',
            reply: 'I move with them. If Casa wants a meter, they’ll count feet.',
          },
          {
            label: 'Watch from the rail',
            setsFlag: 'rita_watched',
            reply: 'I’ll read the floor from the rail. Someone has to clock the militia.',
          },
        ],
      },
      {
        speaker: 'Bia Forró',
        text: 'After the set, catch Dancer Sol’s cue — then the DJ. He reads the crowd better than any Casa sensor.',
      },
    ],
  },
  {
    id: 'feira-dancer',
    title: 'Dancer’s cue',
    districtId: 'feira-central',
    requiredFlags: ['festa_rolando'],
    setsFlags: ['dancer_ok'],
    betId: 'dancer-tip',
    dialogue: [
      {
        speaker: 'Dancer Sol',
        text: 'Bia warmed the square. Catch my cue beat before the corp playlist hijacks the speakers.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Timing, not luck. Show me the window.',
      },
      {
        speaker: 'Dancer Sol',
        text: 'Green zone mid-spin. Miss and you tip the stake — try again. Then hit the DJ.',
      },
    ],
  },
  {
    id: 'feira-forro',
    title: 'Crowd surge on the calçadão',
    districtId: 'feira-central',
    requiredFlags: ['dancer_ok'],
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
    id: 'feira-lockbox',
    title: 'Casa lockbox under the stage',
    districtId: 'feira-central',
    requiredFlags: ['forro_ok'],
    setsFlags: ['lockbox_ok'],
    betId: 'feira-lockbox',
    dialogue: [
      {
        speaker: 'Stage Hand',
        text: 'Forró shook a Casa lockbox loose under the risers.',
      },
      {
        speaker: 'Stage Hand',
        text: 'Militia reclaim it after the set — unless you pick it first.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Tumblers, not dice. What’s inside?',
      },
      {
        speaker: 'Stage Hand',
        text: 'Ledger chips. Spare keycard. Scratched plate lies — timer’s real, pick can snap.',
        choices: [
          {
            label: 'Crack it for the hill',
            setsFlag: 'lockbox_for_hill',
            reply: 'Chips for the hill. Calçadão laughs louder than Casa.',
          },
          {
            label: 'Crack it for leverage',
            setsFlag: 'lockbox_for_leverage',
            reply: 'Leverage first. I’ll spend the chips when Augusto blinks.',
          },
        ],
      },
      {
        speaker: 'Stage Hand',
        text: 'Either score feeds the radio pirate next. Don’t trust the red sticker.',
      },
    ],
  },
  {
    id: 'feira-radio',
    title: 'Pirate radio odds',
    districtId: 'feira-central',
    requiredFlags: ['lockbox_ok'],
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
        text: 'One crate baked by sun (sol), one that sings (canta) in the palm, one hollow (vazia). Place the odd — then Lavador will walk you to Luna.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ll take the one that sings. After this, asphalt only.',
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
        text: 'Stay on the asphalt strip mid-fair — cyan hair by the radio crates, same lane. Don’t climb the stalls.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Asphalt mid-fair, cyan hair. Got it.',
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
    id: 'avenida-courier',
    title: 'Courier shadow',
    districtId: 'avenida-odds',
    requiredFlags: ['passou_checkpoint'],
    setsFlags: ['courier_shadow_ok'],
    betId: 'courier-tip',
    dialogue: [
      {
        speaker: 'Casa Courier',
        text: 'Capita waved you through. Shadow me through the alleys — I drop VIP chip routes if you keep up.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Chase, not coin flip. Lead.',
      },
      {
        speaker: 'Casa Courier',
        text: 'Four alleys. Miss a turn and you tip the stake — then the influencer still waits east.',
      },
    ],
  },
  {
    id: 'avenida-influencer',
    title: 'Influencer duel',
    districtId: 'avenida-odds',
    requiredFlags: ['courier_shadow_ok'],
    setsFlags: ['influencer_ok'],
    betId: 'influencer-duelo',
    dialogue: [
      {
        speaker: 'Odds Influencer',
        text: 'Live from Odds Avenue! Casa pays me per view. Call the fake engagement — skill read, not a roll.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Your numbers spike overnight — bought likes. Real hill tags don’t jump like that, and this isn’t a Casa promo.',
      },
      {
        speaker: 'Odds Influencer',
        text: 'Cute read. Prove it on the panel before my next filter drop.',
      },
    ],
  },
  {
    id: 'avenida-drone',
    title: 'Drone cones on the boulevard',
    districtId: 'avenida-odds',
    requiredFlags: ['influencer_ok'],
    setsFlags: ['drone_ok'],
    betId: 'avenida-drone',
    dialogue: [
      {
        speaker: 'Neon Snap',
        text: 'Influencer’s feed cooked the airspace. Militia drones paint cones on the asphalt.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I don’t walk into light. Show me the blind path.',
      },
      {
        speaker: 'Neon Snap',
        text: 'Hug the glass shadow. Cut when the cone blinks. Miss a step and the sweep tags you.',
        choices: [
          {
            label: 'Slip low — no photos',
            setsFlag: 'drone_low',
            reply: 'Low and quiet. Snap stays offline until I’m clear.',
          },
          {
            label: 'Dash loud — burn a flare',
            setsFlag: 'drone_flare',
            reply: 'Flare first. If they chase the light, I own the dark.',
          },
        ],
      },
      {
        speaker: 'Neon Snap',
        text: 'Either way — Mensageiro’s waiting once the cones go dark.',
      },
    ],
  },
  {
    id: 'avenida-radar',
    title: 'Neon radar shop',
    districtId: 'avenida-odds',
    requiredFlags: ['drone_ok'],
    setsFlags: ['radar_ok'],
    dialogue: [
      {
        speaker: 'Mensageiro',
        text: 'Drones blinked. Radar vans still circle the ATM strip.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I don’t wait for vans. I time them.',
      },
      {
        speaker: 'Mensageiro',
        text: 'West-to-east sweep. When it clears, cut south off asphalt to the cage — then the ATM.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Sweep, then south. Got it.',
      },
    ],
  },
  {
    id: 'avenida-server',
    title: 'Server-cage infiltration',
    districtId: 'avenida-odds',
    requiredFlags: ['radar_ok'],
    setsFlags: ['server_ok'],
    betId: 'avenida-server',
    dialogue: [
      {
        speaker: 'Cage Runner',
        text: 'Militia vans cleared. There’s a Casa server cage off the glass strip — four tumblers, one quiet minute.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Infiltration, not a coin flip. If I crack it, the ATM glitch gets a clean uplink.',
      },
      {
        speaker: 'Cage Runner',
        text: 'Clue’s etched under the latch. Set every pin, submit once. Miss and tip the stake — same cage, same pins.',
        choices: [
          {
            label: 'Pull the pit mirror files',
            setsFlag: 'server_mirror',
            reply: 'Mirror the pit. Augusto’s private rake tables come with me.',
          },
          {
            label: 'Plant a deadman’s beacon',
            setsFlag: 'server_beacon',
            reply: 'Beacon planted. If the hearing stalls, the feed still screams.',
          },
        ],
      },
      {
        speaker: 'Cage Runner',
        text: 'After the cage, the ATM hacker waits south. Don’t linger — cams wake on a bad pin.',
      },
    ],
  },
  {
    id: 'avenida-atm',
    title: 'ATM glitch hunt',
    districtId: 'avenida-odds',
    requiredFlags: ['server_ok'],
    setsFlags: ['atm_ok'],
    betId: 'avenida-atm',
    dialogue: [
      {
        speaker: 'ATM Hacker',
        text: 'Cage uplink’s live. Casa ATMs round down to the centavo and pocket the drift. Trigger the glitch before lockout.',
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
    id: 'avenida-stealth',
    title: 'Lobby cam slip',
    districtId: 'avenida-odds',
    requiredFlags: ['atm_ok'],
    setsFlags: ['stealth_ok'],
    betId: 'avenida-stealth',
    dialogue: [
      {
        speaker: 'Lobby Cam Tech',
        text: 'ATM glitch woke the lobby cams. Slip the routes before Margin’s hearing — five quiet steps.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Stealth chase. No dice. Walk me through.',
      },
      {
        speaker: 'Lobby Cam Tech',
        text: 'Miss a step and you tip the stake. Then the betrayal meet — then coffee with Margin.',
      },
    ],
  },
  {
    id: 'avenida-betrayal',
    title: 'Betrayal on the boulevard',
    districtId: 'avenida-odds',
    requiredFlags: ['stealth_ok'],
    setsFlags: ['betrayal_ok'],
    betId: 'avenida-betrayal',
    dialogue: [
      {
        speaker: 'Mole Contact',
        text: 'Stop. The “leak” was never Luna’s alone — I sold a slice back to Casa for a clean exit. Your hill bytes have a mole scar.',
      },
      {
        speaker: 'Rita Odds',
        text: 'You used us. The antenna, the pendrive, the fair — all so Augusto could watch the script?',
      },
      {
        speaker: 'Mole Contact',
        text: 'Call it. Skill read: who sold the hill’s bytes? Clue’s in who still picks up for Casa without leaving a name. Your choice after still matters at Margin’s table.',
        choices: [
          {
            label: 'Keep Luna close',
            setsFlag: 'trust_luna',
            reply:
              'Luna stays. The mole burns. We walk into Margin with receipts, not revenge.',
          },
          {
            label: 'Cut soft allies',
            setsFlag: 'cut_soft',
            reply: 'I cut soft allies. Only cold ledger walks into that hearing.',
          },
        ],
      },
      {
        speaker: 'Mole Contact',
        text: 'Either way, Margin’s coffee is next. Win the testimony — the tower unlocks.',
      },
    ],
  },
  {
    id: 'lobby-margin',
    title: 'Coffee with Dr. Margin',
    districtId: 'avenida-odds',
    requiredFlags: ['betrayal_ok'],
    // Unlock tower without forced hill backtrack; return beats stay optional.
    setsFlags: ['escandalo_aberto', 'unlocked_torre', 'morro_return_ok'],
    betId: 'audiencia-publica',
    unlocksDistrict: 'torre-casa',
    dialogue: [
      {
        speaker: 'Dr. Margin',
        text: 'Regulation is just another table. Want a public hearing? Pick the testimony that sticks — skill read.',
      },
      {
        speaker: 'Rita Odds',
        text: 'People will see the house edge eating schools, hospitals, and water. And the mole scar on our own bytes.',
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
    optional: true,
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['trusted_hill'],
    // Margin already sets morro_return_ok — skip forced hill backtrack.
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
    optional: true,
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['cut_private'],
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
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
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
        text: 'VIP’s upstairs, but the pit wants a warm-up hand. Spot the real deck — my thumb keeps returning to one soft corner; foil shine and plastic wrap are show props.',
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
    title: 'Elevator call',
    districtId: 'torre-casa',
    requiredFlags: ['pit_ok'],
    setsFlags: ['elevator_ok'],
    betId: 'torre-elevator',
    dialogue: [
      {
        speaker: 'Elevator',
        text: 'VIP’s upstairs. Time the express call — green zone — then I carry you up. No coin flip.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ve climbed worse stairs. Call the car.',
      },
      {
        speaker: 'Elevator',
        text: 'Nail the timing and the doors open on chrome with a fade. Miss and you tip the stake — try again.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Chrome or retry — I’m going up. Call it.',
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
        text: 'Elevator spit you out clean. High rollers want a show.',
      },
      {
        speaker: 'Rita Odds',
        text: 'One quiet hand. Then Augusto.',
      },
      {
        speaker: 'VIP Host',
        text: 'Skim the rake before security blinks. After that — we talk terms.',
      },
    ],
  },
  {
    id: 'torre-negotiate',
    title: 'Negotiate the VIP exit',
    districtId: 'torre-casa',
    requiredFlags: ['vip_ok'],
    setsFlags: ['negotiate_ok'],
    betId: 'torre-negotiate',
    dialogue: [
      {
        speaker: 'VIP Host',
        text: 'Rake’s skimmed. I can still walk you out smiling — or with paper that burns.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Name your price. Timer’s already on your face.',
      },
      {
        speaker: 'VIP Host',
        text: 'Three offers. One sticks. Augusto hears whatever you leave on the table.',
        choices: [
          {
            label: 'Take the hush chip',
            setsFlag: 'neg_hush',
            reply: 'Hush chip in the pocket. Quiet doors. Thin leverage.',
          },
          {
            label: 'Demand the pit mirror',
            // Playtest #32: only the hush chip seals — mirror/smile fail the offer.
            fails: true,
            reply: 'Host hardens. Mirror talk belongs in the books, not this handshake.',
          },
          {
            label: 'Walk out smiling',
            fails: true,
            reply:
              'Cameras eat the smile. No chip. No deal. Try again when you’re quiet.',
          },
        ],
      },
      {
        speaker: 'VIP Host',
        text: 'Deal’s sealed. Gold rail to Augusto — don’t blink first.',
      },
    ],
  },
  {
    id: 'torre-final',
    title: 'Duel at Casa Suprema Tower',
    districtId: 'torre-casa',
    requiredFlags: ['negotiate_ok'],
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
        text: 'A chip? I’m the hill, the fair, the calçadão, and the pixo. Three phases — needle, read, terminal.',
      },
      {
        speaker: 'Augusto Casa',
        text: 'Skill won’t save you from the house. Three phases. Miss one and you retry it — the stake waits for a full clear.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Good. I’m done rolling your dice. Deal the city.',
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
        text: 'Rita. Sit. The ice is honest tonight — no odd attached. You walked the hill, the fair, the avenue, and you made Augusto sweat.',
      },
      {
        speaker: 'Capitã',
        text: '(radio crackle) Hill’s clear. Antenna still sings your pirate hymn. Don’t forget who kept the splice warm.',
      },
      {
        speaker: 'Fio',
        text: 'And who ran the lajes when the cams blinked. Your chase steps still echo on my tiles.',
      },
      {
        speaker: 'Luna',
        text: 'Pendrive’s archived. Pit ledger’s public. Casa can rebuild — we’ll have the receipts.',
      },
      {
        speaker: 'Rita Odds',
        text: 'He called it skill. I called it the city. The ledger still has names, but they’re ours now.',
      },
      {
        speaker: 'Dona Nair',
        text: 'One last call from the boteco — how do you leave the table?',
        choices: [
          {
            label: 'Keep the pirate feed warm',
            setsFlag: 'epi_feed',
            reply: 'Feed stays warm. When Casa rebuilds, the hill hears first.',
          },
          {
            label: 'Rest the odds — free roam',
            setsFlag: 'epi_rest',
            reply: 'Odds can rest. Side hustles stay optional. Neon can wait.',
          },
        ],
      },
      {
        speaker: 'Dona Nair',
        text: 'Saúde. The credits roll for everyone who bet with you — then the city is yours again.',
      },
    ],
  },
  // —— Optional side quests (small rewards, never gate the main path) ——
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
