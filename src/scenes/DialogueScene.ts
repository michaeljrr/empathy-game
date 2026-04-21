// ============================================================
//  DialogueScene.ts
// ============================================================

import patientAHappy   from '../assets/images/characters/patient_a/patient_a_happy.png';
import patientASad     from '../assets/images/characters/patient_a/patient_a_sad.png';
import patientANeutral from '../assets/images/characters/patient_a/patient_a_neutral.png';
import strokePatient   from '../assets/images/characters/stroke_patient/stroke_patient.png';
import sleepingPatient from '../assets/images/hospital/sleeping_patient.png';
import karenAngry      from '../assets/images/characters/karen/karen_angry.png';
import karenShouting   from '../assets/images/characters/karen/karen_shouting.png';
import mrSooNeutral    from '../assets/images/characters/mr soo/Mr Soo.png';
import yingYing        from '../assets/images/characters/yingying/Ying ying.png';
import emptyBedSprite  from '../assets/images/hospital/bed.png';
import hospitalWardBg  from '../assets/images/hospital/hospitalbg.png';
import uncleLimScript  from '../assets/dialogues/day1/uncle_lim.json';
import auntieTanScript from '../assets/dialogues/day1/auntie_tan.json';
import sleepingPatientScript from '../assets/dialogues/day1/sleeping_patient.json';
import uncleLimDay2Script from '../assets/dialogues/day2/uncle_lim.json';
import sleepingPatientDay2Script from '../assets/dialogues/day2/sleeping_patient.json';
import uncleLimDay3PreOpScript  from '../assets/dialogues/day3/uncle_lim_preop.json';
import uncleLimDay3PostOpScript from '../assets/dialogues/day3/uncle_lim_postop.json';
import sleepingPatientDay3Script from '../assets/dialogues/day3/sleeping_patient.json';
import karenDay3Script from '../assets/dialogues/day3/karen.json';
import uncleLimDay4InterruptedScript from '../assets/dialogues/day4/uncle_lim_interrupted.json';
import uncleLimDay4PostOpScript      from '../assets/dialogues/day4/uncle_lim_postop.json';
import sleepingPatientDay4Script     from '../assets/dialogues/day4/sleeping_patient.json';
import karenDay4Script               from '../assets/dialogues/day4/karen.json';
import uncleLimDay5RecoveryScript    from '../assets/dialogues/day5/uncle_lim_recovery.json';
import mrSooDay5Script               from '../assets/dialogues/day5/mr_soo.json';
import karenDay5ComplaintScript      from '../assets/dialogues/day5/karen_complaint.json';
import day6BedAScript                from '../assets/dialogues/day6/bed_a.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type Expression    = 'neutral' | 'happy' | 'sad' | 'surprised' | 'worried' | 'agitated';
type CharacterType = 'patient' | 'doctor' | 'nurse' | 'family';
type BgStrip       = 'black' | 'white' | 'none';
type Speaker       = 'player' | 'character' | 'empty';

interface CharacterConfig {
  id: string;
  name: string;
  type: CharacterType;
  accentColor: string;
  accentTint: string;
  backgroundSrc: string;
  expressions: Partial<Record<Expression, string>>;
  defaultExpression: Expression;
  stripBg: BgStrip;
  scriptKey: string;
  talkSound?: string;      // Character's talking blip sound
  spriteFoot?: number;     // Vertical position (fraction of screen) where sprite feet land (default: 1.3)
  spriteMaxH?: number;     // Max sprite height (fraction of screen) (default: 1.3)
  noBob?: boolean;         // Disable sprite bobbing animation for ALL expressions (e.g., for sleeping patients)
  allowUpscale?: boolean;  // Allow the sprite to scale ABOVE its natural size (default false). Useful for low-res PNGs like Karen's.
  // Per-expression bob override — expressions listed here stay still even though the
  // rest of the character's expressions bob normally (e.g. Day 6 bed image vs Ying Ying).
  stillExpressions?: Expression[];
  // Per-expression position/size overrides. Used when one expression in the
  // same character needs different framing from the rest (e.g. Day 6's bed image
  // sits higher on screen than Ying Ying's portrait does).
  expressionOverrides?: Partial<Record<Expression, { spriteFoot?: number; spriteMaxH?: number }>>;
}

interface PlayerConfig {
  name: string;
  accentColor: string;
  accentTint: string;
}

interface DialogueOption {
  text: string;
  response: string;
  responseExpression: Expression;
  next: string;
  speaker?: Speaker;       // Who speaks this option (default: 'player')
  responseSpeaker?: Speaker; // Who speaks the response (default: 'character')
  musicTrack?: string;     // Optional: Change music when this option is chosen
  responseHideSprite?: boolean; // Hide character sprite during response
}

interface DialogueNode {
  text: string;
  expression: Expression;
  speaker?: Speaker;       // Who speaks this node (default: 'character')
  options: DialogueOption[];
  musicTrack?: string;     // Optional: Music for this node
  hideSprite?: boolean;    // Hide character sprite while this node is active
}

interface DialogueTree {
  metadata?: {
    id?: string;
    title?: string;
    defaultMusic?: string;  // Default background music for this story
  };
  [nodeKey: string]: DialogueNode | any; // 'any' for metadata
}

type SceneState = 'TALKING' | 'WAITING' | 'CHOOSING' | 'RESPONSE';

// ─── Scripts ──────────────────────────────────────────────────────────────────

