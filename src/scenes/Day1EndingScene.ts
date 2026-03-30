// ============================================================
//  Day1EndingScene.ts  —  Dialogue with Lylia after work
// ============================================================

import lyliaNeutral from '../assets/images/characters/lylia/lylia_neutral.png';
import lyliaDisgruntled from '../assets/images/characters/lylia/lylia_disgruntled.png';
import outsideHospitalBg from '../assets/images/hospital/day1_outsideofhospitalwlylia.png';

// ─── Types ────────────────────────────────────────────────────────────────────

type Expression = 'neutral' | 'disgruntled';
type Speaker = 'lylia' | 'player';

interface DialogueLine {
  speaker: Speaker;
  text: string;
  expression?: Expression; // Only for Lylia
}

// ─── Dialogue script ──────────────────────────────────────────────────────────

const DIALOGUE: DialogueLine[] = [
  { speaker: 'lylia', text: 'I saw you earlier, did I see your patient hand you cookies?', expression: 'neutral' },
  { speaker: 'player', text: 'Yeah, she\'s discharging! I\'m so happy for her. From being unable to move her legs to walking out today... really feels like we did something good, you know?' },
  { speaker: 'lylia', text: 'It\'s part of the job, anyways do remember to not get too attached to the patients, they always come and go. Just like the one that used to be at bed D for your ward, I think he passed away.', expression: 'disgruntled' },
  { speaker: 'player', text: 'Oh. I didn\'t know that…' },
  { speaker: 'lylia', text: 'Mhm. Happens.', expression: 'neutral' },
  { speaker: 'player', text: 'That\'s… a bit sad, isn\'t it?' },
  { speaker: 'lylia', text: 'If you keep feeling sad for every single one of your patients, you won\'t survive here.', expression: 'disgruntled' },
  { speaker: 'player', text: '…so you just don\'t feel anything?' },
  { speaker: 'lylia', text: 'You feel it the first few times. Then you realise it doesn\'t change anything.', expression: 'neutral' },
  { speaker: 'player', text: 'But… he was someone\'s family. Someone was waiting for him.' },
  { speaker: 'lylia', text: 'And tomorrow, there\'ll be another patient in that same bed.', expression: 'neutral' },
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
  result.element.onerror = () => console.error(`[Day1EndingScene] Failed to load: ${src}`);
  return result;
}

// ─── Scene states ─────────────────────────────────────────────────────────────

type SceneState = 'FADE_IN' | 'TALKING' | 'WAITING' | 'FADE_TO_DAY2' | 'SHOW_DAY2' | 'FADE_OUT';

// ─── Day1EndingScene ──────────────────────────────────────────────────────────

export class Day1EndingScene {
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
  private readonly TYPEWRITER_SPEED = 28; // ms per character
  private isTyping = false;

  // Bob animation for Lylia sprite
  private bobOffset = 0;
  private bobTime = 0;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1; // 1 = black, 0 = clear
  private readonly FADE_SPEED = 0.04;

  // Title screen (DAY 2)
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 1200;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  // Layout constants (matching DialogueScene)
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;
  private readonly CHAR_MAX_H = 1.3;  // max height the sprite may occupy

  // Colors
  private readonly LYLIA_ACCENT = '#B5748A';
  private readonly PLAYER_ACCENT = '#5AC57A';

  private playerName: string = 'Nurse';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Load images
    this.background = loadImage(outsideHospitalBg);
    this.lyliaSprites = {
      neutral: loadImage(lyliaNeutral),
      disgruntled: loadImage(lyliaDisgruntled),
    };
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    console.log('[Day1EndingScene] Activating');
    
    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.currentLineIndex = 0;
    this.inputCooldown = 300;
    this.titleHoldTimer = 0;
    this.bobTime = 0;
    this.bobOffset = 0;

    // Load player name
    this.playerName = localStorage.getItem('playerName') || 'Nurse';

