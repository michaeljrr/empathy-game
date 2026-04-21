// ============================================================
//  Day5EndingScene.ts  —  Walking home alone → DAY 6 → Code Blue
// ============================================================

import { SFX, playClipped } from '../core/audio';
import { isInteractKey } from '../core/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneState =
  | 'FADE_IN'
  | 'NARRATION'
  | 'WAITING'
  | 'FADE_TO_DAY6'
  | 'SHOW_DAY6'
  | 'HOLD_BLACK'
  | 'CODE_BLUE'
  | 'CODE_BLUE_EXIT'
  | 'DONE';

interface NarrationLine {
  text: string;
}

// ─── Narration ────────────────────────────────────────────────────────────────

const NARRATION: NarrationLine[] = [
  { text: "You already knew. Somewhere between the empty corridor and your colleague's shrug and two days of one word replies, some part of you already knew. The text just made it real." },
  { text: "There's a pang in your chest. Dull and sudden, like a bruise you forgot you had until someone pressed on it." },
  { text: 'You walk home alone today.' },
];

// ─── Day5EndingScene ──────────────────────────────────────────────────────────

export class Day5EndingScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Narration progress
  private narrationIndex = 0;
  private fullText = '';
  private displayedText = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 32;
  private isTyping = false;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1;
  private readonly FADE_SPEED = 0.04;

  // Title / Code Blue timers
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 1400;
  private blackHoldTimer = 0;
  private readonly BLACK_HOLD_MS = 600;
  private codeBlueEnterTime = 0;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  // Audio (ambulance siren on Code Blue — fails silently if asset missing)
  private ambulanceAudio: HTMLAudioElement | null = null;
  private ambulancePlayed = false;

  // Code Blue exit → Day 6 dispatch (player drives advancement with E)
  private day6Dispatched = false;

  // Code Blue typewriter — two identical calls that type one line at a time.
  // Player must press E to advance from the first line to the second, and E
  // again after the second line finishes to exit to Day 6.
  private readonly CODE_BLUE_TEXT = 'Code Blue, Ward 5!';
  private codeBlueLine1Len = 0;
  private codeBlueLine2Len = 0;
  private codeBlueLineIndex: 0 | 1 = 0;     // 0 = typing/waiting line 1, 1 = typing/waiting line 2
  private codeBlueLineDone = false;          // true once the current line is fully typed
  private codeBlueTypeTimer = 0;
  private readonly CODE_BLUE_TYPE_SPEED_MS = 70;

  // Layout (matches DialogueScene)
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;
  private readonly NARRATION_ACCENT = '#666666';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    console.log('[Day5EndingScene] Activating');

    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.inputCooldown = 300;
    this.narrationIndex = 0;
    this.fullText = '';
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.titleHoldTimer = 0;
    this.blackHoldTimer = 0;
    this.codeBlueEnterTime = 0;
    this.codeBlueLine1Len = 0;
    this.codeBlueLine2Len = 0;
    this.codeBlueLineIndex = 0;
    this.codeBlueLineDone = false;
    this.codeBlueTypeTimer = 0;
    this.ambulancePlayed = false;
    this.day6Dispatched = false;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    console.log('[Day5EndingScene] Deactivating');
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.ambulanceAudio) {
      this.ambulanceAudio.pause();
      this.ambulanceAudio.currentTime = 0;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;

    // Dev-only silent skip: `\` jumps straight to Day 6 hospital.
    if (e.key === '\\') {
      if (!this.day6Dispatched) {
        this.day6Dispatched = true;
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 1, day: 6 }
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
        // Advance to next narration line, or fade to DAY 6 if done
        this.narrationIndex++;
        if (this.narrationIndex >= NARRATION.length) {
          this.state = 'FADE_TO_DAY6';
        } else {
          this.startNarration(NARRATION[this.narrationIndex].text);
        }
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'SHOW_DAY6' && this.titleHoldTimer >= this.TITLE_HOLD_MS) {
        this.state = 'HOLD_BLACK';
        this.blackHoldTimer = 0;
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'CODE_BLUE') {
        // E controls progression through the two Code Blue lines.
        if (this.codeBlueLineIndex === 0) {
          if (!this.codeBlueLineDone) {
            // Skip typing of line 1
            this.codeBlueLine1Len = this.CODE_BLUE_TEXT.length;
            this.codeBlueLineDone = true;
          } else {
            // Advance to line 2
            this.codeBlueLineIndex = 1;
            this.codeBlueLineDone = false;
            this.codeBlueTypeTimer = 0;
          }
        } else {
          if (!this.codeBlueLineDone) {
            // Skip typing of line 2
            this.codeBlueLine2Len = this.CODE_BLUE_TEXT.length;
            this.codeBlueLineDone = true;
          } else {
            // Exit to Day 6
            this.state = 'CODE_BLUE_EXIT';
          }
        }
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
          this.startNarration(NARRATION[0].text);
        }
        break;

      case 'NARRATION':
        this.tickTypewriter(deltaMs);
        break;

      case 'WAITING':
        break;

      case 'FADE_TO_DAY6':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'SHOW_DAY6';
          this.titleHoldTimer = 0;
        }
        break;

      case 'SHOW_DAY6':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.titleHoldTimer < this.TITLE_HOLD_MS) {
          this.titleHoldTimer += deltaMs;
        }
        break;

      case 'HOLD_BLACK':
        // Fade title out and briefly hold pure black before Code Blue fires
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.blackHoldTimer += deltaMs;
          if (this.blackHoldTimer >= this.BLACK_HOLD_MS) {
            this.state = 'CODE_BLUE';
            this.codeBlueEnterTime = performance.now();
            this.tryPlayAmbulance();
          }
        }
        break;

      case 'CODE_BLUE': {
        // Keep fadeAlpha at 1 — the Code Blue text is rendered on top of black.
        this.fadeAlpha = 1;
        // Advance the current line's typewriter. Player uses E to skip or
        // advance between lines / exit once both lines are typed.
        const target = this.codeBlueLineIndex === 0 ? this.CODE_BLUE_TEXT.length : this.CODE_BLUE_TEXT.length;
        const currentLen = this.codeBlueLineIndex === 0 ? this.codeBlueLine1Len : this.codeBlueLine2Len;
        if (currentLen < target) {
          this.codeBlueTypeTimer += deltaMs;
          while (this.codeBlueTypeTimer >= this.CODE_BLUE_TYPE_SPEED_MS) {
            this.codeBlueTypeTimer -= this.CODE_BLUE_TYPE_SPEED_MS;
            if (this.codeBlueLineIndex === 0) {
              if (this.codeBlueLine1Len < this.CODE_BLUE_TEXT.length) this.codeBlueLine1Len++;
            } else {
              if (this.codeBlueLine2Len < this.CODE_BLUE_TEXT.length) this.codeBlueLine2Len++;
            }
          }
        }
        // Mark line done once it finishes typing
        const activeLen = this.codeBlueLineIndex === 0 ? this.codeBlueLine1Len : this.codeBlueLine2Len;
        this.codeBlueLineDone = activeLen >= this.CODE_BLUE_TEXT.length;
        break;
      }

      case 'CODE_BLUE_EXIT':
        // Brief hold, then dispatch to Day 6 hospital (Game.ts handles its own fade)
        this.fadeAlpha = 1;
        if (!this.day6Dispatched) {
          this.day6Dispatched = true;
          console.log('[Day5EndingScene] Dispatching to Day 6 hospital');
          window.dispatchEvent(new CustomEvent('sceneChange', {
            detail: { scene: 'hospital', startDay: true, dayPatientCount: 1, day: 6 }
          }));
          this.state = 'DONE';
        }
        break;

      case 'DONE':
        break;
    }
  }

  // ── Narration helpers ──────────────────────────────────────────────────────

  private startNarration(text: string): void {
    this.fullText = text;
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = true;
    this.state = 'NARRATION';
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

  // ── Audio ──────────────────────────────────────────────────────────────────

  private tryPlayAmbulance(): void {
    if (this.ambulancePlayed) return;
    this.ambulancePlayed = true;
    try {
      // Best-effort: look for an ambulance-ish SFX. Falls back to the outside
      // hospital street (vehicles) track if ambulance.mp3 isn't present.
      const src = '/src/assets/audio/sfx/ambulance.mp3';
      const audio = new Audio(src);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Fallback — try the outside street vehicles track
        const fallback = new Audio('/src/assets/audio/sfx/outside hospital street (vehicles).mp3');
        fallback.volume = 0.5;
        fallback.play().catch(() => {});
        this.ambulanceAudio = fallback;
      });
      this.ambulanceAudio = audio;
    } catch {
      /* silently fail */
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Black background throughout
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'NARRATION' || this.state === 'WAITING') {
      this.renderNarrationBox(w, h);
    }

    if (this.state === 'SHOW_DAY6' || (this.state === 'HOLD_BLACK' && this.fadeAlpha < 1)) {
      this.renderDay6Title(w, h);
    }

    if (this.state === 'CODE_BLUE') {
      this.renderCodeBlue(w, h);
    }

    // Fade overlay
    if (this.fadeAlpha > 0 && this.state !== 'CODE_BLUE') {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private renderNarrationBox(w: number, h: number): void {
    const ctx = this.ctx;
    const boxX = this.MARGIN;
    const boxY = h - this.BOX_H - this.MARGIN;
    const boxW = w - this.MARGIN * 2;
    const accent = this.NARRATION_ACCENT;

    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    ctx.fill();

    ctx.fillStyle = accent;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();

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

  private renderDay6Title(w: number, h: number): void {
    const ctx = this.ctx;
    const ACCENT = '#7a9ab0';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAY 6', w / 2, h / 2);

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

    if (this.titleHoldTimer >= this.TITLE_HOLD_MS && this.state === 'SHOW_DAY6') {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.globalAlpha = pulse;
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = ACCENT;
      ctx.fillText('Press E to continue', w / 2, h / 2 + 120);
      ctx.globalAlpha = 1;
    }
  }

  private renderCodeBlue(w: number, h: number): void {
    const ctx = this.ctx;

    // Pulsing white text on pure black — one line at a time. First line shows
    // while codeBlueLineIndex === 0, second line appears once the player
    // presses E and the index advances. Completed lines stay on screen.
    const t = performance.now() - this.codeBlueEnterTime;
    const pulse = 0.65 + Math.abs(Math.sin(t / 280)) * 0.35;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Line 1 — rendered whenever any chars have been typed for it
    if (this.codeBlueLine1Len > 0) {
      const typed1 = this.CODE_BLUE_TEXT.slice(0, this.codeBlueLine1Len);
      ctx.fillText(typed1, w / 2, h / 2 - 30);
      if (this.codeBlueLineIndex === 0 && this.codeBlueLine1Len < this.CODE_BLUE_TEXT.length) {
        const caret = Math.floor(performance.now() / 280) % 2 === 0 ? '|' : ' ';
        const textWidth = ctx.measureText(typed1).width;
        ctx.fillText(caret, w / 2 + textWidth / 2 + 4, h / 2 - 30);
      }
    }

    // Line 2 — only once the player has advanced past line 1
    if (this.codeBlueLineIndex === 1) {
      const typed2 = this.CODE_BLUE_TEXT.slice(0, this.codeBlueLine2Len);
      ctx.fillText(typed2, w / 2, h / 2 + 30);
      if (this.codeBlueLine2Len < this.CODE_BLUE_TEXT.length) {
        const caret = Math.floor(performance.now() / 280) % 2 === 0 ? '|' : ' ';
        const textWidth = ctx.measureText(typed2).width;
        ctx.fillText(caret, w / 2 + textWidth / 2 + 4, h / 2 + 30);
      }
    }

    ctx.restore();

    // E-to-continue hint — appears once the active line is finished typing
    if (this.codeBlueLineDone) {
      const p = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼  E to continue', w / 2, h - 60);
      ctx.restore();
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
