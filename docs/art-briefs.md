# Character art briefs

Ready-to-run prompts for generating the **two images per character** with an
external image generator (Midjourney, DALL·E, SDXL, Firefly, etc.). The app
already renders stylized SVG emblem heads as a fallback; drop real files in and
they replace the emblems automatically — no code changes.

## Where the files go

| Image | Folder | Filename | Shown |
| --- | --- | --- | --- |
| **Head** (portrait) | `src/assets/portraits/` | `<id>.webp` (or `.png`/`.jpg`) | top-right of every card in the Characters menu |
| **Full card** (face + body + scenery) | `src/assets/cards/` | `<id>.webp` | future "reveal your role" Pokémon-card workflow |

`<id>` is the character's `id` from [`src/data/characters.ts`](../src/data/characters.ts)
(e.g. `big-bad-wolf`, `little-girl`). After adding files, run `npm run build`.

**Recommended output size:** heads 512×512 (square), cards 768×1024 (portrait 3:4).

## Global style (prepend to every prompt)

> Hand-drawn woodcut / dark storybook illustration, muted forest palette of deep
> greens, black and muted brown with pale moonlight and warm lantern accents,
> heavy ink linework, textured engraving shading, mysterious and tense
> nighttime-village-in-the-woods mood, no text, no logos, no border.

- **Head prompts** add: `character head-and-shoulders portrait, centred, facing viewer, plain dark forest vignette background.`
- **Card prompts** add: `full-body character, dynamic pose, atmospheric forest scene behind them, full trading-card illustration.`

Team accent to lean on: **village** = warm/hopeful greens & lantern-gold · **werewolf** = blood-red & bone · **solo** = eerie moon-gold & violet.

---

## Village team

- **Villager** (`villager`) — Head: a weary hooded peasant, honest tired eyes, rough spun cloak. · Card: a villager holding a lantern at a crossroads, pitchfork resting on the shoulder, fog between the pines.
- **Seer** (`seer`) — Head: a hooded mystic with one luminous glowing eye and star motifs. · Card: a robed seer gazing into a floating spectral eye, constellations swirling overhead.
- **Witch** (`witch`) — Head: a sharp-eyed witch in a wide crooked hat, faint green glow. · Card: a witch holding two vials — one green healing, one sickly purple poison — cauldron steam curling around her.
- **Hunter** (`hunter`) — Head: a grizzled hunter, fur collar, rifle barrel over the shoulder. · Card: a hunter taking aim into the dark treeline, gunpowder flash, dead leaves swirling.
- **Little Girl** (`little-girl`) — Head: a curious young girl with braids, peeking wide-eyed. · Card: a small girl peeking around a tree trunk toward glowing wolf eyes, tension in the shadows.
- **Cupid** (`cupid`) — Head: a mischievous cherubic archer with a small bow. · Card: Cupid loosing a heart-tipped arrow between two silhouetted lovers under the moon.
- **Defender / Bodyguard** (`defender`) — Head: a stern armoured guardian, raised shield edge visible. · Card: an armoured bodyguard planting a great shield before a cottage door against the night.
- **Elder** (`elder`) — Head: an ancient bearded villager, deep wrinkles, knowing eyes. · Card: a robed elder leaning on a gnarled staff, scarred but unbowed, embers of a dying fire.
- **Scapegoat** (`scapegoat`) — Head: a nervous man with a goat's horns motif, rope around neck. · Card: a bound figure at the stake as the village points, a goat's shadow cast behind him.
- **Fox** (`fox`) — Head: a clever anthropomorphic fox, nose raised, sniffing. · Card: a cunning fox sniffing along three darkened doorways, one faintly reeking of wolf.
- **Judge / Sheriff** (`sheriff`) — Head: an authoritative figure with a star badge and tricorne. · Card: an elected sheriff on a wooden dais, star badge gleaming, holding a double-weighted ballot.
- **Rusty Sword Knight** (`rusty-sword-knight`) — Head: a battered knight, rust-streaked helm. · Card: a dying knight driving a rusted blade toward a lunging wolf, tetanus-green glow on the edge.
- **Stuttering Judge** (`stuttering-judge`) — Head: a solemn magistrate clutching a gavel. · Card: a magistrate slamming a gavel twice, split double-exposure of two verdicts.
- **Two Sisters** (`two-sisters`) — Head: two near-identical hooded young women side by side. · Card: two sisters whispering in the dark, foreheads close, a single candle between them.
- **Three Brothers** (`three-brothers`) — Head: three rugged brothers shoulder to shoulder. · Card: three brothers standing back-to-back in a clearing, silent nods exchanged.
- **Wild Child** (`wild-child`) — Head: a feral barefoot child, leaves in tangled hair. · Card: a wild child crouched between village and forest, torn between a role model and the wolves.
- **Piper** (`piper`) — *(solo-adjacent; see below — mapped under Solo win logic but villager-aligned)*
- **Bear Tamer** (`bear-tamer`) — Head: a burly tamer with a muzzled bear beside their face. · Card: a bear tamer whose great bear rears and growls toward a hidden wolf in the crowd.
- **Prince / Princess** (`prince`) — Head: a young royal with a thin circlet crown. · Card: a proud prince revealing a royal crest as torches and pitchforks falter before them.
- **Servant** (`servant`) — Head: a devoted attendant, head slightly bowed. · Card: a servant stepping forward to take a doomed master's cloak and fate upon themselves.
- **Gypsy** (`gypsy`) — Head: a shawled fortune-teller over a small crystal orb. · Card: a gypsy at a caravan table, crystal ball aglow with a single yes/no rune.
- **Actor / Double Agent** (`actor`) — Head: a face half-covered by a theatre mask. · Card: an actor surrounded by floating character masks, trying one on mid-transformation.
- **Village Idiot** (`village-idiot`) — Head: a grinning fool in a belled jester cap. · Card: a jester spared from the noose, laughing, but with a hand clapped over his own mouth.
- **Raven** (`raven`) — Head: a cloaked figure with a raven perched at the shoulder. · Card: a hooded raven-keeper releasing a black bird toward a marked rooftop at dusk.
- **Rabble-Rouser / Town Crier** (`rabble-rouser`) — Head: a loud crier mid-shout, hand cupped. · Card: a town crier ringing a great bell on the square, villagers turning to listen.
- **Grandmother** (`grandmother`) — Head: a kindly old woman in a headscarf and spectacles. · Card: a grandmother at a spinning wheel leaving a knotted-thread clue, shawl over her shoulders.
- **Rooster** (`rooster`) — Head: a farmer with a rooster crowing beside his head. · Card: a rooster crowing atop a fence at first light, mist burning off the village.