    // Prepare first line (but don't start it yet - wait for fade in to complete)
    this.currentLine = DIALOGUE[0];

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    console.log('[Day1EndingScene] Deactivating');
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
    }
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────

  private startLine(index: number): void {
    if (index >= DIALOGUE.length) {
      // Dialogue complete, start fade to DAY 2
      this.state = 'FADE_TO_DAY2';
      this.fadeAlpha = 0;
      return;
    }

    this.currentLineIndex = index;
    this.currentLine = DIALOGUE[index];
    this.startTypewriter(this.currentLine.text);
    this.state = 'TALKING';
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

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;

    // Advance keys
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      
      if (this.state === 'TALKING' && this.isTyping) {
        // Skip typewriter
        this.skipTypewriter();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'WAITING') {
        // Advance to next line
        this.advanceDialogue();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'SHOW_DAY2' && this.titleHoldTimer >= this.TITLE_HOLD_MS) {
        // Skip to hospital Day 2
        this.state = 'FADE_OUT';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(deltaMs: number): void {
    // Input cooldown
    if (this.inputCooldown > 0) this.inputCooldown -= deltaMs;

    // State machine
    switch (this.state) {
      case 'FADE_IN':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.fadeAlpha <= 0) {
          // Fade complete - start first line
          this.startLine(0);
        }
        break;

      case 'TALKING':
        this.tickTypewriter(deltaMs);
        this.tickBob(deltaMs, true);
        break;

      case 'WAITING':
        this.tickBob(deltaMs, false);
        break;

      case 'FADE_TO_DAY2':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'SHOW_DAY2';
          this.titleHoldTimer = 0;
        }
        break;

      case 'SHOW_DAY2':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.titleHoldTimer < this.TITLE_HOLD_MS) {
          this.titleHoldTimer += deltaMs;
        }
        break;

      case 'FADE_OUT':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          // Transition to hospital Day 2
          window.dispatchEvent(new CustomEvent('sceneChange', {
            detail: { scene: 'hospital', startDay: true, dayPatientCount: 3 }
          }));
        }
        break;
    }
  }

  // ── Typewriter ─────────────────────────────────────────────────────────────

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

  // ── Bob ────────────────────────────────────────────────────────────────────

  private tickBob(deltaMs: number, speaking: boolean): void {
    const speed = speaking ? 0.008 : 0.004;
    const amp = speaking ? 8 : 4;
    this.bobTime += deltaMs * speed;
    this.bobOffset = Math.sin(this.bobTime) * amp;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Render based on state
    if (this.state === 'SHOW_DAY2') {
      this.renderDay2Title(w, h);
    } else if (this.state !== 'FADE_TO_DAY2' && this.state !== 'FADE_OUT') {
      this.renderDialogue(w, h);
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private renderDialogue(w: number, h: number): void {
    const ctx = this.ctx;

    // Draw background (expanded and cropped from top to show bottom)
    if (this.background.loaded) {
      const img = this.background.element;
      const bgAspect = img.width / img.height;
      const canvasAspect = w / h;

      let drawWidth, drawHeight, offsetX, offsetY;

      // Expand to fill canvas, crop from top to show bottom
      if (canvasAspect > bgAspect) {
        // Canvas is wider - fit to width
        drawWidth = w;
        drawHeight = w / bgAspect;
        offsetX = 0;
        offsetY = -(drawHeight - h); // Shift up to show bottom
      } else {
        // Canvas is taller - fit to height
        drawHeight = h;
        drawWidth = h * bgAspect;
        offsetX = (w - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    // Don't draw sprite or dialogue box during FADE_IN
    if (this.state === 'FADE_IN') {
      return;
    }

    // Draw Lylia sprite (always visible to keep her in frame)
    this.drawLyliaSprite(w, h);

    // Draw dialogue box
    this.renderBox(w, h);
  }

  private drawLyliaSprite(w: number, h: number): void {
    const expression = this.currentLine.expression || 'neutral';
    const sprite = this.lyliaSprites[expression];
    if (!sprite.loaded) return;

    const img = sprite.element;
    const ctx = this.ctx;

    // Calculate sprite dimensions - positioned higher to keep her in frame
    const maxH = h * this.CHAR_MAX_H;
    const footY = h * 0.95; // Position lower (was 1.3) to keep feet visible
    
    let dw = img.width;
    let dh = img.height;
    
    if (dh > maxH) {
      const scale = maxH / dh;
      dw *= scale;
      dh = maxH;
    }

    const dx = (w - dw) / 2;
    const dy = footY - dh + this.bobOffset;

    ctx.drawImage(img, dx, dy, dw, dh);
  }

  private renderBox(w: number, h: number): void {
    const ctx = this.ctx;
    const boxX = this.MARGIN;
    const boxY = h - this.BOX_H - this.MARGIN;
    const boxW = w - this.MARGIN * 2;

    // Determine speaker colors
    const isLylia = this.currentLine.speaker === 'lylia';
    const speakerName = isLylia ? 'Lylia' : this.playerName;
    const accent = isLylia ? this.LYLIA_ACCENT : this.PLAYER_ACCENT;

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
    const npW = this.measureStr(speakerName, 14, 700) + 28;
    ctx.fillStyle = accent;
    this.rrect(boxX + this.BOX_PAD, boxY - 28, npW, 28, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(speakerName, boxX + this.BOX_PAD + 14, boxY - 14);

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

    // Continue prompt
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

  private renderDay2Title(w: number, h: number): void {
    const ctx = this.ctx;

    // Large centered "DAY 2" text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAY 2', w / 2, h / 2);

    // Subtitle hint (if hold timer elapsed)
    if (this.titleHoldTimer >= this.TITLE_HOLD_MS) {
      const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
      ctx.globalAlpha = pulse;
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText('Press E to continue', w / 2, h / 2 + 80);
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
