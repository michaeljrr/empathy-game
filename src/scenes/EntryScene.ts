import entryBg    from '../assets/images/entry/entry_background.png';
import gameTitleImg from '../assets/images/entry/game_title.png';

export class EntryScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playButtonHovered: boolean = false;
  private clickFlash: number = 0;   // counts down frames after click
  private fontLoaded: boolean = false;

  private bgImage: HTMLImageElement;
  private bgLoaded = false;
  private titleImage: HTMLImageElement;
  private titleLoaded = false;

  // Store bound event handlers so we can remove them later
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundClick!: (e: MouseEvent) => void;

  // ── Title image layout ────────────────────────────────────────────────────
  // Only set `width` — height is computed automatically to preserve aspect ratio.
  private readonly TITLE = {
    width:  500,   // rendered width in canvas pixels (height auto-calculated)
    offsetX: -10,    // shift left(-) / right(+) from horizontal centre
    offsetY: 40,  // shift up(-) / down(+) from vertical centre
  };

  // ── Play button layout ────────────────────────────────────────────────────
  private readonly BTN = {
    width:  220,   // button width
    height:  56,   // button height
    offsetX:  -10,   // shift from centre
    offsetY: 150,  // shift down from centre (positive = lower half)
  };

  private get width()  { return (this.canvas as any).logicalWidth  || this.canvas.width;  }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  private get playButtonBounds() {
    const cx = this.width  / 2 + this.BTN.offsetX;
    const cy = this.height / 2 + this.BTN.offsetY;
    return { x: cx - this.BTN.width / 2, y: cy - this.BTN.height / 2,
             width: this.BTN.width, height: this.BTN.height };
  }

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx    = ctx;

    this.bgImage = new Image();
    this.bgImage.src = entryBg;
    this.bgImage.onload = () => { this.bgLoaded = true; };

    this.titleImage = new Image();
    this.titleImage.src = gameTitleImg;
    this.titleImage.onload = () => { this.titleLoaded = true; };

    this.setupEventListeners();

    // Load pixel font from Google Fonts
    const pf = new FontFace(
      'Press Start 2P',
      'url(https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2)'
    );
    pf.load().then(f => { document.fonts.add(f); this.fontLoaded = true; }).catch(() => {});
  }

  private setupEventListeners(): void {
    this.boundMouseMove = (e) => this.handleMouseMove(e);
    this.boundClick     = (e) => this.handleClick(e);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('click',     this.boundClick);
  }

  public deactivate(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('click',     this.boundClick);
    this.canvas.style.cursor = 'default';
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = this.width  / rect.width;
    const scaleY = this.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);
    this.playButtonHovered = this.isPointInButton(x, y);
    this.canvas.style.cursor = this.playButtonHovered ? 'pointer' : 'default';
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);
    if (this.isPointInButton(x, y)) {
      this.clickFlash = 10;
      window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'nameInput' } }));
    }
  }

  private isPointInButton(x: number, y: number): boolean {
    const b = this.playButtonBounds;
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  public update(): void {
    if (this.clickFlash > 0) this.clickFlash--;
  }

  public render(): void {
    const ctx = this.ctx;

    // Background — cover crop: scale to fill, clip overflow, no stretching
    if (this.bgLoaded) {
      const scale = Math.max(this.width / this.bgImage.naturalWidth, this.height / this.bgImage.naturalHeight);
      const sw = this.bgImage.naturalWidth  * scale;
      const sh = this.bgImage.naturalHeight * scale;
      const sx = (this.width  - sw) / 2;
      const sy = (this.height - sh) / 2;
      ctx.drawImage(this.bgImage, sx, sy, sw, sh);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Game title image — preserve natural aspect ratio
    if (this.titleLoaded) {
      const aspect = this.titleImage.naturalHeight / this.titleImage.naturalWidth;
      const tw = this.TITLE.width;
      const th = tw * aspect;
      const tx = this.width  / 2 + this.TITLE.offsetX - tw / 2;
      const ty = this.height / 2 + this.TITLE.offsetY - th / 2;
      ctx.drawImage(this.titleImage, tx, ty, tw, th);
    }

    // Pixel-art style play button
    this.drawPixelButton();
  }

  private drawPixelButton(): void {
    const ctx     = this.ctx;
    const b       = this.playButtonBounds;
    const hovered = this.playButtonHovered;
    const pressed = this.clickFlash > 0;

    // ─ Palette ─────────────────────────────────────────
    const CREAM   = '#f5f0e8';              // label face
    const CREAM_H = '#fdfaf4';              // top-left pixel highlight
    const TEAL    = '#1e5f5f';              // border + text colour
    const NAVY    = '#0d3333';              // depth-shadow colour

    // ─ Press physics ─────────────────────────────────
    const BORDER  = 3;                      // chunky border thickness
    const depth   = pressed ? 0 : (hovered ? 2 : 4);  // pixel shadow depth
    const dy      = pressed ? 4 : (hovered ? 2 : 0);  // button shifts down

    const x = b.x, y = b.y + dy, w = b.width, h = b.height;

    // 1. Depth shadow (disappears when pressed)
    if (depth > 0) {
      ctx.fillStyle = NAVY;
      ctx.fillRect(x + depth, y + depth, w, h);
    }

    // 2. Chunky pixel border
    ctx.fillStyle = TEAL;
    ctx.fillRect(x - BORDER, y - BORDER, w + BORDER * 2, h + BORDER * 2);

    // 3. Cream label face
    ctx.fillStyle = pressed ? '#e8e3db' : CREAM; // slightly darker when pressed
    ctx.fillRect(x, y, w, h);

    // 4. Top-left highlight strip (2px, no rounded corners)
    ctx.fillStyle = CREAM_H;
    ctx.fillRect(x,     y,     w, 2); // top
    ctx.fillRect(x,     y,     2, h); // left

    // 5. Bottom-right inner shadow (gives face a subtle inset depth)
    ctx.fillStyle = 'rgba(30, 95, 95, 0.18)';
    ctx.fillRect(x + w - 2, y + 2, 2, h - 2); // right inner
    ctx.fillRect(x + 2,     y + h - 2, w - 2, 2); // bottom inner

    // 6. Flash overlay on click
    if (pressed) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x, y, w, h);
    }

    // 7. Label text in pixel font
    const font = this.fontLoaded ? "'Press Start 2P'" : "'Courier New', monospace";
    const fontSize = 12;
    ctx.font        = `${fontSize}px ${font}`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + w / 2;
    const cy = y + h / 2;
    // 1-pixel hard drop shadow (down only, no x-offset, keeps text sharp)
    ctx.fillStyle = NAVY;
    ctx.fillText('PLAY', cx, cy + 1);
    // Main label on top
    ctx.fillStyle = pressed ? '#ffffff' : TEAL;
    ctx.fillText('PLAY', cx, cy);
  }
}