const DIALOGUE_SCRIPTS: Record<string, DialogueTree> = {
  uncle_lim: uncleLimScript as DialogueTree,
  auntie_tan: auntieTanScript as DialogueTree,
  sleeping_patient: sleepingPatientScript as DialogueTree,
  uncle_lim_day2: uncleLimDay2Script as DialogueTree,
  sleeping_patient_day2: sleepingPatientDay2Script as DialogueTree,
  uncle_lim_day3_preop:  uncleLimDay3PreOpScript  as DialogueTree,
  uncle_lim_day3_postop: uncleLimDay3PostOpScript as DialogueTree,
  sleeping_patient_day3: sleepingPatientDay3Script as DialogueTree,
  karen_day3:            karenDay3Script          as DialogueTree,
  uncle_lim_day4_interrupted: uncleLimDay4InterruptedScript as DialogueTree,
  uncle_lim_day4_postop:      uncleLimDay4PostOpScript      as DialogueTree,
  sleeping_patient_day4:      sleepingPatientDay4Script     as DialogueTree,
  karen_day4:                 karenDay4Script               as DialogueTree,
  uncle_lim_day5_recovery:    uncleLimDay5RecoveryScript    as DialogueTree,
  mr_soo_day5:                mrSooDay5Script               as DialogueTree,
  karen_day5_complaint:       karenDay5ComplaintScript      as DialogueTree,
  day6_bed_a:                 day6BedAScript                as DialogueTree,
};

// ─── Characters ───────────────────────────────────────────────────────────────

const CHARACTERS: Record<string, CharacterConfig> = {
  day1patientA: {
    id: 'day1patientA',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientAHappy,
      sad:       patientASad,
      neutral:   patientANeutral,
      worried:   patientASad,
      surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day1patientB: {
    id: 'day1patientB',
    name: 'Auntie Tan',
    type: 'patient',
    accentColor: '#B5748A',
    accentTint: '#F5E2EA',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     strokePatient,
      neutral:   strokePatient,
      sad:       strokePatient,
      worried:   strokePatient,
      surprised: strokePatient,
    },
    defaultExpression: 'happy',
    stripBg: 'white',
    scriptKey: 'auntie_tan',
    talkSound: '/src/assets/audio/voices/female_blip.mp3',
  },
  day1patientC: {
    id: 'day1patientC',
    name: 'Sleeping Patient',
    type: 'patient',
    accentColor: '#7A9B76',
    accentTint: '#E5F0E4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   sleepingPatient,
      happy:     sleepingPatient,
      sad:       sleepingPatient,
      worried:   sleepingPatient,
      surprised: sleepingPatient,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'sleeping_patient',
    spriteFoot: 1.0,  // Position higher up on screen
    spriteMaxH: 1.0,  // Smaller sprite size
    noBob: true,      // Don't bob - patient is sleeping
  },
};

// Day 2 characters
const DAY2_CHARACTERS: Record<string, CharacterConfig> = {
  day2patientA: {
    id: 'day2patientA',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientAHappy,
      sad:       patientASad,
      neutral:   patientANeutral,
      worried:   patientASad,
      surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day2',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day2patientC: {
    id: 'day2patientC',
    name: 'Sleeping Patient',
    type: 'patient',
    accentColor: '#7A9B76',
    accentTint: '#E5F0E4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   sleepingPatient,
      happy:     sleepingPatient,
      sad:       sleepingPatient,
      worried:   sleepingPatient,
      surprised: sleepingPatient,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'sleeping_patient_day2',
    spriteFoot: 1.0,  // Position higher up on screen
    spriteMaxH: 1.0,  // Smaller sprite size
    noBob: true,      // Don't bob - patient is sleeping
  },
};

// Day 3 characters
const DAY3_CHARACTERS: Record<string, CharacterConfig> = {
  day3patientA_preop: {
    id: 'day3patientA_preop',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientAHappy,
      sad:       patientASad,
      neutral:   patientANeutral,
      worried:   patientASad,
      surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day3_preop',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day3patientA_postop: {
    id: 'day3patientA_postop',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientANeutral,
      sad:       patientASad,
      neutral:   patientASad,
      worried:   patientASad,
      surprised: patientANeutral,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day3_postop',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day3patientC: {
    id: 'day3patientC',
    name: 'Sleeping Patient',
    type: 'patient',
    accentColor: '#7A9B76',
    accentTint: '#E5F0E4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   sleepingPatient,
      happy:     sleepingPatient,
      sad:       sleepingPatient,
      worried:   sleepingPatient,
      surprised: sleepingPatient,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'sleeping_patient_day3',
    spriteFoot: 1.0,
    spriteMaxH: 1.0,
    noBob: true,
  },
  day3patientD: {
    id: 'day3patientD',
    name: 'Karen',
    type: 'patient',
    accentColor: '#C87C5E',
    accentTint: '#F4E0D4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   karenAngry,
      happy:     karenAngry,
      sad:       karenAngry,
      worried:   karenShouting,
      surprised: karenShouting,
      agitated:  karenShouting,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'karen_day3',
    talkSound: '/src/assets/audio/voices/female_blip.mp3',
    allowUpscale: true,  // Karen's PNGs are low-res — upscale so she reads at the same size as Uncle Lim/Auntie Tan
  },
};

// Day 4 characters
const DAY4_CHARACTERS: Record<string, CharacterConfig> = {
  day4patientA_preop: {
    id: 'day4patientA_preop',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientAHappy,
      sad:       patientASad,
      neutral:   patientANeutral,
      worried:   patientASad,
      surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day4_interrupted',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day4patientA_postop: {
    id: 'day4patientA_postop',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientANeutral,
      sad:       patientASad,
      neutral:   patientASad,
      worried:   patientASad,
      surprised: patientANeutral,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day4_postop',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day4patientC: {
    id: 'day4patientC',
    name: 'Sleeping Patient',
    type: 'patient',
    accentColor: '#7A9B76',
    accentTint: '#E5F0E4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   sleepingPatient,
      happy:     sleepingPatient,
      sad:       sleepingPatient,
      worried:   sleepingPatient,
      surprised: sleepingPatient,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'sleeping_patient_day4',
    spriteFoot: 1.0,
    spriteMaxH: 1.0,
    noBob: true,
  },
  day4patientD: {
    id: 'day4patientD',
    name: 'Karen',
    type: 'patient',
    accentColor: '#C87C5E',
    accentTint: '#F4E0D4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   karenAngry,
      happy:     karenAngry,
      sad:       karenAngry,
      worried:   karenShouting,
      surprised: karenShouting,
      agitated:  karenShouting,
    },
    defaultExpression: 'agitated',
    stripBg: 'black',
    scriptKey: 'karen_day4',
    talkSound: '/src/assets/audio/voices/female_blip.mp3',
    allowUpscale: true,
  },
};

