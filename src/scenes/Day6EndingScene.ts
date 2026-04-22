// ============================================================
//  Day6EndingScene.ts  —  Uncle Lim's letter + final narration + thank you
// ============================================================

import paperImage from '../assets/images/items/paper.png';
import { SFX, BGM, playOnce, playClipped, startLoop, fadeOutLoop } from '../core/audio';
import { isInteractKey } from '../core/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneState =
  | 'FADE_IN'
  | 'LETTER_REVEAL'
  | 'LETTER_READING'
  | 'LETTER_FADE_OUT'
  | 'NARRATION'
  | 'NARRATION_WAIT'
  | 'FADE_TO_THANKS'
  | 'THANKS_HOLD_BLACK'
  | 'THANKS'
  | 'FADE_TO_MAIN'
  | 'DONE';

// Final narration beats (after the letter is dismissed)
const NARRATION: string[] = [
  "You read it once. Then again. The nurses' station hums around you, phones ringing, footsteps passing, the ordinary noise of a ward that does not stop for grief.",
  'But somewhere in the middle of all that noise, something in your chest loosens. Just slightly. Just enough.',
  "You fold the letter carefully along its original creases. You think about the kopi he never got to drink. The kakis waiting at the coffee shop. The plain water he promised you he'd switch to, laughing, his eyes crinkling at the corners.",
  'You think about what he said. Pass on the kindness. A promise is a promise.',
  'You tuck the letter into the pocket closest to your chest.',
  'Then you look up. Down the corridor, Bed B is waiting. Bed D is waiting. Somewhere down the ward a bell is ringing and someone needs you and the day is not over yet.',
  'You pick up your clipboard.',
  "And for the first time in days, walking back into the ward doesn't feel like something you have to survive.",
  'It feels like something worth doing.',
];

// ─── Paper image loader ───────────────────────────────────────────────────────

interface LoadedImage {
  element: HTMLImageElement;
  loaded: boolean;
}

function loadImage(src: string): LoadedImage {
  const result: LoadedImage = { element: new Image(), loaded: false };
  result.element.src = src;
  result.element.onload = () => { result.loaded = true; };
  result.element.onerror = () => console.error(`[Day6EndingScene] Failed to load: ${src}`);
  return result;
}

// ─── Day6EndingScene ──────────────────────────────────────────────────────────

