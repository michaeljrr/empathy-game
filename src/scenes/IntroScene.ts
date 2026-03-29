// ============================================================
//  IntroScene.ts  —  Prologue text crawl before gameplay
// ============================================================

// ── Beat definitions ──────────────────────────────────────────────────────────
// Each beat is one screen. The player presses E / Space / Enter to advance.
//
// type 'line'  : text appears in the dialogue-style box at the bottom.
// type 'title' : large centred title card (e.g. "DAY 1").
//
// Add, remove, or reorder entries here to change the prologue.

interface Beat {
  type: 'line' | 'title';
  text: string;
  // 'line' beats share a single narrator voice — no extra config needed.
  // 'title' beats render large centred text and briefly pause before allowing advance.
}

const BEATS: Beat[] = [
  { type: 'line',  text: 'Huh? You sure you want to become a nurse?' },
  { type: 'line',  text: 'Long hours, lower pay than an office job.' },
  { type: 'line',  text: 'Job so tiring... need to take care of all the patients.' },
  { type: 'title', text: 'DAY 1' },
];

// ── IntroScene ────────────────────────────────────────────────────────────────

export class IntroScene {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;

  // ── Layout constants (match DialogueScene) ────────────────────────────────
  private readonly BOX_H   = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN  = 16;
  // Narrator accent colour (muted blue-grey — neutral, no character)
  private readonly ACCENT  = '#7a9ab0';

  // ── Typewriter ────────────────────────────────────────────────────────────
  private displayedText   = '';
  private fullText        = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 30; // ms per character
  private isTyping = false;

  // ── Sequence state ────────────────────────────────────────────────────────
  private beatIndex = 0;
  private waitingForInput = false;

  // 'title' beats show for a minimum time before accepting input
  private titleHoldTimer = 0;
  private readonly TITLE_HOLD_MS = 800;

  // ── Fade ──────────────────────────────────────────────────────────────────
  private fadeAlpha = 1;        // 1 = black, 0 = clear
  private fadingIn  = true;     // true = fading in at start of beat
  private fadingOut = false;    // true = fading out before scene change
  private readonly FADE_SPEED = 0.04; // per frame

  // ── Input ─────────────────────────────────────────────────────────────────
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 100;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  private get W(): number { return (this.canvas as any).logicalWidth  || this.canvas.width;  }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    this.beatIndex        = 0;
    this.waitingForInput  = false;
    this.fadingIn         = true;
    this.fadingOut        = false;
    this.fadeAlpha        = 1;
    this.inputCooldown    = 300; // Prevent immediate input during fade-in
    this.titleHoldTimer   = 0;
    this.startBeat(0);

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(deltaMs: number): void {
    // Input cooldown
    if (this.inputCooldown > 0) this.inputCooldown -= deltaMs;

    // Fade in at start of each beat
    if (this.fadingIn) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
      if (this.fadeAlpha <= 0) this.fadingIn = false;
    }