// Day 5 characters
// NOTE: Mr. Soo is a new character — reusing karen sprites as a placeholder.
const DAY5_CHARACTERS: Record<string, CharacterConfig> = {
  day5patientA: {
    id: 'day5patientA',
    name: 'Uncle Lim',
    type: 'patient',
    accentColor: '#5B8FA8',
    accentTint: '#D6EAF2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy:     patientANeutral,
      sad:       patientASad,
      neutral:   patientASad,
      worried:   patientASad,
      surprised: patientANeutral,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'uncle_lim_day5_recovery',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day5patientB: {
    id: 'day5patientB',
    name: 'Mr. Soo',
    type: 'patient',
    accentColor: '#7A6C9E',
    accentTint: '#E3DEEF',
    backgroundSrc: hospitalWardBg,
    expressions: {
      // Only Mr Soo.png is used in dialogue — Mr Soo agitated.png is reserved
      // for the hospital bed image (top-down ward).
      neutral:   mrSooNeutral,
      happy:     mrSooNeutral,
      sad:       mrSooNeutral,
      worried:   mrSooNeutral,
      surprised: mrSooNeutral,
      agitated:  mrSooNeutral,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'mr_soo_day5',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
    allowUpscale: true,
    spriteMaxH: 1.6, // Scale Mr Soo's PNG taller so he reads the same size as Uncle Lim / Auntie Tan
  },
  day5patientD: {
    id: 'day5patientD',
    name: 'Karen',
    type: 'patient',
    accentColor: '#C87C5E',
    accentTint: '#F4E0D4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      neutral:   karenAngry,
      happy:     karenAngry,
      sad:       karenAngry,
      worried:   karenShouting,
      surprised: karenShouting,
      agitated:  karenShouting,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'karen_day5_complaint',
    talkSound: '/src/assets/audio/voices/female_blip.mp3',
    allowUpscale: true,
  },
};

// Day 6 characters — Bed A is "inhabited" by Ying Ying (senior nurse enters mid-scene)
// Early nodes hide the sprite (empty bed), later nodes reveal her.
const DAY6_CHARACTERS: Record<string, CharacterConfig> = {
  day6patientA: {
    id: 'day6patientA',
    name: 'Ying Ying',
    type: 'nurse',
    accentColor: '#7A9B76',
    accentTint: '#E5F0E4',
    backgroundSrc: hospitalWardBg,
    expressions: {
      // Empty-bed narration uses bed.png so the player sees the freshly-made bed;
      // Ying Ying's actual sprite takes over once she appears ("A hand touches your shoulder.").
      worried:   emptyBedSprite,
      neutral:   yingYing,
      happy:     yingYing,
      sad:       yingYing,
      surprised: yingYing,
    },
    defaultExpression: 'worried',
    stripBg: 'none',
    scriptKey: 'day6_bed_a',
    allowUpscale: true,
    // Only the bed image stays still and gets the tighter framing.
    // Ying Ying (neutral/happy/sad/surprised) bobs with the default 1.3/1.3 framing,
    // same as every other character in DialogueScene.
    stillExpressions: ['worried'],
    expressionOverrides: {
      worried: { spriteFoot: 1.0, spriteMaxH: 1.0 },
    },
  },
};

// Merge all characters
const ALL_CHARACTERS = { ...CHARACTERS, ...DAY2_CHARACTERS, ...DAY3_CHARACTERS, ...DAY4_CHARACTERS, ...DAY5_CHARACTERS, ...DAY6_CHARACTERS };

// ─── Image loader ─────────────────────────────────────────────────────────────

interface LoadedImage {
  canvas: HTMLCanvasElement | HTMLImageElement;
  loaded: boolean;
}

function loadAndStrip(src: string, strip: BgStrip, threshold = 30): LoadedImage {
  const result: LoadedImage = { canvas: new Image(), loaded: false };
  const img = new Image();
  img.src = src;
  img.onload = () => {
    if (strip === 'none') {
      (result as any).canvas = img;
      result.loaded = true;
      return;
    }
    const oc   = document.createElement('canvas');
    oc.width   = img.naturalWidth;
    oc.height  = img.naturalHeight;
    const octx = oc.getContext('2d')!;
    octx.drawImage(img, 0, 0);
    const id   = octx.getImageData(0, 0, oc.width, oc.height);
    const d    = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (strip === 'black' && r < threshold && g < threshold && b < threshold) d[i+3] = 0;
      if (strip === 'white' && r > 255-threshold && g > 255-threshold && b > 255-threshold) d[i+3] = 0;
    }
    octx.putImageData(id, 0, 0);
    (result as any).canvas = oc;
    result.loaded = true;
  };
  img.onerror = () => console.error(`[DialogueScene] Failed to load: ${src}`);
  return result;
}

interface CharacterImages {
  expressions: Partial<Record<Expression, LoadedImage>>;
  background:  LoadedImage;
}

function buildImageCache(char: CharacterConfig): CharacterImages {
  const srcCache = new Map<string, LoadedImage>();
  const expressions: Partial<Record<Expression, LoadedImage>> = {};
  for (const [expr, src] of Object.entries(char.expressions) as [Expression, string][]) {
    if (!src) continue;
    if (!srcCache.has(src)) srcCache.set(src, loadAndStrip(src, char.stripBg));
    expressions[expr] = srcCache.get(src)!;
  }
  return { expressions, background: loadAndStrip(char.backgroundSrc, 'none') };
}

// ─── DialogueScene ────────────────────────────────────────────────────────────

import { SFX, BGM, playOnce, playClipped, startLoop, fadeOutLoop } from '../core/audio';
import { isInteractKey } from '../core/settings';

// Starting BGM per character (keyed by character id). The tune can swap at
// specific story beats via triggerNodeAudioCue. BGM.EMOTIONAL_SAD is used as
// a "tense" placeholder for Karen/Mr Soo until a dedicated track is added.
const CHARACTER_STARTING_BGM: Record<string, string> = {
  // Day 1
  day1patientA:        BGM.JOVIAL,
  day1patientB:        BGM.JOVIAL,
  // Day 2
  day2patientA:        BGM.JOVIAL,
  // Day 3
  day3patientA_preop:  BGM.JOVIAL,
  day3patientA_postop: BGM.JOVIAL,          // "Happy TUNE"
  day3patientD:        BGM.EMOTIONAL_SAD,   // "TENSE TUNE" placeholder
  // Day 4
  day4patientA_preop:  BGM.JOVIAL,
  day4patientA_postop: BGM.EMOTIONAL_CONTEMPLATIVE, // "SAD TUNE"
  day4patientD:        BGM.EMOTIONAL_SAD,   // "TENSE TUNE" placeholder
  // Day 5
  day5patientA:        BGM.EMOTIONAL_CONTEMPLATIVE, // "lightly sad"
  day5patientB:        BGM.EMOTIONAL_SAD,   // "tense music" placeholder
  day5patientD:        BGM.SAD,             // "sad music"
  // Day 6
  day6patientA:        BGM.EMOTIONAL_CONTEMPLATIVE, // "lightly sad"
};

export class DialogueScene {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;

  private character!:   CharacterConfig;
  private player!:      PlayerConfig;
  private images!:      CharacterImages;
  private tree!:        DialogueTree;
  private currentNode!: DialogueNode;
  private currentNodeKey: string = 'start';

  private imageCache = new Map<string, CharacterImages>();

  // Audio
  private backgroundMusic: HTMLAudioElement | null = null;
  private talkSound: HTMLAudioElement | null = null;
  private audioCache = new Map<string, HTMLAudioElement>();
  private readonly TALK_SOUND_INTERVAL = 3; // Play sound every N characters
  private talkSoundCounter = 0;

  // Typewriter
  private displayedText   = '';
  private fullText        = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 28;
  private isTyping = false;
  private currentSpeaker: Speaker = 'character'; // Track who is currently speaking

  // Bob
  private bobOffset = 0;
  private bobTime   = 0;

  // State
  private state: SceneState = 'TALKING';

  // Choices
  private selectedChoice     = 0;
  private pendingExpression: Expression  = 'neutral';
  private pendingNextNode:   string|null = null;
  private pendingSpeaker:    Speaker     = 'character';
  private pendingHideSprite  = false;
  private waitingToAdvance   = false;    // True when waiting for E to advance to next node
  private currentHideSprite  = false;    // True while current node/response should hide the sprite

  // Bed tracking for completion
  private bedLocation: string | null = null;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private isExiting = false;  // Prevents input spam during scene transitions

  // Layout constants
  private readonly BOX_H      = 180;   // dialogue box height
  private readonly BOX_PAD    = 22;
  private readonly MARGIN     = 16;
  private readonly LINE_H     = 40;
  // Character is scaled to fit between 50% and 75% of canvas height.
  // Feet land at 75%, head starts at 50% (or higher if image is taller).
  private readonly CHAR_FOOT  = 1.3;  // feet sit at this fraction down the screen
  private readonly CHAR_MAX_H = 1.3;  // max height the sprite may occupy (fraction of screen)

  private boundKeyDown!: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  private get W(): number { return (this.canvas as any).logicalWidth  || this.canvas.width;  }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public init(characterId: string, bedLocation?: string): void {
    console.log(`[DialogueScene] init: ${characterId}`);

    this.bedLocation = bedLocation || null;

    const char = ALL_CHARACTERS[characterId];
    if (!char) { console.error(`[DialogueScene] Unknown character: ${characterId}`); return; }

    const tree = DIALOGUE_SCRIPTS[char.scriptKey];
    if (!tree?.['start']) { console.error(`[DialogueScene] Missing script/start for: ${characterId}`); return; }

    // Set up player configuration
    const playerName = localStorage.getItem('playerName') || 'Nurse';
    this.player = {
      name: playerName,
      accentColor: '#5AC57A',  // Default green for player
      accentTint: '#D4F5DC'
    };

    this.character    = char;
    this.tree         = tree;
    this.currentNode  = tree['start'];
    this.currentNodeKey = 'start';
    this.selectedChoice  = 0;
    this.pendingNextNode = null;
    this.pendingSpeaker  = 'character';
    this.pendingHideSprite = false;
    this.waitingToAdvance = false;
    this.currentSpeaker  = this.currentNode.speaker || 'character';
    this.currentHideSprite = !!this.currentNode.hideSprite;
    this.bobTime      = 0;
    this.bobOffset    = 0;
    this.inputCooldown = 0;
    this.isExiting    = false;  // Reset exit flag for new dialogue
    this.state        = 'TALKING';

    if (!this.imageCache.has(characterId)) {
      this.imageCache.set(characterId, buildImageCache(char));
    }
    this.images = this.imageCache.get(characterId)!;

    // Load character audio (voice blip)
    this.loadCharacterAudio(char);

    // Load and play story music
    this.loadStoryMusic();

    // Character-specific starting BGM — the tune swaps at specific nodes
    // are handled in triggerNodeAudioCue below.
    const startingBgm = CHARACTER_STARTING_BGM[characterId];
    if (startingBgm) {
      startLoop(startingBgm, 0.3);
    }

    // Fire the node-enter cue for the start node (noop for most characters)
    this.triggerNodeAudioCue('start', 'node');

    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    // Start dialogue immediately - no fade in (Game.ts handles fades)
    // If node text is empty, skip directly to choices
    if (!this.currentNode.text?.trim()) {
      this.state = 'CHOOSING';
      this.displayedText = '';
      this.fullText = '';
      console.log('[DialogueScene] Empty text - → CHOOSING');
    } else {
      this.fullText        = this.currentNode.text;
      this.displayedText   = '';
      this.typewriterIndex = 0;
      this.typewriterTimer = 0;
      this.isTyping        = true;
    }
  }

  public update(deltaMs: number): void {
    this.inputCooldown = Math.max(0, this.inputCooldown - deltaMs);
    switch (this.state) {
      case 'TALKING':  this.tickTypewriter(deltaMs); this.tickBob(deltaMs, true);  break;
      case 'WAITING':  this.tickBob(deltaMs, false); break;
      case 'CHOOSING': this.bobOffset = 0; break;
      case 'RESPONSE': this.tickTypewriter(deltaMs); this.tickBob(deltaMs, true);  break;
    }
  }

  public render(): void {
    const w = this.W;
    const h = this.H;

    // 1. Background
    const bg = this.images?.background;
    if (bg?.loaded) {
      this.ctx.drawImage(bg.canvas as CanvasImageSource, 0, 0, w, h);
    } else {
      this.ctx.fillStyle = '#C8DCE0';
      this.ctx.fillRect(0, 0, w, h);
    }

    // 2. Character sprite (skipped when current node/response sets hideSprite)
    if (this.images && !this.currentHideSprite) this.drawSprite(this.resolveExpression(), w, h);

    // 3. Dialogue box
    if (this.character) this.renderBox(w, h);
  }

  public cleanup(): void {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    this.stopAudio();
    // Fade out any per-dialogue audio layers so the transition back to the
    // hospital is smooth. All calls are no-ops if the loop isn't running.
    // NOTE: BGM.END is NOT faded here — it starts at Day 6's reveal and
    // should keep playing through Day6EndingScene until the player clicks
    // "Back to Main".
    fadeOutLoop(BGM.JOVIAL, 900);
    fadeOutLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 900);
    fadeOutLoop(BGM.EMOTIONAL_SAD, 900);
    fadeOutLoop(BGM.SAD, 900);
  }

  // Per-character / per-node music beats.
  //  phase === 'node'     → the player just entered this node (typewriter about to start)
  //  phase === 'response' → the player picked an option at this node; its response is about to play
  private triggerNodeAudioCue(nodeKey: string, phase: 'node' | 'response'): void {
    if (!this.character) return;
    const id = this.character.id;

    // ── Day 1 Bed A (Uncle Lim) — laughs at uncle_response
    if (id === 'day1patientA' && nodeKey === 'uncle_response' && phase === 'response') {
      playClipped(SFX.BED_A_LAUGH, 2000, 0.6);
      fadeOutLoop(BGM.JOVIAL, 900);
      startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.3);
    }

    // ── Day 1 Bed B (Auntie Tan) — cheeky line at mc_advice response
    if (id === 'day1patientB' && nodeKey === 'mc_advice' && phase === 'response') {
      fadeOutLoop(BGM.JOVIAL, 900);
      startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.3);
    }

    // ── Day 2 Bed A (Uncle Lim BP check) — jovial → light sad → jovial
    if (id === 'day2patientA' && phase === 'node') {
      if (nodeKey === 'cuff_wrap') {
        // Velcro SFX as the nurse wraps the BP cuff
        playOnce(SFX.VELCRO, 0.55);
      } else if (nodeKey === 'monitor_reads') {
        // Machine beep as the monitor reads 130 over 82
        playOnce(SFX.MACHINE_BEEP, 0.5);
      } else if (nodeKey === 'uncle_grabs_hand') {
        // "Uncle lim grabs your hand..." / "Come on, don't be too sad..."
        fadeOutLoop(BGM.JOVIAL, 900);
        startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.3);
      } else if (nodeKey === 'kopi_kosong') {
        // Player grins cheekily — return to jovial
        fadeOutLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 900);
        startLoop(BGM.JOVIAL, 0.3);
      }
    }

    // ── Day 3 Bed A pre-op — jovial → sad at "Nurse ah..."
    if (id === 'day3patientA_preop' && nodeKey === 'nurse_ah' && phase === 'node') {
      fadeOutLoop(BGM.JOVIAL, 900);
      startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.3);
    }

    // ── Day 6 Bed A — at the reveal ("Uncle Lim. He passed last night.")
    // swap the lightly-sad track for end_bgm (the "distorted music" cue).
    if (id === 'day6patientA' && nodeKey === 'senior_nurse' && phase === 'response') {
      fadeOutLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 1500);
      startLoop(BGM.END, 0.3);
    }
  }

  // ── Sprite ─────────────────────────────────────────────────────────────────

  private drawSprite(expression: Expression, w: number, h: number): void {
    const entry =
      this.images.expressions[expression] ??
      this.images.expressions[this.character.defaultExpression];
    if (!entry?.loaded) return;

    const src  = entry.canvas as HTMLCanvasElement | HTMLImageElement;
    const srcW = (src as HTMLCanvasElement).width  || (src as HTMLImageElement).naturalWidth;
    const srcH = (src as HTMLCanvasElement).height || (src as HTMLImageElement).naturalHeight;
    if (!srcW || !srcH) return;

    // ── Positioning ──────────────────────────────────────────────────────────
    //
    //  CHAR_FOOT  = 0.75  → feet land at 75% down the screen
    //  CHAR_MAX_H = 0.40  → sprite height is capped at 40% of screen height
    //
    //  We scale the sprite so it fits within CHAR_MAX_H * h, then anchor
    //  the bottom of the sprite to CHAR_FOOT * h (+ bob offset).
    //
    // Use character-specific positioning if available, otherwise use defaults.
    // Per-expression overrides take precedence (e.g. Day 6 bed image framing).
    const override = this.character.expressionOverrides?.[expression];
    const charFoot = override?.spriteFoot ?? this.character.spriteFoot ?? this.CHAR_FOOT;
    const charMaxH = override?.spriteMaxH ?? this.character.spriteMaxH ?? this.CHAR_MAX_H;
    
    const maxDrawH = h * charMaxH;
    // By default never upscale past the PNG's natural size; characters with
    // allowUpscale=true can grow beyond (e.g. Karen's low-res sprites).
    const rawScale = maxDrawH / srcH;
    const scale    = this.character.allowUpscale ? rawScale : Math.min(rawScale, 1);
    const drawW    = srcW * scale;
    const drawH    = srcH * scale;

    // Centre horizontally, feet at CHAR_FOOT
    const drawX = (w - drawW) / 2;
    const drawY = h * charFoot - drawH + this.bobOffset;

    this.ctx.drawImage(src as CanvasImageSource, drawX, drawY, drawW, drawH);
  }

  private resolveExpression(): Expression {
    // WAITING is used in two distinct situations:
    //   - after the current node's text (waitingToAdvance = false) → show the
    //     node's own expression, NOT the pending response expression
    //   - after a response has played (waitingToAdvance = true) → keep the
    //     response's expression up until the player advances
    let want: Expression;
    if (this.state === 'RESPONSE') {
      want = this.pendingExpression;
    } else if (this.state === 'WAITING' && this.waitingToAdvance) {
      want = this.pendingExpression;
    } else {
      want = this.currentNode?.expression ?? 'neutral';
    }
    return this.images?.expressions[want] ? want : this.character.defaultExpression;
  }

  // ── Typewriter ─────────────────────────────────────────────────────────────

  private startTypewriter(text: string): void {
    this.fullText        = text;
    this.displayedText   = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping        = true;
  }

  private tickTypewriter(deltaMs: number): void {
    if (!this.isTyping) return;
    this.typewriterTimer += deltaMs;
    while (this.typewriterTimer >= this.TYPEWRITER_SPEED && this.typewriterIndex < this.fullText.length) {
      this.typewriterTimer -= this.TYPEWRITER_SPEED;
      this.displayedText  += this.fullText[this.typewriterIndex++];
      
      // Play talk sound every N characters
      this.talkSoundCounter++;
      if (this.talkSoundCounter >= this.TALK_SOUND_INTERVAL) {
        this.talkSoundCounter = 0;
        this.playTalkSound();
      }
    }
    if (this.typewriterIndex >= this.fullText.length) {
      this.isTyping      = false;
      this.displayedText = this.fullText;
      this.onTypewriterDone();
    }
  }

  private onTypewriterDone(): void {
    if (this.state === 'TALKING') {
      this.state = 'WAITING';
      this.waitingToAdvance = false;
      console.log('[DialogueScene] → WAITING');
    } else if (this.state === 'RESPONSE') {
      // After response, wait for user to press E before advancing
      this.state = 'WAITING';
      this.waitingToAdvance = true;
      console.log('[DialogueScene] → WAITING (to advance)');
    }
  }

  private skipTypewriter(): void {
    this.isTyping        = false;
    this.displayedText   = this.fullText;
    this.typewriterIndex = this.fullText.length;
    this.onTypewriterDone();
  }

  // ── Bob ────────────────────────────────────────────────────────────────────

  private tickBob(deltaMs: number, speaking: boolean): void {
    // Per-character no-bob (e.g. sleeping patients) or per-expression still
    // flag (e.g. Day 6 bed image) freezes the sprite in place.
    const currentExpr = this.resolveExpression();
    const isStill = this.character?.noBob
      || this.character?.stillExpressions?.includes(currentExpr);
    if (isStill) {
      this.bobOffset = 0;
      return;
    }

    this.bobTime  += deltaMs;
    this.bobOffset = speaking
      ? Math.sin(this.bobTime / 280) * 4
      : Math.sin(this.bobTime / 800) * 2;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;
    if (this.isExiting) return;  // Ignore all input during scene transition

    // Dev-only silent skip: `\` exits the current dialogue immediately.
    if (e.key === '\\') {
      this.isExiting = true;
      window.dispatchEvent(new CustomEvent('sceneChange', {
        detail: { scene: 'hospital', bedLocation: this.bedLocation }
      }));
      return;
    }

    this.inputCooldown = this.INPUT_COOLDOWN_MS;

    const key = e.key.toLowerCase();
    console.log(`[DialogueScene] Key: "${key}"  State: ${this.state}`);

    const interact = isInteractKey(e);

    // Universal "E to continue" blip while inside a text-box state.
    // CHOOSING has its own per-option W/S/E sounds wired separately.
    if (interact && (this.state === 'TALKING' || this.state === 'WAITING' || this.state === 'RESPONSE')) {
      playClipped(SFX.CHOICE, 1000, 0.35);
    }

    if (this.state === 'TALKING') {
      if (interact) {
        if (this.isTyping) this.skipTypewriter();
      }
      return;
    }
    if (this.state === 'WAITING') {
      if (interact) {
        // If waiting to advance to next node (after a response), do that
        if (this.waitingToAdvance) {
          this.waitingToAdvance = false;
          this.advanceToNextNode();
          return;
        }
        
        // Check if there are no options - auto-exit
        const opts = this.currentNode.options;
        if (!opts || opts.length === 0) {
          console.log('[DialogueScene] No options in WAITING state - auto-exiting');
          window.dispatchEvent(new CustomEvent('sceneChange', { 
            detail: { scene: 'hospital', bedLocation: this.bedLocation } 
          }));
          return;
        }
        
        // Otherwise, show choices or auto-confirm single empty option
        if (opts.length === 1 && !opts[0].text?.trim()) {
          this.selectedChoice = 0;
          this.confirmChoice();
        } else {
          this.state = 'CHOOSING'; 
          this.selectedChoice = 0;
          console.log('[DialogueScene] → CHOOSING');
        }
      }
      return;
    }
    if (this.state === 'RESPONSE') {
      if (interact) {
        if (this.isTyping) this.skipTypewriter();
      }
      return;
    }
    if (this.state === 'CHOOSING') {
      if (key === 'w' || key === 'arrowup') {
        const prev = this.selectedChoice;
        this.selectedChoice = Math.max(0, this.selectedChoice - 1);
        if (this.selectedChoice !== prev) playClipped(SFX.CHOICE, 1000, 0.45);
      } else if (key === 's' || key === 'arrowdown') {
        const prev = this.selectedChoice;
        this.selectedChoice = Math.min(this.currentNode.options.length - 1, this.selectedChoice + 1);
        if (this.selectedChoice !== prev) playClipped(SFX.CHOICE, 1000, 0.45);
      } else if (interact) {
        this.confirmChoice();
      }
      return;
    }
  }

  // ── Dialogue flow ──────────────────────────────────────────────────────────

  private confirmChoice(): void {
    const option = this.currentNode.options[this.selectedChoice];
    if (!option) return;
    console.log(`[DialogueScene] Choice: "${option.text}" → ${option.next}`);

    if (option.next === 'exit') {
      // Exit dialogue - dispatch scene change immediately
      this.isExiting = true;  // Prevent further input during transition
      window.dispatchEvent(new CustomEvent('sceneChange', { 
        detail: { scene: 'hospital', bedLocation: this.bedLocation } 
      }));
      return;
    }

    // Change music if option specifies a track
    if (option.musicTrack) {
      this.changeMusic(option.musicTrack);
    }

    this.pendingExpression = option.responseExpression;
    this.pendingNextNode   = option.next;
    this.pendingSpeaker    = option.responseSpeaker || 'character';
    this.pendingHideSprite = !!option.responseHideSprite;

    if (!option.response?.trim()) {
      this.advanceToNextNode();
    } else {
      this.state = 'RESPONSE';
      this.currentSpeaker = this.pendingSpeaker;
      this.currentHideSprite = this.pendingHideSprite;
      this.triggerNodeAudioCue(this.currentNodeKey, 'response');
      this.startTypewriter(option.response);
    }
  }

  private advanceToNextNode(): void {
    const key  = this.pendingNextNode;
    if (!key) return;
    const next = this.tree[key];
    if (!next) {
      // End of dialogue - exit to hospital
      this.isExiting = true;  // Prevent further input during transition
      window.dispatchEvent(new CustomEvent('sceneChange', { 
        detail: { scene: 'hospital', bedLocation: this.bedLocation } 
      }));
      return;
    }
    console.log(`[DialogueScene] Node: "${key}"`);
    
    // Change music if node specifies a track
    if (next.musicTrack) {
      this.changeMusic(next.musicTrack);
    }
    
    // Safety check: if node has no options, auto-exit
    if (!next.options || next.options.length === 0) {
      console.log('[DialogueScene] No options - auto-exiting');
      window.dispatchEvent(new CustomEvent('sceneChange', { 
        detail: { scene: 'hospital', bedLocation: this.bedLocation } 
      }));
      return;
    }
    
    this.currentNode     = next;
    this.currentNodeKey  = key;
    this.pendingNextNode = null;
    this.selectedChoice  = 0;
    this.waitingToAdvance = false;
    this.currentSpeaker  = this.currentNode.speaker || 'character';
    this.currentHideSprite = !!this.currentNode.hideSprite;

    // Trigger any node-enter music/sfx cues (Day 2/3/6 tune swaps live here)
    this.triggerNodeAudioCue(key, 'node');

    // If node text is empty, skip directly to choices
    if (!this.currentNode.text?.trim()) {
      this.state = 'CHOOSING';
      this.displayedText = '';
      this.fullText = '';
      console.log('[DialogueScene] Empty text - → CHOOSING');
    } else {
      this.state = 'TALKING';
      this.startTypewriter(this.currentNode.text);
    }
  }

  // ── Dialogue box ───────────────────────────────────────────────────────────

  private renderBox(w: number, h: number): void {
    const boxX   = this.MARGIN;
    const boxY   = h - this.BOX_H - this.MARGIN;
    const boxW   = w - this.MARGIN * 2;
    
    // Determine speaker and get their colors/name
    const speaker = this.currentSpeaker;
    let speakerName = '';
    let accent = this.character.accentColor;
    let tint = this.character.accentTint;
    
    if (speaker === 'player') {
      speakerName = this.player.name;
      accent = this.player.accentColor;
      tint = this.player.accentTint;
    } else if (speaker === 'character') {
      speakerName = this.character.name;
      accent = this.character.accentColor;
      tint = this.character.accentTint;
    } else if (speaker === 'empty') {
      // No name for empty speaker (action descriptions)
      speakerName = '';
      accent = '#666666';
      tint = '#888888';
    }

    // Panel
    this.ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    this.ctx.fill();

    // Left accent stripe
    this.ctx.fillStyle = accent;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    this.ctx.fill();

    // Top border line
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth   = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(boxX + 14, boxY);
    this.ctx.lineTo(boxX + boxW - 14, boxY);
    this.ctx.stroke();

    // Name plate (only if speakerName is not empty)
    if (speakerName) {
      const npW = this.measureStr(speakerName, 14, 700) + 28;
      this.ctx.fillStyle = accent;
      this.rrect(boxX + this.BOX_PAD, boxY - 28, npW, 28, [6, 6, 0, 0]);
      this.ctx.fill();
      this.ctx.fillStyle    = '#FFFFFF';
      this.ctx.font         = '700 14px "Segoe UI", sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign    = 'left';
      this.ctx.fillText(speakerName, boxX + this.BOX_PAD + 14, boxY - 14);
    }

    // ── Text states ───────────────────────────────────────────────────────

    if (this.state === 'TALKING' || this.state === 'WAITING' || this.state === 'RESPONSE') {
      this.ctx.fillStyle    = '#F0F0F0';
      this.ctx.font         = '16px "Segoe UI", sans-serif';
      this.ctx.textBaseline = 'top';
      this.ctx.textAlign    = 'left';
      this.wrapText(
        this.displayedText,
        boxX + this.BOX_PAD + 8,
        boxY + 18,
        boxW - this.BOX_PAD * 2 - 8,
        26
      );

      if (this.state === 'WAITING') {
        const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
        this.ctx.fillStyle    = accent;
        this.ctx.globalAlpha  = pulse;
        this.ctx.font         = '13px "Segoe UI", sans-serif';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign    = 'right';
        this.ctx.fillText('▼  E to continue', boxX + boxW - this.BOX_PAD, boxY + this.BOX_H - 16);
        this.ctx.textAlign   = 'left';
        this.ctx.globalAlpha = 1;
      }
    }

    if (this.state === 'CHOOSING') {
      this.ctx.fillStyle    = 'rgba(200,200,200,0.5)';
      this.ctx.font         = '11px "Segoe UI", sans-serif';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText('W / S  to move   ·   E to choose', boxX + this.BOX_PAD + 8, boxY + 10);

      const startY = boxY + 30;
      this.currentNode.options.forEach((opt, i) => {
        const iy  = startY + i * this.LINE_H;
        const sel = i === this.selectedChoice;

        if (sel) {
          this.ctx.fillStyle = `${tint}33`;
          this.rrect(boxX + this.BOX_PAD, iy, boxW - this.BOX_PAD * 2, this.LINE_H - 6, 6);
          this.ctx.fill();
          this.ctx.fillStyle = accent;
          this.rrect(boxX + this.BOX_PAD, iy, 3, this.LINE_H - 6, [3, 0, 0, 3]);
          this.ctx.fill();
        }

        this.ctx.font         = '13px "Segoe UI", sans-serif';
        this.ctx.fillStyle    = sel ? accent : 'rgba(200,200,200,0.4)';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(sel ? '▶' : '◦', boxX + this.BOX_PAD + 8, iy + (this.LINE_H - 6) / 2);

        this.ctx.font      = `${sel ? '600' : '400'} 15px "Segoe UI", sans-serif`;
        this.ctx.fillStyle = sel ? '#FFFFFF' : 'rgba(220,220,220,0.7)';
        this.ctx.fillText(opt.text, boxX + this.BOX_PAD + 24, iy + (this.LINE_H - 6) / 2);
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private rrect(x: number, y: number, w: number, h: number, r: number | number[]): void {
    this.ctx.beginPath();
    (this.ctx as any).roundRect(x, y, w, h, r);
  }

  private wrapText(text: string, x: number, y: number, maxW: number, lh: number): void {
    const words = text.split(' ');
    let line = '', cy = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (this.ctx.measureText(test).width > maxW && line !== '') {
        this.ctx.fillText(line.trimEnd(), x, cy);
        line = word + ' ';
        cy  += lh;
      } else { line = test; }
    }
    if (line.trim()) this.ctx.fillText(line.trimEnd(), x, cy);
  }

  private measureStr(text: string, size: number, weight: number): number {
    this.ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
    return this.ctx.measureText(text).width;
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  private loadCharacterAudio(char: CharacterConfig): void {
    // Load talk sound
    if (char.talkSound) {
      if (!this.audioCache.has(char.talkSound)) {
        const audio = new Audio();
        audio.src = char.talkSound;
        audio.volume = 0.5; // Adjust volume as needed
        this.audioCache.set(char.talkSound, audio);
        
        audio.onerror = () => {
          console.warn(`[DialogueScene] Talk sound not found: ${char.talkSound}`);
        };
      }
      this.talkSound = this.audioCache.get(char.talkSound)!;
    }
  }

  private loadStoryMusic(): void {
    // Check for default music in tree metadata
    const defaultMusic = this.tree.metadata?.defaultMusic;
    if (defaultMusic) {
      this.changeMusic(defaultMusic);
    }
    
    // Check for music in the current node
    const nodeMusic = this.currentNode.musicTrack;
    if (nodeMusic) {
      this.changeMusic(nodeMusic);
    }
  }

  private changeMusic(musicPath: string): void {
    // Stop current music if playing
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }

    // Load and play new music
    if (!this.audioCache.has(musicPath)) {
      const audio = new Audio();
      audio.src = musicPath;
      audio.loop = true;
      audio.volume = 0.3; // Adjust volume as needed
      this.audioCache.set(musicPath, audio);
      
      audio.onerror = () => {
        console.warn(`[DialogueScene] Background music not found: ${musicPath}`);
      };
    }
    
    this.backgroundMusic = this.audioCache.get(musicPath)!;
    
    // Play music (will fail silently if file doesn't exist)
    this.backgroundMusic.play().catch(err => {
      console.warn('[DialogueScene] Could not play background music:', err.message);
    });
  }

  private playTalkSound(): void {
    if (this.talkSound) {
      // Clone and play to allow overlapping sounds
      const sound = this.talkSound.cloneNode() as HTMLAudioElement;
      sound.volume = this.talkSound.volume;
      sound.play().catch(() => {
        // Silently fail if audio can't play (file doesn't exist)
      });
    }
  }

  private stopAudio(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }
}