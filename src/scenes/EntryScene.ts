import entryBg    from '../assets/images/entry/entry_background.png';
import gameTitleImg from '../assets/images/entry/game_title.png';
import { SFX, BGM, playOnce, startLoop } from '../core/audio';

// Module-level flag — once the player has dismissed the splash gate on this
// page load, we don't show it again (e.g. when returning from "Back to Main"
// on Day 6's ending). A full page refresh resets this and shows the gate again.
let splashDismissed = false;

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

  // Settings button sits below Play with the same horizontal centre
  private readonly SETTINGS_BTN = {
    width:  220,
    height:  56,
    offsetX:  -10,
    offsetY: 230, // 80 px below Play (56 height + 24 gap)
  };
  private settingsButtonHovered = false;
  private settingsClickFlash = 0;

  // Splash gate — dismisses on first click/keydown so we can start the BGM
  // (browsers block audio autoplay until the user makes a gesture).
  private splashActive = false;
  private splashFadeOut = 0; // 0 = fully visible, 1 = fully gone
  private boundSplashKey: (e: KeyboardEvent) => void = () => {};

  private get width()  { return (this.canvas as any).logicalWidth  || this.canvas.width;  }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  private get playButtonBounds() {
    const cx = this.width  / 2 + this.BTN.offsetX;
    const cy = this.height / 2 + this.BTN.offsetY;
    return { x: cx - this.BTN.width / 2, y: cy - this.BTN.height / 2,
             width: this.BTN.width, height: this.BTN.height };
  }

  private get settingsButtonBounds() {
    const cx = this.width  / 2 + this.SETTINGS_BTN.offsetX;
    const cy = this.height / 2 + this.SETTINGS_BTN.offsetY;
    return { x: cx - this.SETTINGS_BTN.width / 2, y: cy - this.SETTINGS_BTN.height / 2,
             width: this.SETTINGS_BTN.width, height: this.SETTINGS_BTN.height };
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

    // Jovial BGM is requested immediately so it's ready to start the moment
    // the splash gate is dismissed (autoplay unlocks on first gesture).
    startLoop(BGM.JOVIAL, 0.35);

    // First page load → show splash gate. On subsequent re-entries (e.g.
    // returning from Day 6's "Back to Main") this stays dismissed.
    if (!splashDismissed) {
      this.splashActive = true;
      this.splashFadeOut = 0;
    }

    // Keydown also dismisses the splash (e.g. Space/Enter)
    this.boundSplashKey = (e: KeyboardEvent) => this.onAnyKey(e);
    window.addEventListener('keydown', this.boundSplashKey);
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
    window.removeEventListener('keydown', this.boundSplashKey);
    // Jovial BGM keeps playing into the NameInput screen — it's stopped
    // (with a fade) when the player finalises their name.
  }

  // Re-binds mouse listeners when returning to the entry screen (e.g. from
  // Day 6's "Back to Main" button). Safe to call even if already active.
  public activate(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('click',     this.boundClick);
    this.setupEventListeners();
    this.playButtonHovered = false;
    this.clickFlash = 0;
    // Resume the jovial BGM on re-entry (e.g. via Back to Main). It'll keep
    // playing across the name-input screen and only fade out on submit.
    startLoop(BGM.JOVIAL, 0.35);

    // Re-attach the splash keydown listener (deactivate removed it)
    window.removeEventListener('keydown', this.boundSplashKey);
    this.boundSplashKey = (e: KeyboardEvent) => this.onAnyKey(e);
    window.addEventListener('keydown', this.boundSplashKey);
    // Returning from another scene = audio is already unlocked; don't re-show gate
    this.splashActive = false;
    this.splashFadeOut = 1;
  }

  private onAnyKey(_e: KeyboardEvent): void {
    if (this.splashActive && splashDismissed === false) {
      this.dismissSplash();
    }
  }

  private dismissSplash(): void {
    if (!this.splashActive) return;
    splashDismissed = true;
    // Leave splashActive true while it fades — update() will finish the job.
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = this.width  / rect.width;
    const scaleY = this.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);

    const playWas = this.playButtonHovered;
    const setWas  = this.settingsButtonHovered;
    this.playButtonHovered     = this.isPointInButton(x, y, this.playButtonBounds);
    this.settingsButtonHovered = this.isPointInButton(x, y, this.settingsButtonBounds);

    // Hover-enter blips
    if (this.playButtonHovered && !playWas)     playOnce(SFX.ITEM, 0.4);
    if (this.settingsButtonHovered && !setWas)  playOnce(SFX.ITEM, 0.4);

    this.canvas.style.cursor = (this.playButtonHovered || this.settingsButtonHovered) ? 'pointer' : 'default';
  }

  private handleClick(e: MouseEvent): void {
    // First click dismisses the splash gate (and unlocks autoplay via the
    // global listener in audio.ts). Don't fall through to the menu buttons
    // so the player doesn't accidentally hit Play/Settings on the same click.
    if (this.splashActive && !splashDismissed) {
      this.dismissSplash();
      return;
    }
    // Ignore clicks during fade-out so the button under the splash isn't
    // mis-triggered through a half-transparent overlay.
    if (this.splashActive) return;

    const { x, y } = this.getCanvasCoordinates(e);
    if (this.isPointInButton(x, y, this.playButtonBounds)) {
      this.clickFlash = 10;
      window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'nameInput' } }));
      return;
    }
    if (this.isPointInButton(x, y, this.settingsButtonBounds)) {
      this.settingsClickFlash = 10;
      window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'settings' } }));
    }
  }

  private isPointInButton(x: number, y: number, b: { x: number; y: number; width: number; height: number }): boolean {
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  public update(): void {
    if (this.clickFlash > 0) this.clickFlash--;
    if (this.settingsClickFlash > 0) this.settingsClickFlash--;
    // Splash fade-out — finishes and deactivates once fully transparent
    if (this.splashActive && splashDismissed) {
      this.splashFadeOut = Math.min(1, this.splashFadeOut + 0.05);
      if (this.splashFadeOut >= 1) this.splashActive = false;
    }
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

    // Pixel-art style buttons
    this.drawPixelButton(this.playButtonBounds, 'PLAY', this.playButtonHovered, this.clickFlash > 0);
    this.drawPixelButton(this.settingsButtonBounds, 'SETTINGS', this.settingsButtonHovered, this.settingsClickFlash > 0);

    // Splash gate sits above the main menu buttons so its click is what
    // unlocks autoplay. Always rendered last so it's always on top.
    if (this.splashActive) {
      this.drawSplashGate();
    }
  }

  private drawSplashGate(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Overlay alpha fades from ~0.85 → 0 as splashFadeOut goes 0 → 1
    const overlayAlpha = 0.85 * (1 - this.splashFadeOut);
    ctx.fillStyle = `rgba(5, 8, 14, ${overlayAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // Content opacity tracks the overlay so the text fades out together
    const contentAlpha = 1 - this.splashFadeOut;
    if (contentAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = contentAlpha;

    // "CLICK TO START" — pulsing to draw the eye
    const pulse = 0.6 + Math.abs(Math.sin(performance.now() / 500)) * 0.4;
    ctx.fillStyle = '#f5f0e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = contentAlpha * pulse;
    const font = this.fontLoaded ? "'Press Start 2P'" : "'Courier New', monospace";
    ctx.font = `bold 24px ${font}`;
    ctx.fillText('CLICK TO START', w / 2, h / 2 + 30);

    ctx.restore();
  }

  private drawPixelButton(
    b: { x: number; y: number; width: number; height: number },
    label: string,
    hovered: boolean,
    pressed: boolean,
  ): void {
    const ctx = this.ctx;

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
    ctx.fillText(label, cx, cy + 1);
    // Main label on top
    ctx.fillStyle = pressed ? '#ffffff' : TEAL;
    ctx.fillText(label, cx, cy);
  }
}
