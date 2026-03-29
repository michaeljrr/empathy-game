// ============================================================
//  DialogueScene.ts
// ============================================================

import patientAHappy   from '../assets/images/characters/patient_a/patient_a_happy.png';
import patientASad     from '../assets/images/characters/patient_a/patient_a_sad.png';
import patientANeutral from '../assets/images/characters/patient_a/patient_a_neutral.png';
import patientBHappy   from '../assets/images/characters/stroke_patient/stroke_patient.png';
import hospitalWardBg  from '../assets/images/hospital/hospitalbg.png';
import mrTanScript     from '../assets/dialouge/mr_tan.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type Expression    = 'neutral' | 'happy' | 'sad' | 'surprised' | 'worried';
type CharacterType = 'patient' | 'doctor' | 'nurse' | 'family';
type BgStrip       = 'black' | 'white' | 'none';

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
}

interface DialogueOption {
  text: string;
  response: string;
  responseExpression: Expression;
  next: string;
  musicTrack?: string;     // Optional: Change music when this option is chosen
}

interface DialogueNode {
  text: string;
  expression: Expression;
  options: DialogueOption[];
  musicTrack?: string;     // Optional: Music for this node
}

interface DialogueTree {
  metadata?: {
    id?: string;
    title?: string;
    defaultMusic?: string;  // Default background music for this story
  };
  [nodeKey: string]: DialogueNode | any; // 'any' for metadata
}

type SceneState = 'FADE_IN' | 'TALKING' | 'WAITING' | 'CHOOSING' | 'RESPONSE' | 'FADE_OUT';

// ─── Scripts ──────────────────────────────────────────────────────────────────

const DIALOGUE_SCRIPTS: Record<string, DialogueTree> = {
  mr_tan: mrTanScript as DialogueTree,
};

// ─── Characters ───────────────────────────────────────────────────────────────

const CHARACTERS: Record<string, CharacterConfig> = {
  day1patientA: {
    id: 'day1patientA',
    name: 'Mr. Tan',
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
    scriptKey: 'mr_tan',
    talkSound: '/src/assets/audio/voices/elderly_male_blip.mp3',
  },
  day1patientB: {
    id: 'day1patientB',
    name: 'Mdm. Siti',
    type: 'patient',
    accentColor: '#B5748A',
    accentTint: '#F5E2EA',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy: patientBHappy, neutral: patientBHappy,
      sad:   patientBHappy, worried: patientBHappy, surprised: patientBHappy,
    },
    defaultExpression: 'happy',
    stripBg: 'white',
    scriptKey: 'mr_tan',
    talkSound: '/src/assets/audio/voices/female_blip.mp3',
  },
  doctor_senior: {
    id: 'doctor_senior',
    name: 'Dr. Lim',
    type: 'doctor',
    accentColor: '#3D9970',
    accentTint: '#D0EDE2',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy: patientAHappy, neutral: patientANeutral,
      sad:   patientASad,   worried: patientASad, surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'mr_tan',
    talkSound: '/src/assets/audio/voices/doctor_male_blip.mp3',
  },
  nurse_colleague: {
    id: 'nurse_colleague',
    name: 'Nurse Mei',
    type: 'nurse',
    accentColor: '#E06B6B',
    accentTint: '#FAE0E0',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy: patientBHappy, neutral: patientBHappy,
      sad:   patientBHappy, worried: patientBHappy, surprised: patientBHappy,
    },
    defaultExpression: 'happy',
    stripBg: 'white',
    scriptKey: 'mr_tan',
    talkSound: '/src/assets/audio/voices/nurse_female_blip.mp3',
  },
  family_son: {
    id: 'family_son',
    name: 'Wei Jie',
    type: 'family',
    accentColor: '#E0933A',
    accentTint: '#FAE9D0',
    backgroundSrc: hospitalWardBg,
    expressions: {
      happy: patientAHappy, neutral: patientANeutral,
      sad:   patientASad,   worried: patientASad, surprised: patientAHappy,
    },
    defaultExpression: 'neutral',
    stripBg: 'black',
    scriptKey: 'mr_tan',
    talkSound: '/src/assets/audio/voices/young_male_blip.mp3',
  },
};

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

export class DialogueScene {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;