export class Day6EndingScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Paper asset for the letter
  private paper: LoadedImage;

  // State
  private state: SceneState = 'FADE_IN';
  private fadeAlpha = 1;
  private readonly FADE_SPEED = 0.04;

  // Letter reveal
  private letterRevealProgress = 0;    // 0 → 1
  private readonly LETTER_REVEAL_SPEED = 0.005;

  // Narration typewriter
  private narrationIndex = 0;
  private fullText = '';
  private displayedText = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private readonly TYPEWRITER_SPEED = 30;
  private isTyping = false;

  // Thanks timers
  private thanksHoldTimer = 0;
  private readonly THANKS_HOLD_BLACK_MS = 3000; // 3 seconds of pure black before "thank you"
  private thanksFadeIn = 0; // 0..1, fades "thank you" panel in once shown
  private readonly THANKS_FADE_IN_SPEED = 0.025;

  // Back-to-main button (shown during THANKS state) — pixel-art style matching EntryScene
  private backBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private backBtnHovered = false;
  private backBtnClickFlash = 0;

  // Mouse tracking
  private mouseX = 0;
  private mouseY = 0;

  // Input
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 180;
  private boundKeyDown!: (e: KeyboardEvent) => void;
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundClick!: (e: MouseEvent) => void;

  // ── Paper / letter layout (TUNE THESE) ───────────────────────────────────
  // Paper size — fractions of canvas width / height. 1.0 = full canvas.
  private readonly PAPER_WIDTH_PCT  = 0.9;
  private readonly PAPER_HEIGHT_PCT = 1.5;
  // Paper position offset from centre (pixels). + = right / down.
  private readonly PAPER_OFFSET_X = 0;
  private readonly PAPER_OFFSET_Y = 0;
  // Inner padding for text — fraction of the paper's longest edge.
  private readonly PAPER_PADDING_PCT = 0.2;

  // Text sizes (px) — change each independently.
  private readonly TEXT_GREETING_SIZE    = 30; // "Dear Nurse,"
  private readonly TEXT_BODY_SIZE        = 22; // body paragraphs
  private readonly TEXT_BODY_LINE_H      = 32; // body line-height
  private readonly TEXT_BODY_PARA_GAP    = 16; // gap between paragraphs
  private readonly TEXT_SIGNOFF_SIZE     = 26; // "Yours sincerely," / "Your friend,"
  private readonly TEXT_SIGNOFF_NAME_SIZE = 32; // "Uncle Lim"

  // Layout (matches DialogueScene)
  private readonly BOX_H = 180;
  private readonly BOX_PAD = 22;
  private readonly MARGIN = 16;
  private readonly NARRATION_ACCENT = '#666666';

  // Letter sign-off accent
  private readonly LETTER_ACCENT = '#5B8FA8';

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.paper = loadImage(paperImage);
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Dev helper — jump straight into the fully-revealed letter state so the
  // paper UI can be tuned without replaying the whole game. Called from
  // Game.ts' DEBUG_START_AT_PAPER boot flag.
  public debugSkipToLetter(): void {
    this.state = 'LETTER_READING';
    this.fadeAlpha = 0;
    this.letterRevealProgress = 1;
  }

  public activate(): void {
    console.log('[Day6EndingScene] Activating');

    this.state = 'FADE_IN';
    this.fadeAlpha = 1;
    this.inputCooldown = 300;
    this.letterRevealProgress = 0;
    this.narrationIndex = 0;
    this.fullText = '';
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.thanksHoldTimer = 0;
    this.thanksFadeIn = 0;
    this.backBtnHovered = false;
    this.backBtnClickFlash = 0;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('click', this.boundClick);

    // end_bgm is started in Day 6 Bed A's reveal (DialogueScene) and should
    // carry through the letter → narration → thank-you screen. Safety net:
    // if the dialogue's version already stopped for any reason, this picks
    // it back up; otherwise it's idempotent (startLoop no-ops if running).
    startLoop(BGM.END, 0.3);
  }

  public deactivate(): void {
    console.log('[Day6EndingScene] Deactivating');
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundMouseMove) this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundClick) this.canvas.removeEventListener('click', this.boundClick);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.inputCooldown > 0) return;

    // Dev-only silent skip: `\` fast-forwards through everything.
    if (e.key === '\\') {
      this.state = 'FADE_TO_THANKS';
      this.fadeAlpha = 0;
      return;
    }

    if (isInteractKey(e)) {
      e.preventDefault();
      playClipped(SFX.CHOICE, 1000, 0.35);

      if (this.state === 'LETTER_REVEAL') {
        // Snap letter fully open
        this.letterRevealProgress = 1;
        this.state = 'LETTER_READING';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'LETTER_READING') {
        // Dismiss letter, begin narration
        this.state = 'LETTER_FADE_OUT';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'NARRATION' && this.isTyping) {
        this.isTyping = false;
        this.displayedText = this.fullText;
        this.state = 'NARRATION_WAIT';
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      } else if (this.state === 'NARRATION_WAIT') {
        this.narrationIndex++;
        if (this.narrationIndex >= NARRATION.length) {
          this.state = 'FADE_TO_THANKS';
        } else {
          this.startNarration(NARRATION[this.narrationIndex]);
        }
        this.inputCooldown = this.INPUT_COOLDOWN_MS;
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.W / rect.width;
    const scaleY = this.H / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;

    if (this.state === 'THANKS') {
      const b = this.backBtnRect;
      const wasHovered = this.backBtnHovered;
      this.backBtnHovered =
        this.mouseX >= b.x && this.mouseX <= b.x + b.w &&
        this.mouseY >= b.y && this.mouseY <= b.y + b.h;
      if (this.backBtnHovered && !wasHovered) {
        playOnce(SFX.ITEM, 0.4);
      }
      this.canvas.style.cursor = this.backBtnHovered ? 'pointer' : 'default';
    }
  }

  private handleClick(_e: MouseEvent): void {
    if (this.state === 'THANKS' && this.backBtnHovered) {
      // Return to the starting screen after a brief press flash.
      // Fade the end BGM over the full transition so it eases out as the
      // screen goes black, rather than cutting at scene swap.
      this.backBtnClickFlash = 10;
      this.state = 'FADE_TO_MAIN';
      this.fadeAlpha = 0;
      this.canvas.style.cursor = 'default';
      fadeOutLoop(BGM.END, 1600);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(deltaMs: number): void {
    if (this.inputCooldown > 0) this.inputCooldown -= deltaMs;

    switch (this.state) {
      case 'FADE_IN':
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        if (this.fadeAlpha <= 0) {
          this.state = 'LETTER_REVEAL';
        }
        break;

      case 'LETTER_REVEAL':
        this.letterRevealProgress = Math.min(1, this.letterRevealProgress + this.LETTER_REVEAL_SPEED);
        if (this.letterRevealProgress >= 1) {
          this.state = 'LETTER_READING';
        }
        break;

      case 'LETTER_READING':
        break;

      case 'LETTER_FADE_OUT':
        this.letterRevealProgress = Math.max(0, this.letterRevealProgress - this.LETTER_REVEAL_SPEED * 1.8);
        if (this.letterRevealProgress <= 0) {
          this.state = 'NARRATION';
          this.startNarration(NARRATION[0]);
        }
        break;

      case 'NARRATION':
        this.tickTypewriter(deltaMs);
        break;

      case 'NARRATION_WAIT':
        break;

      case 'FADE_TO_THANKS':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'THANKS_HOLD_BLACK';
          this.thanksHoldTimer = 0;
        }
        break;

      case 'THANKS_HOLD_BLACK':
        // Keep the screen fully black during the hold so nothing shows through
        this.fadeAlpha = 1;
        this.thanksHoldTimer += deltaMs;
        if (this.thanksHoldTimer >= this.THANKS_HOLD_BLACK_MS) {
          this.state = 'THANKS';
          this.thanksFadeIn = 0;
        }
        break;

      case 'THANKS':
        // Fade the black overlay back out so the thank-you content becomes visible
        this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
        this.thanksFadeIn = Math.min(1, this.thanksFadeIn + this.THANKS_FADE_IN_SPEED);
        if (this.backBtnClickFlash > 0) this.backBtnClickFlash--;
        break;

      case 'FADE_TO_MAIN':
        this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
        if (this.fadeAlpha >= 1) {
          this.state = 'DONE';
          window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'entry' } }));
        }
        break;

      case 'DONE':
        break;
    }
  }

  // ── Narration ──────────────────────────────────────────────────────────────

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
      this.state = 'NARRATION_WAIT';
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Background: dark wash (feels like a quiet nurses' station)
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(0, 0, w, h);

    // Letter (visible during letter states)
    if (
      this.state === 'LETTER_REVEAL' ||
      this.state === 'LETTER_READING' ||
      this.state === 'LETTER_FADE_OUT'
    ) {
      this.renderLetter(w, h);
    }

    // Narration box
    if (this.state === 'NARRATION' || this.state === 'NARRATION_WAIT') {
      this.renderNarrationBox(w, h);
    }

    // Thank-you screen
    if (this.state === 'THANKS' || this.state === 'FADE_TO_MAIN') {
      // Black backdrop already drawn below via fade overlay
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      this.renderThanks(w, h);
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private renderLetter(w: number, h: number): void {
    const ctx = this.ctx;

    // Letter card — fills almost the entire canvas. Aspect ratio of the
    // source PNG is intentionally NOT preserved here; the image stretches to
    // the card size so the letter text has maximum room to breathe. If that
    // stretching ever becomes visually noticeable, swap in a paper PNG with
    // a matching canvas aspect.
    const cardBaseW = w * this.PAPER_WIDTH_PCT;
    const cardBaseH = h * this.PAPER_HEIGHT_PCT;

    const cardW = cardBaseW;
    const cardH = cardBaseH; // paper always renders at full size — we slide it into view
    const cardX = (w - cardW) / 2 + this.PAPER_OFFSET_X;

    // letterRevealProgress drives a vertical slide instead of a height-reveal.
    //   0 → paper sits fully below the canvas (off-screen)
    //   1 → paper sits at its resting position
    // When dismissing, progress decays back to 0 and the paper slides out
    // the bottom. Text is positioned relative to drawY so it moves in lockstep.
    const finalY    = (h - cardBaseH) / 2 + this.PAPER_OFFSET_Y;
    const offscreenY = h + 20; // fully below visible canvas
    const drawY = offscreenY + (finalY - offscreenY) * this.letterRevealProgress;

    // Bail out if the paper is still entirely off-screen (nothing to draw).
    if (drawY >= h) return;

    // Paper image
    if (this.paper.loaded) {
      ctx.drawImage(this.paper.element, cardX, drawY, cardW, cardH);
    } else {
      ctx.fillStyle = '#f1e6cd';
      ctx.fillRect(cardX, drawY, cardW, cardH);
    }

    // Text — rendered whenever the paper is in view, so it slides with it.
    {
      const pad = Math.max(cardW, cardBaseH) * this.PAPER_PADDING_PCT;
      const innerX = cardX + pad;
      const innerY = drawY + pad;
      const innerW = cardW - pad * 2;

      ctx.fillStyle = '#2d1f10';

      // Greeting
      ctx.font = `italic ${this.TEXT_GREETING_SIZE}px "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('Dear Nurse,', innerX, innerY);

      // Body
      ctx.font = `italic ${this.TEXT_BODY_SIZE}px "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`;
      const body = [
        'I know your job is not easy. Long hours, difficult patients, and so much weight to carry every single day. But I want you to know — I may not be here today if you were not there to support me. Not just the checks and the medicine and the BP cuff. But the way you stayed. The way you listened. The way you never made me feel like a burden even when I was one.',
        "I hope you continue to impact the lives of your other patients the way you impacted mine. The world needs more nurses like you. More people like you.",
        'All the best in everything that lies ahead.',
        "And when the time comes — let's drink kopi together, okay? I'll be waiting. I'll make sure to save you a seat at the coffee shop, right next to my kakis.",
        "I'll also make sure to pass on the kindness you have shown me. A promise is a promise."
      ];
      let cy = innerY + this.TEXT_GREETING_SIZE + 26;
      for (const para of body) {
        cy = this.wrapParagraph(para, innerX, cy, innerW, this.TEXT_BODY_LINE_H);
        cy += this.TEXT_BODY_PARA_GAP;
      }

      // Sign-off
      ctx.textAlign = 'right';
      ctx.font = `italic ${this.TEXT_SIGNOFF_SIZE}px "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`;
      ctx.fillText('Yours sincerely,', cardX + cardW - pad, drawY + cardBaseH - pad - 80);
      ctx.fillText('Your friend,', cardX + cardW - pad, drawY + cardBaseH - pad - 48);
      ctx.font = `italic ${this.TEXT_SIGNOFF_NAME_SIZE}px "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`;
      ctx.fillStyle = this.LETTER_ACCENT;
      ctx.fillText('Uncle Lim', cardX + cardW - pad, drawY + cardBaseH - pad - 10);
    }

    // "E to continue" prompt once letter is fully slid into place
    if (this.state === 'LETTER_READING' && this.letterRevealProgress >= 0.98) {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 500)) * 0.55;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#d7c9a8';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼  E to continue', w / 2, drawY + cardH - 16);
      ctx.restore();
    }
  }

  // Wrap a paragraph and return the next y
  private wrapParagraph(text: string, x: number, y: number, maxW: number, lh: number): number {
    const ctx = this.ctx;
    const words = text.split(' ');
    let line = '';
    let cy = y;
    ctx.textAlign = 'left';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line.trimEnd(), x, cy);
        line = word + ' ';
        cy += lh;
      } else {
        line = test;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trimEnd(), x, cy);
      cy += lh;
    }
    return cy;
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

    if (this.state === 'NARRATION_WAIT') {
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

  private renderThanks(w: number, h: number): void {
    const ctx = this.ctx;
    const alpha = this.thanksFadeIn;

    // Soft vignette behind the text so the colour pops
    const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h) * 0.65);
    grad.addColorStop(0, `rgba(40, 48, 62, ${0.55 * alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Thank you for playing', w / 2, h * 0.5 - 60);

    // Subtitle / dedication
    ctx.fillStyle = '#d7c9a8';
    ctx.font = 'italic 22px "Segoe UI", sans-serif';
    ctx.fillText('For every nurse who stayed a moment longer than they had to.', w / 2, h * 0.5 + 0);

    ctx.restore();

    // Pixel-art "Back to Main" button (matches EntryScene's Play button)
    this.drawPixelButton(w, h);
  }

  // Same palette + construction as EntryScene.drawPixelButton
  private drawPixelButton(w: number, h: number): void {
    const ctx = this.ctx;
    const alpha = this.thanksFadeIn;

    // Button geometry (slightly wider than EntryScene's to fit "BACK TO MAIN")
    const btnW = 260;
    const btnH = 56;
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.5 + 140;
    this.backBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    const hovered = this.backBtnHovered;
    const pressed = this.backBtnClickFlash > 0;

    // Palette — identical to EntryScene
    const CREAM   = '#f5f0e8';
    const CREAM_H = '#fdfaf4';
    const TEAL    = '#1e5f5f';
    const NAVY    = '#0d3333';

    const BORDER = 3;
    const depth  = pressed ? 0 : (hovered ? 2 : 4);
    const dy     = pressed ? 4 : (hovered ? 2 : 0);

    const x = btnX;
    const y = btnY + dy;
    const bw = btnW;
    const bh = btnH;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Depth shadow
    if (depth > 0) {
      ctx.fillStyle = NAVY;
      ctx.fillRect(x + depth, y + depth, bw, bh);
    }

    // 2. Chunky pixel border
    ctx.fillStyle = TEAL;
    ctx.fillRect(x - BORDER, y - BORDER, bw + BORDER * 2, bh + BORDER * 2);

    // 3. Cream label face
    ctx.fillStyle = pressed ? '#e8e3db' : CREAM;
    ctx.fillRect(x, y, bw, bh);

    // 4. Top-left highlight strip
    ctx.fillStyle = CREAM_H;
    ctx.fillRect(x, y, bw, 2);
    ctx.fillRect(x, y, 2, bh);

    // 5. Bottom-right inner shadow
    ctx.fillStyle = 'rgba(30, 95, 95, 0.18)';
    ctx.fillRect(x + bw - 2, y + 2, 2, bh - 2);
    ctx.fillRect(x + 2, y + bh - 2, bw - 2, 2);

    // 6. Flash on click
    if (pressed) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x, y, bw, bh);
    }

    // 7. Pixel label with hard drop shadow — requires 'Press Start 2P' (loaded by EntryScene)
    const pixelFontLoaded = (document as any).fonts?.check?.("12px 'Press Start 2P'") ?? false;
    const font = pixelFontLoaded ? "'Press Start 2P'" : "'Courier New', monospace";
    ctx.font = `12px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + bw / 2;
    const cy = y + bh / 2;
    ctx.fillStyle = NAVY;
    ctx.fillText('BACK TO MAIN', cx, cy + 1);
    ctx.fillStyle = pressed ? '#ffffff' : TEAL;
    ctx.fillText('BACK TO MAIN', cx, cy);

    ctx.restore();
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
