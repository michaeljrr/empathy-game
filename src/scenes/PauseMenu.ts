// ============================================================
//  PauseMenu.ts — Game-wide pause overlay (ESC to open)
// ============================================================

import { SFX, playOnce } from '../core/audio';
import {
  getSettings, setBgmVolume, setSfxVolume, setKeybind, resetKeybinds,
  formatKey, isAssignableKey, DEFAULT_KEYBINDS, KeybindAction,
} from '../core/settings';

type MenuView = 'main' | 'settings';
type MainAction = 'resume' | 'settings' | 'restart';

interface Button {
  label: string;
  action: MainAction | 'back' | 'reset-keys';
  rect: { x: number; y: number; w: number; h: number };
  hovered: boolean;
}

interface SliderState {
  rect: { x: number; y: number; w: number; h: number };
  label: 'BGM' | 'SFX';
  value: number;
  dragging: boolean;
}

interface KeybindRow {
  label: string;
  action: KeybindAction;
  rect: { x: number; y: number; w: number; h: number }; // key-button click target
}

export class PauseMenu {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private view: MenuView = 'main';
  private mainButtons: Button[] = [];
  private settingsBackBtn: Button = { label: 'Back', action: 'back', rect: { x: 0, y: 0, w: 0, h: 0 }, hovered: false };
  private settingsResetBtn: Button = { label: 'Reset Keys', action: 'reset-keys', rect: { x: 0, y: 0, w: 0, h: 0 }, hovered: false };

  private sliders: SliderState[] = [];
  private keybindRows: KeybindRow[] = [];
  private keybindHover: KeybindAction | null = null;
  private rebindingAction: KeybindAction | null = null;

  private mouseX = 0;
  private mouseY = 0;

