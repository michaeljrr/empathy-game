// ============================================================
//  Day4EndingScene.ts  —  Break room with Lylia (quitting)
// ============================================================

import lyliaNeutral from '../assets/images/characters/lylia/lylia_neutral.png';
import lyliaDisgruntled from '../assets/images/characters/lylia/lylia_disgruntled.png';
import lyliaAngry from '../assets/images/characters/lylia/lylia_angry.png';
import breakRoomBg from '../assets/images/endingscene_background/day4_breakroom.png';
import { SFX, playClipped, startLoop, fadeOutLoop } from '../core/audio';
import { isInteractKey } from '../core/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

type Expression = 'neutral' | 'disgruntled' | 'angry';
type Speaker = 'lylia' | 'player' | 'empty';

interface DialogueLine {
  speaker: Speaker;
  text: string;
  expression?: Expression;
  isChoice?: boolean;
  choices?: { text: string; next: number }[];
  hideSprite?: boolean;
}

// ─── Dialogue script ──────────────────────────────────────────────────────────

const DIALOGUE: DialogueLine[] = [
  { speaker: 'empty', text: "She's already there when you arrive, still in her scrubs, sitting at the small table with a cup of something that has clearly gone cold. She's not drinking it. Just holding it with both hands and staring at the surface like it owes her something." },
  { speaker: 'player', text: 'Hey. Rough day?' },
  { speaker: 'lylia', text: 'When is it not?', expression: 'neutral' },
  { speaker: 'empty', text: 'You pull out the chair across from her and sit. The break room hums with a low drone. Somewhere down the corridor, a monitor beeps.' },
  { speaker: 'lylia', text: "You know what happened today? I had seven patients. Seven. Two of them were post-op, one was being prepped for emergency surgery, and my relief was forty minutes late. Forty minutes. And in between all of that I had a family member screaming at me at the nurses' station because I couldn't tell her exactly what time the doctor would come.", expression: 'disgruntled' },
  { speaker: 'player', text: 'Lylia...' },
  { speaker: 'lylia', text: "And I stood there and I smiled and I said I understand, I'm sorry, I'll find out for you. Because that's what we do, right? We just absorb it. All of it. Every single day.", expression: 'disgruntled' },
  { speaker: 'empty', text: 'Her grip tightens around the cup.' },
  { speaker: 'lylia', text: "I went to the toilet on my break and just sat there for five minutes doing nothing because it was the only place nobody could find me. Five minutes. That's all I needed. And even then I felt guilty for taking it.", expression: 'disgruntled' },
  { speaker: 'player', text: "That's not okay, Lylia. You shouldn't have to feel like that." },
  { speaker: 'lylia', text: "But that's the job, isn't it? That's what everyone keeps saying. That's the job. That's the job. Like if you say it enough times it stops being something that's wrong and just becomes something that is.", expression: 'angry' },
  { speaker: 'empty', text: 'She finally sets the cup down. Pushes it away slightly.' },
  { speaker: 'lylia', text: "I've been thinking about it for a while now. And I think... I think I'm done.", expression: 'neutral' },
  { speaker: 'player', text: "Done with today, you mean. You're just exhausted—" },
  { speaker: 'lylia', text: 'No.', expression: 'neutral' },
  { speaker: 'empty', text: 'She meets your eyes for the first time since you sat down.' },
  { speaker: 'lylia', text: "I mean done. I'm thinking of quitting.", expression: 'neutral' },
  { speaker: 'empty', text: 'The word lands like something dropped from a height. You stare at her. The vending machine hums. The monitor down the corridor keeps beeping.' },
  {
    speaker: 'player',
    text: '',
    isChoice: true,
    choices: [
      { text: "So that's it? You're just going to walk out? What about your patients — what about the people who actually need you here? What about me?", next: 19 },
      { text: "You think this is easy for anyone? I had a terrible day too, Lylia. We all do. But we don't just decide to quit and leave everyone behind.", next: 19 }
    ]
  },
  { speaker: 'lylia', text: "You know what, I don't even know why I'm surprised.", expression: 'angry' },
  { speaker: 'empty', text: "Her voice is very quiet. That's worse than if she had shouted." },
  { speaker: 'lylia', text: "I sat here and told you everything. Everything. And your first reaction is to make me feel worse about it. Just like everyone else.", expression: 'angry' },
  { speaker: 'player', text: "That's not what I—" },
  { speaker: 'lylia', text: "Then what are you saying? Because it sounds like you're saying I should just keep going until there's nothing left of me. Is that what you want? Is that what caring looks like to you?", expression: 'angry' },
  { speaker: 'player', text: "That's not—" },
  { speaker: 'lylia', text: "I have given everything to this place. Everything. And I am telling you right now, honestly, that I have nothing left to give. And you're angry at me for it.", expression: 'angry' },
  { speaker: 'empty', text: 'Her chair scrapes back. She stands up, and the quiet fury in her face is something you have never seen on her before. This is something rawer. Something that has been building for a very long time.' },
  { speaker: 'lylia', text: 'I thought you of all people would understand.', expression: 'angry' },
  { speaker: 'empty', text: 'She picks up her half full cup and rushes her way to the door.', hideSprite: true },
  { speaker: 'empty', text: 'You sit there in the empty break room. The vending machine hums. The monitor keeps beeping. You stare at the chair she was sitting in and try to remember the last time you asked her how she was and actually waited for the answer.', hideSprite: true },
  { speaker: 'empty', text: "You don't think you ever did.", hideSprite: true }
];

