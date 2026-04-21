// ============================================================
//  NameInputScene.ts  —  Player name input in pixel art style
// ============================================================

import { BGM, fadeOutLoop } from '../core/audio';

export class NameInputScene {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;

  // Player name state
  private playerName = '';
  private readonly MAX_NAME_LENGTH = 12;
  
  // Cursor blink
  private cursorVisible = true;
  private cursorTimer = 0;
  private readonly CURSOR_BLINK_MS = 500;

  // Input state
  private inputActive = true;
  
  // Fade
  private fadeAlpha = 1;       // 1 = black, 0 = clear
  private fadingIn = true;     // Fade in on entry
  private fadingOut = false;   // Fade out before scene change
  private readonly FADE_SPEED = 0.04;

  // Input cooldown
  private inputCooldown = 0;
  private readonly INPUT_COOLDOWN_MS = 100;

  private boundKeyDown!: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  private get W(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get H(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    this.playerName = '';
    this.inputActive = true;
    this.fadingIn = true;
    this.fadingOut = false;
    this.fadeAlpha = 1;
    this.inputCooldown = 300; // Prevent immediate input during fade-in
    this.cursorVisible = true;
    this.cursorTimer = 0;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
  }

  public getPlayerName(): string {
    return this.playerName || 'Nurse';
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public update(deltaMs: number): void {
    if (this.inputCooldown > 0) this.inputCooldown -= deltaMs;

    // Fade in at start
    if (this.fadingIn) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
      if (this.fadeAlpha <= 0) this.fadingIn = false;
    }

    // Fade out before transition
    if (this.fadingOut) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
      if (this.fadeAlpha >= 1) {
        // Save name to localStorage and proceed to intro. Fade out the
        // jovial BGM here — it played across the entry + name-input screens.
        localStorage.setItem('playerName', this.getPlayerName());
        fadeOutLoop(BGM.JOVIAL, 1200);
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'intro' }
        }));
        this.fadingOut = false;
      }
      return;
    }

    // Cursor blink
    this.cursorTimer += deltaMs;
    if (this.cursorTimer >= this.CURSOR_BLINK_MS) {
      this.cursorTimer = 0;
      this.cursorVisible = !this.cursorVisible;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.W;
    const h = this.H;

    // Dark gradient background (pixel art vibe)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Pixel grid overlay (subtle)
    ctx.globalAlpha = 0.03;
    const gridSize = 4;
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < w; x += gridSize * 2) {
      for (let y = 0; y < h; y += gridSize * 2) {
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }
    ctx.globalAlpha = 1;

    // Title text - pixel style
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.drawPixelText('ENTER YOUR NAME', w / 2, h * 0.3, 32);

    // Subtitle
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '16px monospace';
    this.drawPixelText('What should patients call you?', w / 2, h * 0.38, 16);

    // Input box - pixel art style with thick borders
    const boxW = 400;
    const boxH = 60;
    const boxX = (w - boxW) / 2;
    const boxY = h * 0.5 - boxH / 2;

    // Outer border (thick pixel style)
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);

    // Inner shadow border
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(boxX - 2, boxY - 2, boxW + 4, boxH + 4);

    // Input field background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Display name + cursor
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const displayName = this.playerName || '';
    const textX = boxX + 20;
    const textY = boxY + boxH / 2;
    
    ctx.fillText(displayName, textX, textY);

    // Cursor
    if (this.inputActive && this.cursorVisible) {
      const textWidth = ctx.measureText(displayName).width;
      ctx.fillStyle = '#5a9bc5';
      ctx.fillRect(textX + textWidth + 2, textY - 12, 3, 24);
    }

    // Character count
    ctx.fillStyle = '#808080';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.playerName.length}/${this.MAX_NAME_LENGTH}`, boxX + boxW - 10, boxY + boxH + 20);

    // Instructions - pixel style
    ctx.fillStyle = '#d0d0d0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 500)) * 0.5;
    ctx.globalAlpha = pulse;
    this.drawPixelText('[ENTER] to confirm  |  [BACKSPACE] to delete', w / 2, h * 0.7, 14);
    ctx.globalAlpha = 1;

    // Pixel corners decoration
    this.drawPixelCorner(w * 0.15, h * 0.15, 40, '#5a9bc5');
    this.drawPixelCorner(w * 0.85, h * 0.15, 40, '#c55a9b', true);
    this.drawPixelCorner(w * 0.15, h * 0.85, 40, '#c5a55a', false, true);
    this.drawPixelCorner(w * 0.85, h * 0.85, 40, '#5ac57a', true, true);

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // ── Input handling ─────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.inputActive) return;

    const key = e.key;

    if (key === 'Enter') {
      if (this.inputCooldown > 0) return; // Only block Enter if on cooldown
      // Confirm name (allow empty, will default to 'Nurse')
      this.inputCooldown = this.INPUT_COOLDOWN_MS;
      this.inputActive = false;
      this.fadingOut = true;
      e.preventDefault();
      return;
    }

    if (key === 'Backspace') {
      if (this.inputCooldown > 0) return; // Only block Backspace if on cooldown
      if (this.playerName.length > 0) {
        this.playerName = this.playerName.slice(0, -1);
        this.cursorVisible = true;
        this.cursorTimer = 0;
      }
      this.inputCooldown = 50; // Shorter cooldown for Backspace
      e.preventDefault();
      return;
    }

    // Accept letters, spaces, and common characters - NO COOLDOWN for typing
    if (key.length === 1 && this.playerName.length < this.MAX_NAME_LENGTH) {
      // Allow alphanumeric and spaces
      if (/[a-zA-Z0-9 ]/.test(key)) {
        this.playerName += key;
        this.cursorVisible = true;
        this.cursorTimer = 0;
        // No input cooldown for regular typing - instant response
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private drawPixelText(text: string, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Pixel shadow effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillText(text, x + 2, y + 2);
    
    // Main text
    ctx.fillStyle = ctx.fillStyle === 'rgba(0, 0, 0, 0.3)' ? '#e8e8e8' : ctx.fillStyle;
    ctx.fillText(text, x, y);
  }

  private drawPixelCorner(x: number, y: number, size: number, color: string, flipX = false, flipY = false): void {
    const ctx = this.ctx;
    const pixelSize = 4;
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;

    // L-shaped corner decoration - horizontal line
    for (let i = 0; i < size / pixelSize; i++) {
      const px = flipX ? x - i * pixelSize : x + i * pixelSize;
      const py = flipY ? y : y;
      ctx.fillRect(px, py, pixelSize, pixelSize);
    }
    // L-shaped corner decoration - vertical line
    for (let i = 0; i < size / pixelSize; i++) {
      const px = flipX ? x : x;
      const py = flipY ? y - i * pixelSize : y + i * pixelSize;
      ctx.fillRect(px, py, pixelSize, pixelSize);
    }

    ctx.globalAlpha = 1;
  }
}