  private character!:   CharacterConfig;
  private images!:      CharacterImages;
  private tree!:        DialogueTree;
  private currentNode!: DialogueNode;

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

  // Bob
  private bobOffset = 0;
  private bobTime   = 0;

  // Choices
  private selectedChoice     = 0;
  private pendingExpression: Expression  = 'neutral';
  private pendingNextNode:   string|null = null;

  // Fade
  private state:        SceneState = 'FADE_IN';
  private fadeAlpha     = 1;
  private readonly FADE_DURATION = 600;
  private fadeElapsed   = 0;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;

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

  public init(characterId: string): void {
    console.log(`[DialogueScene] init: ${characterId}`);

    const char = CHARACTERS[characterId];
    if (!char) { console.error(`[DialogueScene] Unknown character: ${characterId}`); return; }

    const tree = DIALOGUE_SCRIPTS[char.scriptKey];
    if (!tree?.['start']) { console.error(`[DialogueScene] Missing script/start for: ${characterId}`); return; }

    this.character    = char;
    this.tree         = tree;
    this.currentNode  = tree['start'];
    this.selectedChoice  = 0;
    this.pendingNextNode = null;
    this.bobTime      = 0;
    this.bobOffset    = 0;
    this.inputCooldown = 0;

    if (!this.imageCache.has(characterId)) {
      this.imageCache.set(characterId, buildImageCache(char));
    }
    this.images = this.imageCache.get(characterId)!;

    // Load character audio (voice blip)
    this.loadCharacterAudio(char);
    
    // Load and play story music
    this.loadStoryMusic();

    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    this.state         = 'FADE_IN';
    this.fadeAlpha     = 1;
    this.fadeElapsed   = 0;

    this.fullText        = this.currentNode.text;
    this.displayedText   = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping        = false;
  }