// ─── Image loader ─────────────────────────────────────────────────────────────

interface LoadedImage {
  element: HTMLImageElement;
  loaded: boolean;
}

function loadImage(src: string): LoadedImage {
  const result: LoadedImage = { element: new Image(), loaded: false };
  result.element.src = src;
  result.element.onload = () => { result.loaded = true; };
  result.element.onerror = () => console.error(`[Day4EndingScene] Failed to load: ${src}`);
  return result;
}

// ─── Scene states ─────────────────────────────────────────────────────────────

type SceneState = 'FADE_IN' | 'TALKING' | 'WAITING' | 'CHOOSING' | 'FADE_TO_DAY5' | 'SHOW_DAY5' | 'FADE_OUT' | 'DONE';

// ─── Day4EndingScene ──────────────────────────────────────────────────────────

export class Day4EndingScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Images
  private background: LoadedImage;
  private lyliaSprites: Record<Expression, LoadedImage>;

  // Dialogue
  private currentLineIndex = 0;
  private currentLine!: DialogueLine;

  // Typewriter
  private displayedText = '';
  private fullText = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 28;
  private isTyping = false;

  // Bob animation
  private bobOffset = 0;
  private bobTime = 0;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1;
  private readonly FADE_SPEED = 0.04;

  // Title
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 1500;

  // Transition tracking
  private day5Dispatched: boolean = false;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  // Layout
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;
  private readonly LINE_H = 40;
  // Lylia sprite tuning — synced with Day1EndingScene / Day2EndingScene
  private readonly CHAR_MAX_H = 1.2;
  private readonly CHAR_FOOT  = 1.2;

  // Colors
  private readonly LYLIA_ACCENT = '#B5748A';
  private readonly PLAYER_ACCENT = '#5AC57A';
  private readonly PLAYER_TINT   = '#D4F5DC';
  private readonly EMPTY_ACCENT = '#666666';

  // Choice — keyboard-driven, matches DialogueScene
  private selectedChoice = 0;

  private playerName = 'Nurse';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.background = loadImage(breakRoomBg);
    this.lyliaSprites = {
      neutral: loadImage(lyliaNeutral),
      disgruntled: loadImage(lyliaDisgruntled),
      angry: loadImage(lyliaAngry),
    };
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    console.log('[Day4EndingScene] Activating');

    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.currentLineIndex = 0;
    this.inputCooldown = 300;
    this.titleHoldTimer = 0;
    this.bobTime = 0;
    this.bobOffset = 0;
    this.selectedChoice = 0;
    this.day5Dispatched = false;

    this.playerName = localStorage.getItem('playerName') || 'Nurse';
    this.currentLine = DIALOGUE[0];

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    // Break-room ambience (quiet eating) runs under the whole Lylia chat
    startLoop(SFX.BREAK_ROOM_EAT, 0.28);
  }

  public deactivate(): void {
    console.log('[Day4EndingScene] Deactivating');
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    fadeOutLoop(SFX.BREAK_ROOM_EAT, 900);
  }

  // ── Dialogue flow ──────────────────────────────────────────────────────────

  private startLine(index: number): void {
    if (index >= DIALOGUE.length) {
      this.state = 'FADE_TO_DAY5';
      this.fadeAlpha = 0;
      return;
    }

    this.currentLineIndex = index;
    this.currentLine = DIALOGUE[index];

    if (this.currentLine.isChoice) {
      this.setupChoices();
      this.state = 'CHOOSING';
    } else {
      this.startTypewriter(this.currentLine.text);
      this.state = 'TALKING';
    }
  }

  private startTypewriter(text: string): void {
    this.fullText = text;
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = true;
  }

  private skipTypewriter(): void {
    this.isTyping = false;
    this.displayedText = this.fullText;
    this.state = 'WAITING';
  }

  private advanceDialogue(): void {
    this.startLine(this.currentLineIndex + 1);
  }

  // ── Choices (keyboard-only, matches DialogueScene) ─────────────────────────

  private setupChoices(): void {
    this.selectedChoice = 0;
  }

  private confirmChoice(): void {
    const choices = this.currentLine.choices;
    if (!choices || !choices[this.selectedChoice]) return;
    this.startLine(choices[this.selectedChoice].next);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;

    // Dev-only silent skip: `\` jumps straight to Day 5 hospital.
    if (e.key === '\\') {
      if (!this.day5Dispatched) {
        this.day5Dispatched = true;
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 5 }
        }));
        this.state = 'DONE';
      }
      return;
    }

    const key = e.key.toLowerCase();

    // Choice navigation — W/S or arrows, E/Space/Enter to confirm
    if (this.state === 'CHOOSING') {
      const choices = this.currentLine.choices || [];
      if (key === 'w' || key === 'arrowup') {
        const prev = this.selectedChoice;
        this.selectedChoice = Math.max(0, this.selectedChoice - 1);
        if (this.selectedChoice !== prev) playClipped(SFX.CHOICE, 1000, 0.45);
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (key === 's' || key === 'arrowdown') {
        const prev = this.selectedChoice;
        this.selectedChoice = Math.min(choices.length - 1, this.selectedChoice + 1);
        if (this.selectedChoice !== prev) playClipped(SFX.CHOICE, 1000, 0.45);
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (isInteractKey(e)) {
        this.confirmChoice();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
      return;
    }

    if (isInteractKey(e)) {
      e.preventDefault();
      playClipped(SFX.CHOICE, 1000, 0.35);

      if (this.state === 'TALKING' && this.isTyping) {
        this.skipTypewriter();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'WAITING') {
        this.advanceDialogue();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'SHOW_DAY5' && this.titleHoldTimer >= this.TITLE_HOLD_MS) {
        this.state = 'FADE_OUT';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(deltaMs: number): void {
    if (this.inputCooldown > 0) this.inputCooldown -= deltaMs;

    switch (this.state) {
      case 'FADE_IN':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.fadeAlpha <= 0) this.startLine(0);
        break;

      case 'TALKING':
        this.tickTypewriter(deltaMs);
        this.tickBob(deltaMs, true);
        break;

      case 'WAITING':
        this.tickBob(deltaMs, false);
        break;

      case 'CHOOSING':
        this.tickBob(deltaMs, false);
        break;

      case 'FADE_TO_DAY5':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'SHOW_DAY5';
          this.titleHoldTimer = 0;
        }
        break;

      case 'SHOW_DAY5':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.titleHoldTimer < this.TITLE_HOLD_MS) {
          this.titleHoldTimer += deltaMs;
        }
        break;

      case 'FADE_OUT':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) this.state = 'DONE';
        break;

      case 'DONE':
        if (!this.day5Dispatched) {
          this.day5Dispatched = true;
          console.log('[Day4EndingScene] Dispatching to Day 5 hospital');
          window.dispatchEvent(new CustomEvent('sceneChange', {
            detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 5 }
          }));
        }
        break;
    }
  }

  private tickTypewriter(deltaMs: number): void {
    if (!this.isTyping) return;
    this.typewriterTimer += deltaMs;
    while (this.typewriterTimer >= this.TYPEWRITER_SPEED && this.typewriterIndex < this.fullText.length) {
      this.typewriterTimer -= this.TYPEWRITER_SPEED;
      this.displayedText += this.fullText[this.typewriterIndex++];
    }
    if (this.typewriterIndex >= this.fullText.length) {
      this.isTyping = false;
      this.displayedText = this.fullText;
      this.state = 'WAITING';
    }
  }

  private tickBob(deltaMs: number, speaking: boolean): void {
    this.bobTime += deltaMs;
    this.bobOffset = speaking
      ? Math.sin(this.bobTime / 280) * 4
      : Math.sin(this.bobTime / 800) * 2;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Break-room bg is only shown during active dialogue. During the DAY 5
    // title transition (FADE_TO_DAY5 / SHOW_DAY5 / FADE_OUT / DONE) the
    // scene stays on a pure black background — same convention as Day 1/2.
    const isDialogueState =
      this.state === 'TALKING' ||
      this.state === 'WAITING' ||
      this.state === 'CHOOSING' ||
      this.state === 'FADE_IN';

    if (isDialogueState) {
      this.renderBreakRoomBg(w, h);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }

    if (['TALKING', 'WAITING', 'CHOOSING'].includes(this.state) && !this.currentLine.hideSprite) {
      this.renderLyliaSprite(w, h);
    }

    if (this.state === 'CHOOSING') {
      this.renderChoices();
    } else if (['TALKING', 'WAITING'].includes(this.state)) {
      this.renderBox(w, h);
    }

    if (this.state === 'SHOW_DAY5' || this.state === 'FADE_OUT' || this.state === 'DONE') {
      this.renderDay5Title(w, h);
    }

    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // Break-room background image (day4_breakroom.png)
  private renderBreakRoomBg(w: number, h: number): void {
    const ctx = this.ctx;
    if (this.background.loaded) {
      ctx.drawImage(this.background.element, 0, 0, w, h);
    } else {
      // Fallback while the image is still loading
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Mirrors DialogueScene.drawSprite exactly
  private renderLyliaSprite(w: number, h: number): void {
    const expression = this.currentLine.expression || 'neutral';
    const sprite = this.lyliaSprites[expression];
    if (!sprite.loaded) return;

    const img = sprite.element;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (!srcW || !srcH) return;

    // No upscale cap — matches Day 1 so CHAR_MAX_H drives size even on small PNGs.
    const maxDrawH = h * this.CHAR_MAX_H;
    const scale    = maxDrawH / srcH;
    const drawW    = srcW * scale;
    const drawH    = srcH * scale;

    const drawX = (w - drawW) / 2;
    const drawY = h * this.CHAR_FOOT - drawH + this.bobOffset;

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  private renderBox(w: number, h: number): void {
    const ctx = this.ctx;
    const boxX = this.MARGIN;
    const boxY = h - this.BOX_H - this.MARGIN;
    const boxW = w - this.MARGIN * 2;

    const line = this.currentLine;
    let speakerName = '';
    let accent = this.EMPTY_ACCENT;

    if (line.speaker === 'lylia') {
      speakerName = 'Lylia';
      accent = this.LYLIA_ACCENT;
    } else if (line.speaker === 'player') {
      speakerName = this.playerName;
      accent = this.PLAYER_ACCENT;
    }

    // Panel
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    ctx.fill();

    // Left accent stripe
    ctx.fillStyle = accent;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    ctx.fill();

    // Top border line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();

    // Name plate
    if (speakerName) {
      const npW = this.measureStr(speakerName, 14, 700) + 28;
      ctx.fillStyle = accent;
      this.rrect(boxX + this.BOX_PAD, boxY - 28, npW, 28, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 14px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(speakerName, boxX + this.BOX_PAD + 14, boxY - 14);
    }

    // Dialogue text
    ctx.fillStyle = '#F0F0F0';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    this.wrapText(
      this.displayedText,
      boxX + this.BOX_PAD + 8,
      boxY + 18,
      boxW - this.BOX_PAD * 2 - 8,
      26
    );

    if (this.state === 'WAITING') {
      const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
      ctx.fillStyle = accent;
      ctx.globalAlpha = pulse;
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText('▼  E to continue', boxX + boxW - this.BOX_PAD, boxY + this.BOX_H - 16);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  // Choice list rendered inside the same dialogue panel, matching DialogueScene exactly
  private renderChoices(): void {
    const ctx = this.ctx;
    const boxX = this.MARGIN;
    const boxY = this.H - this.BOX_H - this.MARGIN;
    const boxW = this.W - 2 * this.MARGIN;
    const accent = this.PLAYER_ACCENT;
    const tint   = this.PLAYER_TINT;

    // Panel
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    ctx.fill();

    // Left accent stripe
    ctx.fillStyle = accent;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    ctx.fill();

    // Top border line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();

    // Nav hint
    ctx.fillStyle    = 'rgba(200,200,200,0.5)';
    ctx.font         = '11px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    ctx.fillText('W / S  to move   ·   E to choose', boxX + this.BOX_PAD + 8, boxY + 10);

    // Options
    const startY = boxY + 30;
    const choices = this.currentLine.choices || [];
    choices.forEach((opt, i) => {
      const iy  = startY + i * this.LINE_H;
      const sel = i === this.selectedChoice;

      if (sel) {
        ctx.fillStyle = `${tint}33`;
        this.rrect(boxX + this.BOX_PAD, iy, boxW - this.BOX_PAD * 2, this.LINE_H - 6, 6);
        ctx.fill();
        ctx.fillStyle = accent;
        this.rrect(boxX + this.BOX_PAD, iy, 3, this.LINE_H - 6, [3, 0, 0, 3]);
        ctx.fill();
      }

      ctx.font         = '13px "Segoe UI", sans-serif';
      ctx.fillStyle    = sel ? accent : 'rgba(200,200,200,0.4)';
      ctx.textBaseline = 'middle';
      ctx.fillText(sel ? '▶' : '◦', boxX + this.BOX_PAD + 8, iy + (this.LINE_H - 6) / 2);

      ctx.font      = `${sel ? '600' : '400'} 15px "Segoe UI", sans-serif`;
      ctx.fillStyle = sel ? '#FFFFFF' : 'rgba(220,220,220,0.7)';
      ctx.fillText(opt.text, boxX + this.BOX_PAD + 24, iy + (this.LINE_H - 6) / 2);
    });
  }

  private renderDay5Title(w: number, h: number): void {
    const ctx = this.ctx;
    const ACCENT = '#7a9ab0';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAY 5', w / 2, h / 2);

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h / 2 - 80);
    ctx.lineTo(w * 0.7, h / 2 - 80);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h / 2 + 64);
    ctx.lineTo(w * 0.7, h / 2 + 64);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (this.titleHoldTimer >= this.TITLE_HOLD_MS && this.state === 'SHOW_DAY5') {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.globalAlpha = pulse;
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = ACCENT;
      ctx.fillText('Press E to continue', w / 2, h / 2 + 120);
      ctx.globalAlpha = 1;
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
        cy += lh;
      } else {
        line = test;
      }
    }
    if (line.trim()) this.ctx.fillText(line.trimEnd(), x, cy);
  }

  private measureStr(text: string, size: number, weight: number): number {
    this.ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
    return this.ctx.measureText(text).width;
  }
}