  private onResume: () => void;
  private onRestart: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    handlers: { onResume: () => void; onRestart: () => void }
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onResume = handlers.onResume;
    this.onRestart = handlers.onRestart;
  }

  private get width(): number { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height(): number { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // Called by Game.ts when ESC opens the menu
  public open(): void {
    this.view = 'main';
    this.rebindingAction = null;
    this.rebuild();
  }

  // Called by Game.ts — forwards global keydowns while paused so the
  // rebinding flow can capture the next key press.
  public onGlobalKeyDown(e: KeyboardEvent): boolean {
    if (!this.rebindingAction) return false;
    e.preventDefault();
    if (e.key === 'Escape') {
      this.rebindingAction = null;
      return true;
    }
    if (!isAssignableKey(e.key)) return true;
    setKeybind(this.rebindingAction, e.key);
    this.rebindingAction = null;
    playOnce(SFX.CHOICE, 0.4);
    return true;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  public onMouseMove(canvasX: number, canvasY: number): void {
    this.mouseX = canvasX;
    this.mouseY = canvasY;

    // Drag sliders
    for (const s of this.sliders) {
      if (s.dragging) {
        const rel = (this.mouseX - s.rect.x) / s.rect.w;
        s.value = Math.max(0, Math.min(1, rel));
        if (s.label === 'BGM') setBgmVolume(s.value);
        else setSfxVolume(s.value);
      }
    }

    let anyHovered = false;

    if (this.view === 'main') {
      for (const b of this.mainButtons) {
        const wasHovered = b.hovered;
        b.hovered = this.hitTest(b.rect);
        if (b.hovered) anyHovered = true;
        if (b.hovered && !wasHovered) playOnce(SFX.ITEM, 0.35);
      }
    } else {
      // Settings view hover tracking
      const backWas = this.settingsBackBtn.hovered;
      const resetWas = this.settingsResetBtn.hovered;
      this.settingsBackBtn.hovered  = this.hitTest(this.settingsBackBtn.rect);
      this.settingsResetBtn.hovered = this.hitTest(this.settingsResetBtn.rect);
      if (this.settingsBackBtn.hovered  && !backWas)  playOnce(SFX.ITEM, 0.35);
      if (this.settingsResetBtn.hovered && !resetWas) playOnce(SFX.ITEM, 0.35);
      if (this.settingsBackBtn.hovered || this.settingsResetBtn.hovered) anyHovered = true;

      let newKbHover: KeybindAction | null = null;
      for (const row of this.keybindRows) {
        if (this.hitTest(row.rect)) {
          newKbHover = row.action;
          anyHovered = true;
          break;
        }
      }
      if (newKbHover && newKbHover !== this.keybindHover) playOnce(SFX.ITEM, 0.35);
      this.keybindHover = newKbHover;

      // Slider hover area (extended for knob)
      if (!anyHovered) {
        for (const s of this.sliders) {
          if (this.mouseX >= s.rect.x && this.mouseX <= s.rect.x + s.rect.w
              && this.mouseY >= s.rect.y - 8 && this.mouseY <= s.rect.y + s.rect.h + 8) {
            anyHovered = true; break;
          }
        }
      }
    }

    this.canvas.style.cursor = anyHovered ? 'pointer' : 'default';
  }

  public onMouseUp(): void {
    for (const s of this.sliders) s.dragging = false;
  }

  // Returns true if the click was handled (so callers can stopImmediatePropagation)
  public onClick(): boolean {
    if (this.rebindingAction) return true; // swallow click while rebinding

    if (this.view === 'main') {
      const clicked = this.mainButtons.find((b) => b.hovered);
      if (!clicked) return false;

      playOnce(SFX.ITEM, 0.45);
      if (clicked.action === 'resume') {
        this.canvas.style.cursor = 'default';
        this.onResume();
      } else if (clicked.action === 'settings') {
        this.view = 'settings';
        this.rebuild();
        this.canvas.style.cursor = 'default';
      } else if (clicked.action === 'restart') {
        this.canvas.style.cursor = 'default';
        this.onRestart();
      }
      return true;
    }

    // settings view — sliders (drag-start), keybind rows, Reset, Back
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
        return true;
      }
    }

    for (const row of this.keybindRows) {
      if (this.hitTest(row.rect)) {
        this.rebindingAction = row.action;
        playOnce(SFX.ITEM, 0.4);
        return true;
      }
    }

    if (this.settingsResetBtn.hovered) {
      playOnce(SFX.ITEM, 0.45);
      resetKeybinds();
      return true;
    }

    if (this.settingsBackBtn.hovered) {
      playOnce(SFX.ITEM, 0.45);
      this.view = 'main';
      this.rebuild();
      this.canvas.style.cursor = 'default';
      return true;
    }

    return false;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  public render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Translucent backdrop over the paused scene
    ctx.fillStyle = 'rgba(5, 8, 14, 0.72)';
    ctx.fillRect(0, 0, w, h);

    // Dimmed vignette for focus
    const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(30, 42, 60, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Panel — matches the in-world pager/phone UI palette
    const panelW = this.view === 'main' ? 360 : 520;
    const panelH = this.view === 'main' ? 340 : 520;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    // Outer border
    ctx.fillStyle = '#2c3e50';
    this.rrect(panelX - 3, panelY - 3, panelW + 6, panelH + 6, 14);
    ctx.fill();
    // Inner background
    ctx.fillStyle = '#34495e';
    this.rrect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    // Top highlight
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 2;
    this.rrect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 11);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.view === 'main' ? 'Paused' : 'Settings', w / 2, panelY + 44);

    // Accent line below title
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 48, panelY + 72);
    ctx.lineTo(panelX + panelW - 48, panelY + 72);
    ctx.stroke();

    if (this.view === 'main') {
      for (const b of this.mainButtons) this.drawButton(b);
      ctx.fillStyle = '#95a5a6';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESC to resume', w / 2, panelY + panelH - 18);
    } else {
      // Sliders
      for (const s of this.sliders) this.drawSlider(s);

      // Keybinds
      ctx.fillStyle = '#bdc3c7';
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const kbHeaderY = this.sliders[this.sliders.length - 1].rect.y + 58;
      ctx.fillText('KEY BINDINGS', panelX + 36, kbHeaderY);
      for (const row of this.keybindRows) this.drawKeybindRow(row, panelX);

      // Buttons
      this.drawButton(this.settingsResetBtn);
      this.drawButton(this.settingsBackBtn);
    }

    // Rebinding overlay
    if (this.rebindingAction) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);
      const boxW = 420, boxH = 120;
      const x = (w - boxW) / 2, y = (h - boxH) / 2;
      ctx.fillStyle = '#2c3e50';
      this.rrect(x - 3, y - 3, boxW + 6, boxH + 6, 12);
      ctx.fill();
      ctx.fillStyle = '#34495e';
      this.rrect(x, y, boxW, boxH, 10);
      ctx.fill();
      ctx.strokeStyle = '#5a6d7f';
      ctx.lineWidth = 2;
      this.rrect(x + 2, y + 2, boxW - 4, boxH - 4, 9);
      ctx.stroke();
      ctx.fillStyle = '#ecf0f1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText('Press a key…', w / 2, y + boxH / 2 - 10);
      ctx.fillStyle = '#95a5a6';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText('Esc to cancel', w / 2, y + boxH / 2 + 20);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private rebuild(): void {
    const w = this.width;
    const h = this.height;
    const panelW = this.view === 'main' ? 360 : 520;
    const panelH = this.view === 'main' ? 340 : 520;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    if (this.view === 'main') {
      const labels: { label: string; action: MainAction }[] = [
        { label: 'Resume',   action: 'resume' },
        { label: 'Settings', action: 'settings' },
        { label: 'Restart',  action: 'restart' },
      ];
      const btnW = 240;
      const btnH = 48;
      const gap  = 14;
      const startY = panelY + 96;
      this.mainButtons = labels.map((l, i) => ({
        label: l.label,
        action: l.action,
        rect: { x: (w - btnW) / 2, y: startY + i * (btnH + gap), w: btnW, h: btnH },
        hovered: false,
      }));
      this.sliders = [];
      this.keybindRows = [];
      return;
    }

    // Settings view layout
    const s = getSettings();
    const sliderX = panelX + 44;
    const sliderW = panelW - 88;
    this.sliders = [
      { label: 'BGM', rect: { x: sliderX, y: panelY + 108, w: sliderW, h: 14 }, value: s.bgmVolume, dragging: false },
      { label: 'SFX', rect: { x: sliderX, y: panelY + 168, w: sliderW, h: 14 }, value: s.sfxVolume, dragging: false },
    ];

    const rowH = 46;
    const keyStartY = this.sliders[1].rect.y + 90;
    const keyBtnW = 140;
    const keyBtnH = 34;
    const keyBtnX = panelX + panelW - keyBtnW - 40;
    this.keybindRows = [
      { label: 'Interact',   action: 'interact',  rect: { x: keyBtnX, y: keyStartY,              w: keyBtnW, h: keyBtnH } },
      { label: 'Move Left',  action: 'moveLeft',  rect: { x: keyBtnX, y: keyStartY + rowH,       w: keyBtnW, h: keyBtnH } },
      { label: 'Move Right', action: 'moveRight', rect: { x: keyBtnX, y: keyStartY + rowH * 2,   w: keyBtnW, h: keyBtnH } },
    ];

    // Bottom buttons
    const btnW = 170;
    const btnH = 42;
    const btnY = panelY + panelH - btnH - 30;
    this.settingsResetBtn.rect = { x: panelX + 40, y: btnY, w: btnW, h: btnH };
    this.settingsBackBtn.rect  = { x: panelX + panelW - btnW - 40, y: btnY, w: btnW, h: btnH };
    this.settingsResetBtn.hovered = false;
    this.settingsBackBtn.hovered = false;
  }

  private drawButton(btn: Button): void {
    const ctx = this.ctx;
    const { x, y, w, h } = btn.rect;
    ctx.fillStyle = btn.hovered ? '#5a6d7f' : '#2c3e50';
    this.rrect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = btn.hovered ? '#ecf0f1' : '#5a6d7f';
    ctx.lineWidth = btn.hovered ? 1.8 : 1.2;
    this.rrect(x, y, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = btn.hovered ? '#FFFFFF' : '#ecf0f1';
    ctx.font = '600 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, x + w / 2, y + h / 2);
  }

  private drawSlider(s: SliderState): void {
    const ctx = this.ctx;
    const { x, y, w, h } = s.rect;

    ctx.fillStyle = '#bdc3c7';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.label} VOLUME`, x, y - 10);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(s.value * 100)}%`, x + w, y - 10);

    // Track
    ctx.fillStyle = '#1a252f';
    this.rrect(x, y, w, h, 7);
    ctx.fill();
    // Fill
    const fillW = Math.max(0, w * s.value);
    ctx.fillStyle = '#5a6d7f';
    this.rrect(x, y, fillW, h, 7);
    ctx.fill();
    // Knob
    const knobR = 11;
    const knobX = x + fillW;
    const knobY = y + h / 2;
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawKeybindRow(row: KeybindRow, panelX: number): void {
    const ctx = this.ctx;
    const s = getSettings();
    const currentKey = s.keybinds[row.action];
    const defaultKey = DEFAULT_KEYBINDS[row.action];

    // Label
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.label, panelX + 40, row.rect.y + row.rect.h / 2 - 6);

    ctx.fillStyle = '#95a5a6';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText(`default: ${formatKey(defaultKey)}`, panelX + 40, row.rect.y + row.rect.h / 2 + 12);

    // Key button
    const { x, y, w, h } = row.rect;
    const rebinding = this.rebindingAction === row.action;
    const hovered = this.keybindHover === row.action;

    ctx.fillStyle = rebinding ? '#f1c40f' : (hovered ? '#5a6d7f' : '#2c3e50');
    this.rrect(x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = hovered || rebinding ? '#ecf0f1' : '#5a6d7f';
    ctx.lineWidth = 1.5;
    this.rrect(x, y, w, h, 7);
    ctx.stroke();

    ctx.fillStyle = rebinding ? '#2c3e50' : '#ecf0f1';
    ctx.font = '600 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = rebinding ? '…' : formatKey(currentKey);
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private hitTest(r: { x: number; y: number; w: number; h: number }): boolean {
    return (
      this.mouseX >= r.x && this.mouseX <= r.x + r.w &&
      this.mouseY >= r.y && this.mouseY <= r.y + r.h
    );
  }

  private rrect(x: number, y: number, w: number, h: number, r: number | number[]): void {
    this.ctx.beginPath();
    (this.ctx as any).roundRect(x, y, w, h, r);
  }
}
