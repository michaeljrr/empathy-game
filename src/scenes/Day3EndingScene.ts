// ============================================================
//  Day3EndingScene.ts  —  Final narration + DAY 4 title card
// ============================================================

import { SFX, playClipped } from '../core/audio';
import { isInteractKey } from '../core/settings';

// ─── Scene states ─────────────────────────────────────────────────────────────

type SceneState = 'FADE_IN' | 'NARRATION' | 'WAITING' | 'FADE_TO_DAY4' | 'SHOW_DAY4' | 'FADE_OUT' | 'DONE';

// ─── Day3EndingScene ──────────────────────────────────────────────────────────

export class Day3EndingScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Typewriter
  private displayedText = '';
  private fullText = '(The chat sits on delivered. She doesn\'t reply.)';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 28;
  private isTyping = false;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1;
  private readonly FADE_SPEED = 0.04;

  // Title screen
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 1500;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  // Transition tracking
  private day4Dispatched: boolean = false;

  // Layout (matches DialogueScene)
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;

  // Muted narration accent (matches DialogueScene 'empty' speaker style)
  private readonly NARRATION_ACCENT = '#666666';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    console.log('[Day3EndingScene] Activating');

    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.inputCooldown = 300;
    this.titleHoldTimer = 0;
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.day4Dispatched = false;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    console.log('[Day3EndingScene] Deactivating');
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;

    // Dev-only silent skip: `\` jumps straight to Day 4 hospital.
    if (e.key === '\\') {
      if (!this.day4Dispatched) {
        this.day4Dispatched = true;
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 4 }
        }));
        this.state = 'DONE';
      }
      return;
    }

    if (isInteractKey(e)) {
      e.preventDefault();
      playClipped(SFX.CHOICE, 1000, 0.35);

      if (this.state === 'NARRATION' && this.isTyping) {
        this.isTyping = false;
        this.displayedText = this.fullText;
        this.state = 'WAITING';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'WAITING') {
        this.state = 'FADE_TO_DAY4';
        this.fadeAlpha = 0;
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'SHOW_DAY4' && this.titleHoldTimer >= this.TITLE_HOLD_MS) {
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
        if (this.fadeAlpha <= 0) {
          this.state = 'NARRATION';
          this.startTypewriter();
        }
        break;

      case 'NARRATION':
        this.tickTypewriter(deltaMs);
        break;

      case 'WAITING':
        break;

      case 'FADE_TO_DAY4':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'SHOW_DAY4';
          this.titleHoldTimer = 0;
        }
        break;

      case 'SHOW_DAY4':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.titleHoldTimer < this.TITLE_HOLD_MS) {
          this.titleHoldTimer += deltaMs;
        }
        break;

      case 'FADE_OUT':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'DONE';
        }
        break;

      case 'DONE':
        // Transition to Day 4 hospital once we're fully black
        if (!this.day4Dispatched) {
          this.day4Dispatched = true;
          console.log('[Day3EndingScene] Dispatching to Day 4 hospital');
          window.dispatchEvent(new CustomEvent('sceneChange', {
            detail: { scene: 'hospital', startDay: true, dayPatientCount: 3, day: 4 }
          }));
        }
        break;
    }
  }

  // ── Typewriter ─────────────────────────────────────────────────────────────

  private startTypewriter(): void {
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = true;
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

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Pure black background for the whole scene
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'NARRATION' || this.state === 'WAITING') {
      this.renderBox(w, h);
    }

    if (this.state === 'SHOW_DAY4' || this.state === 'FADE_OUT' || this.state === 'DONE') {
      this.renderDay4Title(w, h);
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private renderBox(w: number, h: number): void {
    const ctx = this.ctx;
    const boxX = this.MARGIN;
    const boxY = h - this.BOX_H - this.MARGIN;
    const boxW = w - this.MARGIN * 2;
    const accent = this.NARRATION_ACCENT;

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

    // Narration text (no name plate — empty speaker)
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

  private renderDay4Title(w: number, h: number): void {
    const ctx = this.ctx;
    const ACCENT = '#7a9ab0';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAY 4', w / 2, h / 2);

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

    if (this.titleHoldTimer >= this.TITLE_HOLD_MS && this.state === 'SHOW_DAY4') {
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
}