  public update(deltaMs: number): void {
    this.inputCooldown = Math.max(0, this.inputCooldown - deltaMs);
    switch (this.state) {
      case 'FADE_IN':  this.tickFade(deltaMs, false); break;
      case 'TALKING':  this.tickTypewriter(deltaMs); this.tickBob(deltaMs, true);  break;
      case 'WAITING':  this.tickBob(deltaMs, false); break;
      case 'CHOOSING': this.bobOffset = 0; break;
      case 'RESPONSE': this.tickTypewriter(deltaMs); this.tickBob(deltaMs, true);  break;
      case 'FADE_OUT': this.tickFade(deltaMs, true);  break;
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

    // 2. Character sprite
    if (this.images) this.drawSprite(this.resolveExpression(), w, h);

    // 3. Dialogue box
    if (this.character) this.renderBox(w, h);

    // 4. Fade overlay
    if (this.fadeAlpha > 0) {
      this.ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      this.ctx.fillRect(0, 0, w, h);
    }
  }

  public cleanup(): void {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    this.stopAudio();
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
    const maxDrawH = h * this.CHAR_MAX_H;
    const scale    = Math.min(maxDrawH / srcH, 1); // never upscale past natural size
    const drawW    = srcW * scale;
    const drawH    = srcH * scale;

    // Centre horizontally, feet at CHAR_FOOT
    const drawX = (w - drawW) / 2;
    const drawY = h * this.CHAR_FOOT - drawH + this.bobOffset;

    this.ctx.drawImage(src as CanvasImageSource, drawX, drawY, drawW, drawH);
  }

  private resolveExpression(): Expression {
    const want = (this.state === 'RESPONSE' || this.state === 'WAITING')
      ? this.pendingExpression
      : (this.currentNode?.expression ?? 'neutral');
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
    if      (this.state === 'TALKING')  { this.state = 'WAITING'; console.log('[DialogueScene] → WAITING'); }
    else if (this.state === 'RESPONSE') { this.advanceToNextNode(); }
  }

  private skipTypewriter(): void {
    this.isTyping        = false;
    this.displayedText   = this.fullText;
    this.typewriterIndex = this.fullText.length;
    this.onTypewriterDone();
  }

  // ── Bob ────────────────────────────────────────────────────────────────────

  private tickBob(deltaMs: number, speaking: boolean): void {
    this.bobTime  += deltaMs;
    this.bobOffset = speaking
      ? Math.sin(this.bobTime / 280) * 4
      : Math.sin(this.bobTime / 800) * 2;
  }

  // ── Fade ───────────────────────────────────────────────────────────────────

  private tickFade(deltaMs: number, out: boolean): void {
    this.fadeElapsed += deltaMs;
    const progress = Math.min(this.fadeElapsed / this.FADE_DURATION, 1);
    this.fadeAlpha = out ? progress : 1 - progress;
    if (progress >= 1) {
      if (out) {
        window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'hospital' } }));
      } else {
        this.fadeAlpha = 0;
        this.state     = 'TALKING';
        this.isTyping  = true;
        console.log('[DialogueScene] → TALKING');
      }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state === 'FADE_IN' || this.state === 'FADE_OUT') return;
    if (this.inputCooldown > 0) return;
    this.inputCooldown = this.INPUT_COOLDOWN_MS;

    const key = e.key.toLowerCase();
    console.log(`[DialogueScene] Key: "${key}"  State: ${this.state}`);

    if (this.state === 'TALKING') {
      if (key === 'e' || key === 'enter' || key === ' ') {
        if (this.isTyping) this.skipTypewriter();
      }
      return;
    }
    if (this.state === 'WAITING') {
      if (key === 'e' || key === 'enter' || key === ' ') {
        this.state = 'CHOOSING'; this.selectedChoice = 0;
        console.log('[DialogueScene] → CHOOSING');
      }
      return;
    }
    if (this.state === 'RESPONSE') {
      if (key === 'e' || key === 'enter' || key === ' ') {
        if (this.isTyping) this.skipTypewriter();
      }
      return;
    }
    if (this.state === 'CHOOSING') {
      if      (key === 'w' || key === 'arrowup')   this.selectedChoice = Math.max(0, this.selectedChoice - 1);
      else if (key === 's' || key === 'arrowdown')  this.selectedChoice = Math.min(this.currentNode.options.length - 1, this.selectedChoice + 1);
      else if (key === 'e' || key === 'enter' || key === ' ') this.confirmChoice();
      return;
    }
  }

  // ── Dialogue flow ──────────────────────────────────────────────────────────

  private confirmChoice(): void {
    const option = this.currentNode.options[this.selectedChoice];
    if (!option) return;
    console.log(`[DialogueScene] Choice: "${option.text}" → ${option.next}`);

    if (option.next === 'exit') {
      this.state = 'FADE_OUT'; this.fadeElapsed = 0; return;
    }

    // Change music if option specifies a track
    if (option.musicTrack) {
      this.changeMusic(option.musicTrack);
    }

    this.pendingExpression = option.responseExpression;
    this.pendingNextNode   = option.next;

    if (!option.response?.trim()) {
      this.advanceToNextNode();
    } else {
      this.state = 'RESPONSE';
      this.startTypewriter(option.response);
    }
  }

  private advanceToNextNode(): void {
    const key  = this.pendingNextNode;
    if (!key) return;
    const next = this.tree[key];
    if (!next) {
      this.state = 'FADE_OUT'; this.fadeElapsed = 0; return;
    }
    console.log(`[DialogueScene] Node: "${key}"`);
    
    // Change music if node specifies a track
    if (next.musicTrack) {
      this.changeMusic(next.musicTrack);
    }
    
    this.currentNode     = next;
    this.pendingNextNode = null;
    this.selectedChoice  = 0;
    this.state           = 'TALKING';
    this.startTypewriter(this.currentNode.text);
  }

  // ── Dialogue box ───────────────────────────────────────────────────────────

  private renderBox(w: number, h: number): void {
    const boxX   = this.MARGIN;
    const boxY   = h - this.BOX_H - this.MARGIN;
    const boxW   = w - this.MARGIN * 2;
    const accent = this.character.accentColor;
    const tint   = this.character.accentTint;

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

    // Name plate
    const npW = this.measureStr(this.character.name, 14, 700) + 28;
    this.ctx.fillStyle = accent;
    this.rrect(boxX + this.BOX_PAD, boxY - 28, npW, 28, [6, 6, 0, 0]);
    this.ctx.fill();
    this.ctx.fillStyle    = '#FFFFFF';
    this.ctx.font         = '700 14px "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign    = 'left';
    this.ctx.fillText(this.character.name, boxX + this.BOX_PAD + 14, boxY - 14);

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