## Werewolf team

- **Werewolf** (`werewolf`) — Head: a snarling wolf-man, glowing amber eyes, bared fangs. · Card: a hulking werewolf mid-howl on a moonlit ridge, claw-torn cloak, village below.
- **Big Bad Wolf** (`big-bad-wolf`) — Head: an enormous scarred wolf head, jaws agape. · Card: a monstrous wolf twice the size of the rest, standing over two fresh kills.
- **White Werewolf** (`white-werewolf`) — Head: a pale ghostly-white wolf with cold blue eyes. · Card: a lone white wolf turning on its own pack under a bleached moon.
- **Werewolf Cub** (`werewolf-cub`) — Head: a small fanged wolf pup, deceptively cute. · Card: a wolf cub whose death makes the shadowy pack behind it rise in fury.
- **Accursed Wolf-Father** (`accursed-wolf-father`) — Head: an ancient horned alpha wolf, cursed sigils. · Card: a patriarch wolf breathing a curse into a villager, turning them mid-transformation.
- **Vile Doppelgänger** (`vile-doppelganger`) — Head: a face split down the middle, human and wolf halves. · Card: a shapeshifter peeling off a stolen face to reveal fangs beneath.
- **Traitor** (`traitor`) — Head: an ordinary villager with a hidden knife glint and wolf-shadow. · Card: a smiling villager clasping hands with the town while a wolf's shadow looms behind.

## Solo / ambiguous roles

- **Angel** (`angel`) — Head: a serene pale figure with a faint halo. · Card: an angel welcoming the noose with open arms, wings unfurling as the village recoils.
- **Thief** (`thief`) — Head: a masked bandit, eyes over a pulled-up scarf. · Card: a thief in the dark swapping their fate card with one of two glowing unknown cards.
- **Pyromaniac** (`pyromaniac`) — Head: a wild-eyed arsonist lit by flame. · Card: a pyromaniac dousing cottages in gasoline, a single match poised to ignite the row.
- **Piper** (`piper`) — Head: a smiling piper raising a wooden flute to his lips. · Card: a piper leading a trail of glassy-eyed charmed villagers through the misty woods.
- **Devoted Servant** (`devoted-servant`) — Head: a solemn servant holding a single candle. · Card: a servant kneeling to lift a fallen player's role from their body before it is revealed.
- **Abominable Sectarian** (`abominable-sectarian`) — Head: a hooded cultist with a single glowing eye. · Card: a robed sect leader thriving as the village splits into two warring halves behind them.
- **Ghost / Spirit** (`ghost`) — Head: a translucent spectral face, hollow eyes. · Card: a ghost drifting through the village at night, leaving cold hints for the living.