    // Fade out at end (before handoff to hospital)
    if (this.fadingOut) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
      if (this.fadeAlpha >= 1) {
        window.dispatchEvent(new CustomEvent('sceneChange', { 
          detail: { scene: 'hospital', startDay: true, dayPatientCount: 3 } 
        }));
        this.fadingOut = false;
      }
      return; // don't process anything else while fading out
    }

    // Tick typewriter
    if (this.isTyping) {
      this.typewriterTimer += deltaMs;
      while (this.typewriterTimer >= this.TYPEWRITER_SPEED && this.typewriterIndex < this.fullText.length) {
        this.typewriterTimer   -= this.TYPEWRITER_SPEED;
        this.displayedText     += this.fullText[this.typewriterIndex++];
      }
      if (this.typewriterIndex >= this.fullText.length) {
        this.isTyping         = false;
        this.displayedText    = this.fullText;
        this.waitingForInput  = true;
      }
    }

    // Title hold timer prevents accidentally skipping DAY 1
    const beat = BEATS[this.beatIndex];
    if (beat?.type === 'title' && !this.isTyping && this.titleHoldTimer < this.TITLE_HOLD_MS) {
      this.titleHoldTimer += deltaMs;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w   = this.W;
    const h   = this.H;

    // Pure black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const beat = BEATS[this.beatIndex];
    if (!beat) return;

    if (beat.type === 'line') {
      this.renderNarratorBox(w, h);
    } else {
      this.renderTitleCard(w, h);
    }

    // "E to continue" for title card only (line beats render it inside the box)
    if (beat.type === 'title' && this.waitingForInput && this.canAdvance()) {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.globalAlpha  = pulse;
      ctx.fillStyle    = this.ACCENT;
      ctx.font         = '13px "Segoe UI", sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼  Press E to continue', w / 2, h * 0.72);
      ctx.globalAlpha = 1;
    }

    // Fade overlay (shared for both fade-in and fade-out)
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle   = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // ── Narrator dialogue box ──────────────────────────────────────────────────

  private renderNarratorBox(w: number, h: number): void {
    const ctx  = this.ctx;
    const boxX = this.MARGIN;
    const boxY = h - this.BOX_H - this.MARGIN;
    const boxW = w - this.MARGIN * 2;

    // Panel
    ctx.fillStyle = 'rgba(15, 20, 30, 0.92)';
    this.rrect(boxX, boxY, boxW, this.BOX_H, 14);
    ctx.fill();

    // Left accent stripe
    ctx.fillStyle = this.ACCENT;
    this.rrect(boxX, boxY, 5, this.BOX_H, [14, 0, 0, 14]);
    ctx.fill();

    // Top border line
    ctx.strokeStyle = this.ACCENT;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();

    // Body text (typewriter)
    ctx.fillStyle    = '#F0F0F0';
    ctx.font         = '16px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    this.wrapText(
      this.displayedText,
      boxX + this.BOX_PAD + 8,
      boxY + 18,
      boxW - this.BOX_PAD * 2 - 8,
      26
    );

    // "E to continue" — bottom-right inside box, always visible (pulses)
    const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 420)) * 0.55;
    ctx.fillStyle    = this.ACCENT;
    ctx.globalAlpha  = pulse;
    ctx.font         = '13px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'right';
    ctx.fillText('▼  E to continue', boxX + boxW - this.BOX_PAD, boxY + this.BOX_H - 16);
    ctx.textAlign   = 'left';
    ctx.globalAlpha = 1;
  }

  // ── Title card (DAY 1 etc.) ────────────────────────────────────────────────

  private renderTitleCard(w: number, h: number): void {
    const ctx = this.ctx;

    // Big DAY 1 text
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.displayedText, w / 2, h / 2);

    // Thin accent lines — spaced well clear of the 72px text (~50px half-height)
    ctx.strokeStyle = this.ACCENT;
    ctx.lineWidth   = 1.5;
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
  }

  // ── Beat sequencing ────────────────────────────────────────────────────────

  private startBeat(index: number): void {
    const beat = BEATS[index];
    if (!beat) return;

    this.displayedText   = '';
    this.fullText        = beat.text;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping        = true;
    this.waitingForInput = false;
    this.titleHoldTimer  = 0;
    this.fadingIn        = true;
    this.fadeAlpha       = 1;
  }

  private canAdvance(): boolean {
    const beat = BEATS[this.beatIndex];
    if (beat?.type === 'title') return this.titleHoldTimer >= this.TITLE_HOLD_MS;
    return true;
  }

  private advance(): void {
    if (!this.waitingForInput || !this.canAdvance()) return;

    const isLast = this.beatIndex >= BEATS.length - 1;
    if (isLast) {
      // Fade out then dispatch sceneChange with day info
      this.fadingOut       = true;
      this.waitingForInput = false;
    } else {
      this.beatIndex++;
      this.startBeat(this.beatIndex);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;
    const key = e.key.toLowerCase();

    if (key === 'e' || key === 'enter' || key === ' ') {
      if (this.isTyping) {
        // Skip typewriter
        this.isTyping        = false;
        this.displayedText   = this.fullText;
        this.typewriterIndex = this.fullText.length;
        this.waitingForInput = true;
        this.inputCooldown   = this.INPUT_COOLDOWN_MS;
      } else {
        this.advance();
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Rounded rect path (corners can be a single number or [tl, tr, br, bl]) */
  private rrect(x: number, y: number, w: number, h: number, r: number | [number,number,number,number]): void {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  /** Simple word-wrap text draw */
  private wrapText(text: string, x: number, y: number, maxW: number, lineH: number): void {
    const ctx    = this.ctx;
    const words  = text.split(' ');
    let   line   = '';
    let   lineY  = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, lineY);
        line  = word;
        lineY += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, lineY);
  }
}
