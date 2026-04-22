// ============================================================
//  Day2EndingScene.ts  —  Dinner with Lylia
// ============================================================

import lyliaNeutral from '../assets/images/characters/lylia/lylia_neutral.png';
import lyliaDisgruntled from '../assets/images/characters/lylia/lylia_disgruntled.png';
import dinnerBg from '../assets/images/endingscene_background/day2_diner_w_lylia.jpg';
import { SFX, BGM, playClipped, startLoop, fadeOutLoop } from '../core/audio';
import { isInteractKey } from '../core/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

type Expression = 'neutral' | 'disgruntled' | 'happy' | 'sad';
type Speaker = 'lylia' | 'player' | 'empty';

interface DialogueLine {
  speaker: Speaker;
  text: string;
  expression?: Expression;
  isChoice?: boolean;
  choices?: { text: string; next: number }[];
}

// ─── Dialogue script ──────────────────────────────────────────────────────────

const DIALOGUE: DialogueLine[] = [
  { speaker: 'empty', text: 'A tray with two plates of fragrant Chicken Rice appears on the table. You can practically smell the ginger and garlic.' },
  { speaker: 'lylia', text: 'I got you extra chilli as well.', expression: 'neutral' },
  { speaker: 'player', text: 'You are a godsend.', expression: 'happy' },
  { speaker: 'empty', text: 'You take a bite of the ultimate combo of roasted chicken, rice, and chilli.' },
  { speaker: 'empty', text: 'You practically melt in your seat as the explosion of flavour hits your tongue, a sharp contrast to the sterile smell of hand sanitiser that\'s been in your nose all day..' },
  { speaker: 'player', text: 'This is sooooo good.', expression: 'happy' },
  { speaker: 'empty', text: 'You attempt to say but the words come up garbled and muffled by the delicious contents of your mouth.' },
  { speaker: 'empty', text: 'Lylia swats at you endearlingly.' },
  { speaker: 'lylia', text: 'Yeah, yeah, I know. Don\'t eat with your mouth full.', expression: 'neutral' },
  { speaker: 'empty', text: 'She heaves a big sigh, her shoulders dropping as if the weight of her scrubs is finally too much to carry.' },
  { speaker: 'empty', text: 'She just stares at her plate, poking at a piece of chicken with her fork. She looks exhausted, not just sleepy, but drained.' },
  { speaker: 'player', text: 'Hey, you okay?', expression: 'happy' },
  { speaker: 'lylia', text: 'You know… I think I finally understand what people mean when they say "burnout." It\'s not just one thing, you know? It\'s... everything.\n\nI spent two hours today just doing paperwork for a discharge, while the patient in Bed 7 was crying because he was in pain and I couldn\'t get to him. We\'re so short-handed that I\'m doing the work of three people, and for what? To be yelled at by a family member because the water wasn\'t \'warm enough\'?', expression: 'disgruntled' },
  { speaker: 'empty', text: 'She meets your gaze, her expression strained, eyes dull with exhaustion.' },
  {
    speaker: 'player',
    text: '',
    isChoice: true,
    choices: [
      { text: 'Lylia, you\'re doing the best you can.', next: 15 },
      { text: 'Yeah, the workload is really too much at times!', next: 15 }
    ]
  },
  { speaker: 'empty', text: 'You squeeze her shoulder with one hand and hold her hand in another.' },
  { speaker: 'lylia', text: 'Aiya, whatever... if I keep talking about it, I might actually just walk back in there and hand in my badge tonight. Let\'s not talk about it anymore and just enjoy the chicken rice.', expression: 'neutral' },
  { speaker: 'empty', text: 'You manage to find your way back to laughter, but long after the plates were cleared, the haunting hollowness in her eyes remained etched in your mind, heavier than any double shift.' }
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
  result.element.onerror = () => console.error(`[Day2EndingScene] Failed to load: ${src}`);
  return result;
}

// ─── Scene states ─────────────────────────────────────────────────────────────

type SceneState = 'FADE_IN' | 'TALKING' | 'WAITING' | 'CHOOSING' | 'FADE_TO_DAY3' | 'SHOW_DAY3' | 'FADE_OUT';

// ─── Day2EndingScene ──────────────────────────────────────────────────────────

