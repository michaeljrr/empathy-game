// ============================================================
//  SettingsScene.ts — Full-screen settings (entered from Entry)
// ============================================================

import entryBg from '../assets/images/entry/entry_background.png';
import {
  getSettings, setBgmVolume, setSfxVolume, setKeybind, resetKeybinds,
  formatKey, isAssignableKey, DEFAULT_KEYBINDS, KeybindAction,
} from '../core/settings';
import { SFX, playOnce } from '../core/audio';

interface Rect { x: number; y: number; w: number; h: number; }
interface SliderState {
  rect: Rect;
  label: 'BGM' | 'SFX';
  value: number;
  dragging: boolean;
}
interface KeybindRow {
  label: string;
  action: KeybindAction;
  rect: Rect;      // click target for the key button
  rebinding: boolean;
}
interface PixelButton {
  rect: Rect;
  label: string;
  hovered: boolean;
  clickFlash: number;
}

const PALETTE = {
  CREAM:   '#f5f0e8',
  CREAM_H: '#fdfaf4',
  TEAL:    '#1e5f5f',
  NAVY:    '#0d3333',
  PANEL_BG:   'rgba(245, 240, 232, 0.94)',
  PANEL_BRD:  '#1e5f5f',
};

export class SettingsScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private bgImage: HTMLImageElement;
  private bgLoaded = false;
  private fontLoaded = false;

  private sliders: SliderState[] = [];
  private keybindRows: KeybindRow[] = [];
  private resetBtn!: PixelButton;
  private backBtn!: PixelButton;

  private mouseX = 0;
  private mouseY = 0;
  private rebindingAction: KeybindAction | null = null;
  private inputCooldown = 0;

  private boundMouseMove!: (e: MouseEvent) => void;
  private boundMouseDown!: (e: MouseEvent) => void;
  private boundMouseUp!: (e: MouseEvent) => void;
  private boundKeyDown!: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.bgImage = new Image();
    this.bgImage.src = entryBg;
    this.bgImage.onload = () => { this.bgLoaded = true; };

    // Reuse the pixel font (already loaded by EntryScene)
    try { this.fontLoaded = (document as any).fonts?.check?.("12px 'Press Start 2P'") ?? false; } catch {}
  }

  private get width(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // ── Public API ─────────────────────────────────────────────────────────────

  public activate(): void {
    this.rebindingAction = null;
    this.inputCooldown = 200;
    this.buildLayout();

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp   = this.onMouseUp.bind(this);
    this.boundKeyDown   = this.onKeyDown.bind(this);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public deactivate(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('keydown', this.boundKeyDown);
    this.canvas.style.cursor = 'default';
    this.rebindingAction = null;
  }

  public update(delta: number): void {
    if (this.inputCooldown > 0) this.inputCooldown = Math.max(0, this.inputCooldown - delta);
    if (this.resetBtn.clickFlash > 0) this.resetBtn.clickFlash--;
    if (this.backBtn.clickFlash > 0) this.backBtn.clickFlash--;
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background (cover crop)
    if (this.bgLoaded) {
      const scale = Math.max(w / this.bgImage.naturalWidth, h / this.bgImage.naturalHeight);
      const sw = this.bgImage.naturalWidth * scale;
      const sh = this.bgImage.naturalHeight * scale;
      ctx.drawImage(this.bgImage, (w - sw) / 2, (h - sh) / 2, sw, sh);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
    }
    // Dark wash for contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Panel
    const panel = this.getPanelRect();
    ctx.fillStyle = PALETTE.PANEL_BG;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    // Chunky pixel border
    ctx.fillStyle = PALETTE.PANEL_BRD;
    const b = 4;
    ctx.fillRect(panel.x - b, panel.y - b, panel.w + b * 2, b);
    ctx.fillRect(panel.x - b, panel.y + panel.h, panel.w + b * 2, b);
    ctx.fillRect(panel.x - b, panel.y, b, panel.h);
    ctx.fillRect(panel.x + panel.w, panel.y, b, panel.h);
    // Highlight strip (top-left)
    ctx.fillStyle = PALETTE.CREAM_H;
    ctx.fillRect(panel.x, panel.y, panel.w, 3);
    ctx.fillRect(panel.x, panel.y, 3, panel.h);

    // Title
    ctx.fillStyle = PALETTE.TEAL;
    ctx.font = this.fontLoaded ? "18px 'Press Start 2P'" : "bold 32px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SETTINGS', panel.x + panel.w / 2, panel.y + 28);

    // Volume sliders
    ctx.textAlign = 'left';
    for (const s of this.sliders) {
      this.drawSlider(s);
    }

    // Keybind section header. Reset text align/baseline explicitly — the
    // slider renderer leaves textAlign = 'right' from drawing the percentage,
    // which would otherwise cause this label to extend leftward off the panel.
    ctx.fillStyle = PALETTE.TEAL;
    ctx.font = this.fontLoaded ? "12px 'Press Start 2P'" : "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const kbHeaderY = this.sliders[this.sliders.length - 1].rect.y + 56;
    ctx.fillText('KEY BINDINGS', panel.x + 36, kbHeaderY);

    for (const row of this.keybindRows) {
      this.drawKeybindRow(row);
    }

    // Reset + Back buttons
    this.drawPixelButton(this.resetBtn);
    this.drawPixelButton(this.backBtn);

    // Rebinding prompt overlay
    if (this.rebindingAction) {
      this.drawRebindingOverlay();
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  private getPanelRect(): Rect {
    const w = Math.min(700, this.width - 80);
    const h = Math.min(620, this.height - 80);
    return { x: (this.width - w) / 2, y: (this.height - h) / 2, w, h };
  }

  private buildLayout(): void {
    const panel = this.getPanelRect();
    const s = getSettings();

    // Sliders
    const sliderW = panel.w - 80;
    this.sliders = [
      {
        label: 'BGM',
        rect: { x: panel.x + 40, y: panel.y + 96, w: sliderW, h: 18 },
        value: s.bgmVolume,
        dragging: false,
      },
      {
        label: 'SFX',
        rect: { x: panel.x + 40, y: panel.y + 170, w: sliderW, h: 18 },
        value: s.sfxVolume,
        dragging: false,
      },
    ];

    // Keybinds
    const rowH = 46;
    const startY = this.sliders[1].rect.y + 100;
    const labelW = 150;
    const keyBtnW = 140;
    this.keybindRows = [
      { label: 'Interact',   action: 'interact',  rect: { x: panel.x + panel.w - keyBtnW - 40, y: startY,             w: keyBtnW, h: 36 }, rebinding: false },
      { label: 'Move Left',  action: 'moveLeft',  rect: { x: panel.x + panel.w - keyBtnW - 40, y: startY + rowH,      w: keyBtnW, h: 36 }, rebinding: false },
      { label: 'Move Right', action: 'moveRight', rect: { x: panel.x + panel.w - keyBtnW - 40, y: startY + rowH * 2,  w: keyBtnW, h: 36 }, rebinding: false },
    ];
    // (labelW is implicitly used as we right-align the key button)
    void labelW;

    // Reset + Back
    const btnW = 210;
    const btnH = 44;
    const btnY = panel.y + panel.h - btnH - 36;
    this.resetBtn = {
      rect: { x: panel.x + 40, y: btnY, w: btnW, h: btnH },
      label: 'RESET KEYS',
      hovered: false,
      clickFlash: 0,
    };
    this.backBtn = {
      rect: { x: panel.x + panel.w - btnW - 40, y: btnY, w: btnW, h: btnH },
      label: 'BACK',
      hovered: false,
      clickFlash: 0,
    };
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  private drawSlider(s: SliderState): void {
    const ctx = this.ctx;
    const { x, y, w, h } = s.rect;

    // Label above bar
    ctx.fillStyle = PALETTE.TEAL;
    ctx.font = this.fontLoaded ? "11px 'Press Start 2P'" : "bold 16px 'Courier New', monospace";
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.label} VOLUME`, x, y - 14);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(s.value * 100)}%`, x + w, y - 14);

    // Track
    ctx.fillStyle = PALETTE.NAVY;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#cfc9bc';
    ctx.fillRect(x, y, w, h);

    // Fill
    const fillW = Math.max(0, w * s.value);
    ctx.fillStyle = PALETTE.TEAL;
    ctx.fillRect(x, y, fillW, h);

    // Knob — square pixel block
    const knobW = 14;
    const knobX = x + fillW - knobW / 2;
    const knobY = y - 4;
    ctx.fillStyle = PALETTE.NAVY;
    ctx.fillRect(knobX - 2, knobY - 2, knobW + 4, h + 12);
    ctx.fillStyle = PALETTE.CREAM;
    ctx.fillRect(knobX, knobY, knobW, h + 8);
    ctx.fillStyle = PALETTE.CREAM_H;
    ctx.fillRect(knobX, knobY, knobW, 2);
    ctx.fillRect(knobX, knobY, 2, h + 8);
  }

  private drawKeybindRow(row: KeybindRow): void {
    const ctx = this.ctx;
    const panel = this.getPanelRect();
    const s = getSettings();
    const currentKey = s.keybinds[row.action];
    const defaultKey = DEFAULT_KEYBINDS[row.action];

    // Label on the left
    ctx.fillStyle = PALETTE.TEAL;
    ctx.font = this.fontLoaded ? "10px 'Press Start 2P'" : "bold 14px 'Courier New', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.label, panel.x + 40, row.rect.y + row.rect.h / 2);

    // Default hint
    ctx.fillStyle = 'rgba(30, 95, 95, 0.6)';
    ctx.font = this.fontLoaded ? "8px 'Press Start 2P'" : "12px 'Courier New', monospace";
    ctx.fillText(`default: ${formatKey(defaultKey)}`, panel.x + 40, row.rect.y + row.rect.h / 2 + 14);

    // Key button (small pixel-style chip)
    const { x, y, w, h } = row.rect;
    const rebinding = this.rebindingAction === row.action;
    const hovered = this.hitTest(row.rect);

    ctx.fillStyle = PALETTE.NAVY;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = rebinding ? '#fddd88' : (hovered ? PALETTE.CREAM_H : PALETTE.CREAM);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.CREAM_H;
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);

    ctx.fillStyle = PALETTE.TEAL;
    ctx.font = this.fontLoaded ? "12px 'Press Start 2P'" : "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = rebinding ? '…' : formatKey(currentKey);
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private drawPixelButton(btn: PixelButton): void {
    const ctx = this.ctx;
    const pressed = btn.clickFlash > 0;
    const hovered = btn.hovered;
    const depth = pressed ? 0 : (hovered ? 2 : 4);
    const dy    = pressed ? 4 : (hovered ? 2 : 0);

    const x = btn.rect.x, y = btn.rect.y + dy, w = btn.rect.w, h = btn.rect.h;
    const BORDER = 3;

    if (depth > 0) {
      ctx.fillStyle = PALETTE.NAVY;
      ctx.fillRect(x + depth, y + depth, w, h);
    }

    ctx.fillStyle = PALETTE.TEAL;
    ctx.fillRect(x - BORDER, y - BORDER, w + BORDER * 2, h + BORDER * 2);

    ctx.fillStyle = pressed ? '#e8e3db' : PALETTE.CREAM;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = PALETTE.CREAM_H;
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);

    ctx.fillStyle = 'rgba(30, 95, 95, 0.18)';
    ctx.fillRect(x + w - 2, y + 2, 2, h - 2);
    ctx.fillRect(x + 2, y + h - 2, w - 2, 2);

    if (pressed) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x, y, w, h);
    }

    const font = this.fontLoaded ? "'Press Start 2P'" : "'Courier New', monospace";
    ctx.font = `10px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = PALETTE.NAVY;
    ctx.fillText(btn.label, cx, cy + 1);
    ctx.fillStyle = pressed ? '#ffffff' : PALETTE.TEAL;
    ctx.fillText(btn.label, cx, cy);
  }

  private drawRebindingOverlay(): void {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const boxW = 420, boxH = 120;
    const x = (w - boxW) / 2, y = (h - boxH) / 2;
    ctx.fillStyle = PALETTE.TEAL;
    ctx.fillRect(x - 4, y - 4, boxW + 8, boxH + 8);
    ctx.fillStyle = PALETTE.CREAM;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = PALETTE.CREAM_H;
    ctx.fillRect(x, y, boxW, 2);
    ctx.fillRect(x, y, 2, boxH);

    ctx.fillStyle = PALETTE.TEAL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = this.fontLoaded ? "12px 'Press Start 2P'" : "bold 16px 'Courier New', monospace";
    ctx.fillText('PRESS A KEY…', w / 2, y + boxH / 2 - 10);
    ctx.font = this.fontLoaded ? "8px 'Press Start 2P'" : "12px 'Courier New', monospace";
    ctx.fillStyle = 'rgba(30, 95, 95, 0.7)';
    ctx.fillText('Escape to cancel', w / 2, y + boxH / 2 + 18);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private toCanvasXY(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.width / rect.width;
    const sy = this.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  private hitTest(r: Rect): boolean {
    return this.mouseX >= r.x && this.mouseX <= r.x + r.w
        && this.mouseY >= r.y && this.mouseY <= r.y + r.h;
  }

  private onMouseMove(e: MouseEvent): void {
    const p = this.toCanvasXY(e);
    this.mouseX = p.x;
    this.mouseY = p.y;

    let anyHovered = false;

    // Slider drag
    for (const s of this.sliders) {
      if (s.dragging) {
        const rel = (this.mouseX - s.rect.x) / s.rect.w;
        s.value = Math.max(0, Math.min(1, rel));
        if (s.label === 'BGM') setBgmVolume(s.value);
        else setSfxVolume(s.value);
      }
    }

    // Button hovers
    const resetHovered = this.hitTest(this.resetBtn.rect);
    const backHovered  = this.hitTest(this.backBtn.rect);
    if (resetHovered && !this.resetBtn.hovered) playOnce(SFX.ITEM, 0.4);
    if (backHovered  && !this.backBtn.hovered)  playOnce(SFX.ITEM, 0.4);
    this.resetBtn.hovered = resetHovered;
    this.backBtn.hovered  = backHovered;

    if (resetHovered || backHovered) anyHovered = true;
    if (!anyHovered) {
      for (const row of this.keybindRows) if (this.hitTest(row.rect)) { anyHovered = true; break; }
    }
    if (!anyHovered) {
      for (const s of this.sliders) {
        // Hovering the slider track (extended hit area for the knob)
        if (this.mouseX >= s.rect.x && this.mouseX <= s.rect.x + s.rect.w
            && this.mouseY >= s.rect.y - 8 && this.mouseY <= s.rect.y + s.rect.h + 8) {
          anyHovered = true; break;
        }
      }
    }
    this.canvas.style.cursor = anyHovered ? 'pointer' : 'default';
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.inputCooldown > 0) return;
    if (this.rebindingAction) return; // swallow clicks during rebind
    const p = this.toCanvasXY(e);
    this.mouseX = p.x;
    this.mouseY = p.y;

    // Sliders — jump on click, enter drag mode
    for (const s of this.sliders) {
      const hit =
        this.mouseX >= s.rect.x && this.mouseX <= s.rect.x + s.rect.w &&
        this.mouseY >= s.rect.y - 8 && this.mouseY <= s.rect.y + s.rect.h + 8;
      if (hit) {
        s.dragging = true;
        const rel = (this.mouseX - s.rect.x) / s.rect.w;
        s.value = Math.max(0, Math.min(1, rel));
        if (s.label === 'BGM') setBgmVolume(s.value);
        else setSfxVolume(s.value);
        return;
      }
    }

    // Keybind rows — click to start rebinding
    for (const row of this.keybindRows) {
      if (this.hitTest(row.rect)) {
        this.rebindingAction = row.action;
        playOnce(SFX.ITEM, 0.4);
        return;
      }
    }

    // Reset
    if (this.hitTest(this.resetBtn.rect)) {
      this.resetBtn.clickFlash = 10;
      playOnce(SFX.ITEM, 0.45);
      resetKeybinds();
      return;
    }

    // Back
    if (this.hitTest(this.backBtn.rect)) {
      this.backBtn.clickFlash = 10;
      playOnce(SFX.ITEM, 0.45);
      window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'entry' } }));
      return;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    for (const s of this.sliders) s.dragging = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Rebinding: capture the next key
    if (this.rebindingAction) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'Escape') {
        this.rebindingAction = null;
        return;
      }
      if (!isAssignableKey(e.key)) return;
      setKeybind(this.rebindingAction, e.key);
      this.rebindingAction = null;
      playOnce(SFX.CHOICE, 0.4);
      return;
    }

    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: 'entry' } }));
    }
  }
}