export class Day2EndingScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Images
  private background: LoadedImage;
  private lyliaSprites: Record<'neutral' | 'disgruntled', LoadedImage>;

  // Dialogue
  private currentLineIndex = 0;
  private currentLine!: DialogueLine;

  // Typewriter
  private displayedText = '';
  private fullText = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 28; // ms per character
  private isTyping = false;

  // Bob animation for sprite
  private bobOffset = 0;
  private bobTime = 0;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1; // 1 = black, 0 = clear
  private readonly FADE_SPEED = 0.04;

  // Title screen (DAY 3)
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 1200;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  // Layout constants
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;
  private readonly LINE_H = 40;
  // Lylia sprite tuning — synced with Day1EndingScene / Day4EndingScene
  private readonly CHAR_MAX_H = 1.2;
  private readonly CHAR_FOOT  = 1.2;

  // Colors (tint used for the subtle selected-option highlight)
  private readonly LYLIA_ACCENT = '#B5748A';
  private readonly PLAYER_ACCENT = '#5AC57A';
  private readonly PLAYER_TINT   = '#D4F5DC';

  // Choice system — keyboard only, matches DialogueScene
  private selectedChoice = 0;

  private playerName: string = 'Nurse';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Load images
    this.background = loadImage(dinnerBg);
    this.lyliaSprites = {
      neutral: loadImage(lyliaNeutral),
      disgruntled: loadImage(lyliaDisgruntled),
    };
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    console.log('[Day2EndingScene] Activating');

    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.currentLineIndex = 0;
    this.inputCooldown = 300;
    this.titleHoldTimer = 0;
    this.bobTime = 0;
    this.bobOffset = 0;
    this.selectedChoice = 0;
    this.day3Dispatched = false;

    // Load player name
    this.playerName = localStorage.getItem('playerName') || 'Nurse';

    // Prepare first line
    this.currentLine = DIALOGUE[0];

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    // Diner ambience — "people talking" loops through the whole scene,
    // jovial BGM starts atop it and swaps to emotional_contemplative when
    // Lylia's burnout beat lands (startLine(9)).
    startLoop(SFX.DINER_AMBIENCE, 0.22);
    startLoop(BGM.JOVIAL, 0.28);
  }

  public deactivate(): void {
    console.log('[Day2EndingScene] Deactivating');
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
    }
    // Fade out every audio layer the diner scene added
    fadeOutLoop(SFX.DINER_AMBIENCE, 900);
    fadeOutLoop(BGM.JOVIAL, 900);
    fadeOutLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 900);
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────

  private startLine(index: number): void {
    if (index >= DIALOGUE.length) {
      // Dialogue complete, start fade to DAY 3
      this.state = 'FADE_TO_DAY3';
      this.fadeAlpha = 0;
      return;
    }

    // Music beat — at "She heaves a big sigh, her shoulders dropping..." the
    // diner mood turns heavy. Crossfade jovial → emotional_contemplative.
    if (index === 9) {
      fadeOutLoop(BGM.JOVIAL, 900);
      startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.28);
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

  // ── Choice system (keyboard-only, matches DialogueScene) ──────────────────

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

    // Dev-only silent skip: `\` jumps straight to Day 3 hospital.
    if (e.key === '\\') {
      if (!this.day3Dispatched) {
        this.day3Dispatched = true;
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 3 }
        }));
      }
      this.state = 'FADE_OUT';
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
      } else if (key === 'e' || key === 'enter' || key === ' ') {
        this.confirmChoice();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
      return;
    }

    // Advance keys
    if (isInteractKey(e)) {
      e.preventDefault();
      playClipped(SFX.CHOICE, 1000, 0.35);

      if (this.state === 'TALKING' && this.isTyping) {
        this.skipTypewriter();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'WAITING') {
        this.advanceDialogue();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'SHOW_DAY3' && this.titleHoldTimer >= this.TITLE_HOLD_MS) {
        this.state = 'FADE_OUT';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(delta: number): void {
    // Cooldown
    if (this.inputCooldown > 0) {
      this.inputCooldown = Math.max(0, this.inputCooldown - delta);
    }

    // Fade in
    if (this.state === 'FADE_IN') {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
      if (this.fadeAlpha <= 0) {
        this.startLine(0);
      }
    }

    // Typewriter
    if (this.state === 'TALKING' && this.isTyping) {
      this.typewriterTimer += delta;
      while (this.typewriterTimer >= this.TYPEWRITER_SPEED && this.typewriterIndex < this.fullText.length) {
        this.typewriterTimer -= this.TYPEWRITER_SPEED;
        this.displayedText += this.fullText[this.typewriterIndex];
        this.typewriterIndex++;
      }
      if (this.typewriterIndex >= this.fullText.length) {
        this.isTyping = false;
        this.state = 'WAITING';
      }
    }

    // Bob animation — matches DialogueScene (faster & smaller when talking,
    // slower & subtler while idle; none during fade transitions).
    const talking  = this.state === 'TALKING';
    const idleBob  = this.state === 'WAITING' || this.state === 'CHOOSING';
    if (talking || idleBob) {
      this.bobTime += delta;
      this.bobOffset = talking
        ? Math.sin(this.bobTime / 280) * 4
        : Math.sin(this.bobTime / 800) * 2;
    }

    // Fade to Day 3
    if (this.state === 'FADE_TO_DAY3') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
      if (this.fadeAlpha >= 1) {
        this.state = 'SHOW_DAY3';
        this.titleHoldTimer = 0;
      }
    }

    // Show Day 3 title — fade the black overlay back out so the title is visible,
    // then wait for E after the hold timer elapses (matches Day 3+).
    if (this.state === 'SHOW_DAY3') {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
      if (this.titleHoldTimer < this.TITLE_HOLD_MS) {
        this.titleHoldTimer += delta;
      }
    }

    // Fade out and transition to Day 3 hospital
    if (this.state === 'FADE_OUT') {
      // Stay fully black while the transition dispatches — Game.ts handles the fade-in
      this.fadeAlpha = 1;
      if (!this.day3Dispatched) {
        this.day3Dispatched = true;
        console.log('[Day2EndingScene] Scene complete - transitioning to Day 3');
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 3 }
        }));
      }
    }
  }

  private day3Dispatched: boolean = false;

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;

    // Diner background is only shown during active dialogue. During the
    // DAY 3 title transition (FADE_TO_DAY3 / SHOW_DAY3 / FADE_OUT) the
    // scene stays on a pure black background so the title card reads
    // the same way the DAY 1 card did at the intro.
    const isDialogueState =
      this.state === 'TALKING' ||
      this.state === 'WAITING' ||
      this.state === 'CHOOSING' ||
      this.state === 'FADE_IN';

    if (isDialogueState && this.background.loaded) {
      ctx.drawImage(this.background.element, 0, 0, this.W, this.H);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Character sprite (only during dialogue, not during fade transitions)
    if (['TALKING', 'WAITING', 'CHOOSING'].includes(this.state)) {
      this.renderCharacter();
    }

    // Dialogue box or choices
    if (this.state === 'CHOOSING') {
      this.renderChoices();
    } else if (['TALKING', 'WAITING'].includes(this.state)) {
      this.renderDialogueBox();
    }

    // DAY 3 title (matches IntroScene DAY 1 style)
    if (this.state === 'SHOW_DAY3') {
      this.renderDayTitleCard('DAY 3');
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }
  }

  private renderCharacter(): void {
    const ctx = this.ctx;
    const line = this.currentLine;
    
    // Lylia stays on screen for the whole diner scene, including the empty
    // (description) lines — matches Day 1's convention.
    const sprite = this.lyliaSprites[line.expression as 'neutral' | 'disgruntled']
      || this.lyliaSprites.neutral;
    if (!sprite || !sprite.loaded) return;

    const img = sprite.element;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (!srcW || !srcH) return;

    // No upscale cap — matches Day 1 so CHAR_MAX_H drives size even on small PNGs.
    const maxDrawH = this.H * this.CHAR_MAX_H;
    const scale    = maxDrawH / srcH;
    const drawW    = srcW * scale;
    const drawH    = srcH * scale;

    const drawX = (this.W - drawW) / 2;
    const drawY = this.H * this.CHAR_FOOT - drawH + this.bobOffset;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  private renderDialogueBox(): void {
    const ctx = this.ctx;
    const line = this.currentLine;
    
    // Determine speaker name and color (matching DialogueScene style)
    let speakerName = '';
    let accentColor = this.LYLIA_ACCENT;
    
    if (line.speaker === 'lylia') {
      speakerName = 'Lylia';
      accentColor = this.LYLIA_ACCENT;
    } else if (line.speaker === 'player') {
      speakerName = this.playerName;
      accentColor = this.PLAYER_ACCENT;
    } else if (line.speaker === 'empty') {
      // No speaker name for action descriptions
      speakerName = '';
      accentColor = '#666666';
    }

    // Box dimensions
    const boxX = this.MARGIN;
    const boxY = this.H - this.BOX_H - this.MARGIN;
    const boxW = this.W - 2 * this.MARGIN;

    // Panel (matching DialogueScene style)
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    ctx.fill();

    // Left accent stripe
    ctx.fillStyle = accentColor;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    ctx.fill();

    // Top border line
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();

    // Name plate (only if speakerName is not empty)
    if (speakerName) {
      const npW = this.measureStr(speakerName, 14, 700) + 28;
      ctx.fillStyle = accentColor;
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
    const text = this.isTyping ? this.displayedText : this.fullText;
    this.wrapText(ctx, text, boxX + this.BOX_PAD + 8, boxY + 18, boxW - this.BOX_PAD * 2 - 8, 26);

    // Continue prompt (matching DialogueScene style)
    if (this.state === 'WAITING') {
      const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
      ctx.fillStyle = accentColor;
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

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  // Shared DAY X title card — matches IntroScene's DAY 1 styling
  private renderDayTitleCard(label: string): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;
    const ACCENT = '#7a9ab0';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);

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

    // "Press E to continue" pulse once hold timer has elapsed
    if (this.titleHoldTimer >= this.TITLE_HOLD_MS) {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = ACCENT;
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText('Press E to continue', w / 2, h / 2 + 120);
      ctx.globalAlpha = 1;
    }
  }

  // Helper functions for rounded rect and text measurement
  private rrect(x: number, y: number, w: number, h: number, r: number | number[]): void {
    this.ctx.beginPath();
    (this.ctx as any).roundRect(x, y, w, h, r);
  }

  private measureStr(text: string, size: number, weight: number): number {
    this.ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
    return this.ctx.measureText(text).width;
  }
}
