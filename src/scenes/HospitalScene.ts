import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import { Obstacle } from '../entities/Obstacle';
import wardEmptyBg from '../assets/images/backgrounds/ward_empty.png';

export class HospitalScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private patients: Patient[] = [];
  private obstacles: Obstacle[] = [];
  private keys: { [key: string]: boolean } = {};
  private backgroundImage: HTMLImageElement;
  private backgroundLoaded: boolean = false;

  // ── Whether this scene is the active one ─────────────────────────────────
  // When false, ALL key input is ignored — prevents E from resetting dialogue
  private isActive: boolean = false;

  private showObstacles: boolean = false; // Set to false to hide obstacles
  private showBedHitboxes: boolean = false; // Set to false to hide bed interaction zones
  private showMovementBoundary: boolean = false; // Set to false to hide movement boundary
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  private movementBounds = {
    left: 50, right: 850, top: 50, bottom: 850
  };

  private bedCharacterMap: Record<string, string> = {
    'Bed 1': 'patient_elderly_man',
    'Bed 2': 'patient_young_woman',
    'Bed 3': 'doctor_senior',
    'Bed 4': 'nurse_colleague',
  };

  // Stable bound references so addEventListener/removeEventListener match
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp:   (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx    = ctx;

    this.backgroundImage     = new Image();
    this.backgroundImage.src = wardEmptyBg;
    this.backgroundImage.onload = () => { this.backgroundLoaded = true; };

    this.player = new Player(450, 450);
    this.setupPatients();
    this.setupObstacles();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp   = this.onKeyUp.bind(this);

    // Register listeners once — they stay registered the whole game lifetime.
    // The isActive flag gates whether they do anything.
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup',   this.boundKeyUp);
  }

  private setupPatients(): void {
    this.patients = [
      new Patient(245, 220, 'Mr. Chen',  'Bed 1'),
      new Patient(660, 225, 'Mrs. Park', 'Bed 2'),
      new Patient(245, 675, 'Mr. Liu',   'Bed 3'),
      new Patient(660, 675, 'Ms. Wong',  'Bed 4'),
    ];
  }

  private setupObstacles(): void {
    this.obstacles = [
      new Obstacle(245, 200, 150, 160, 'Bed 1'),  // Bed 1
      new Obstacle(660, 205, 150, 160, 'Bed 2'),  // Bed 2
      new Obstacle(245, 635, 150, 300, 'Bed 3'),  // Bed 3
      new Obstacle(660, 635, 150, 300, 'Bed 4'),  // Bed 4
      new Obstacle(150, 410, 200, 100, 'Left Wall'),      // Left partition wall
      new Obstacle(750, 410, 200, 100, 'Right Wall'),     // Right partition wall
      new Obstacle(450, 150, 50, 200, 'Top Wall'),       // Top wall
      new Obstacle(450, 720, 50, 300, 'Bottom Wall'),    // Bottom wall
      new Obstacle(370, 130, 100, 100, 'Bed 1 Box'), // Bed 1 Box
      new Obstacle(770, 130, 100, 100, 'Bed 2 Box'), // Bed 2 Box
      new Obstacle(130, 680, 100, 100, 'Bed 3 Box'), // Bed 3 Box
      new Obstacle(770, 540, 100, 100, 'Bed 4 Box'), // Bed 4 Box
      // Add more obstacles as needed...
    ];
  }

  private onKeyDown(e: KeyboardEvent): void {
    // ← Hard gate: do nothing if hospital is not the active scene
    if (!this.isActive) return;

    this.keys[e.key] = true;
    if (e.key === 'e' || e.key === 'E') {
      this.checkInteraction();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.isActive) return;
    this.keys[e.key] = false;
  }

  private checkInteraction(): void {
    for (const patient of this.patients) {
      if (this.isPlayerNearHitbox(patient)) {
        const characterId = this.bedCharacterMap[patient.location];
        if (!characterId) {
          console.warn(`HospitalScene: no characterId for "${patient.location}"`);
          return;
        }
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'dialogue', characterId, patient }
        }));
        break;
      }
    }
  }

  private isPlayerNearHitbox(patient: Patient): boolean {
    const hw = 240, hh = 280;
    return (
      this.player.x >= patient.x - hw / 2 &&
      this.player.x <= patient.x + hw / 2 &&
      this.player.y >= patient.y - hh / 2 &&
      this.player.y <= patient.y + hh / 2
    );
  }

  // ── Called by Game.ts when switching TO this scene ────────────────────────
  public activate(): void {
    this.isActive = true;
    this.keys     = {}; // clear any held keys from before
  }

  // ── Called by Game.ts when switching AWAY from this scene ─────────────────
  public deactivate(): void {
    this.isActive = false;
    this.keys     = {};
  }

  // cleanup kept for compatibility — deactivate is the main mechanism now
  public cleanup(): void {
    this.deactivate();
  }

  public resume(): void {
    this.activate();
  }

  public update(): void {
    if (!this.isActive) return;

    const speed = 4;
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft']  || this.keys['a']) dx = -speed;
    if (this.keys['ArrowRight'] || this.keys['d']) dx =  speed;
    if (this.keys['ArrowUp']    || this.keys['w']) dy = -speed;
    if (this.keys['ArrowDown']  || this.keys['s']) dy =  speed;

    const oldX = this.player.x;
    const oldY = this.player.y;
    this.player.move(dx, dy, this.width, this.height, this.movementBounds);
    for (const obstacle of this.obstacles) {
      if (obstacle.contains(this.player.x, this.player.y)) {
        this.player.x = oldX;
        this.player.y = oldY;
        break;
      }
    }
    this.player.update();
  }

  public render(): void {
    const ctx = this.ctx;
    if (this.backgroundLoaded) {
      ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    this.drawBedHitboxes();
    this.drawMovementBoundary();
    for (const obstacle of this.obstacles) obstacle.render(ctx, this.showObstacles);
    for (const patient of this.patients) {
      if (this.isPlayerNearHitbox(patient)) this.drawInteractionPrompt(patient);
    }
    this.player.render(ctx);
    this.drawUI();
  }

  private drawBedHitboxes(): void {
    if (!this.showBedHitboxes) return; // Skip if disabled
    
    const ctx = this.ctx;
    for (const patient of this.patients) {
      const hw = 220, hh = 280;
      const hx = patient.x - hw / 2, hy = patient.y - hh / 2;
      ctx.fillStyle   = 'rgba(255,0,0,0.3)';
      ctx.fillRect(hx, hy, hw, hh);
      ctx.strokeStyle = 'rgba(255,0,0,0.8)';
      ctx.lineWidth   = 2;
      ctx.strokeRect(hx, hy, hw, hh);
      ctx.fillStyle   = 'rgba(0,0,0,0.7)';
      ctx.font        = '12px Arial';
      ctx.textAlign   = 'center';
      ctx.fillText(patient.location, patient.x, hy - 5);
    }
  }

  private drawMovementBoundary(): void {
    if (!this.showMovementBoundary) return; // Skip if disabled
    
    const ctx = this.ctx;
    const bw  = this.movementBounds.right  - this.movementBounds.left;
    const bh  = this.movementBounds.bottom - this.movementBounds.top;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, this.width, this.movementBounds.top);
    ctx.fillRect(0, this.movementBounds.bottom, this.width, this.height - this.movementBounds.bottom);
    ctx.fillRect(0, this.movementBounds.top, this.movementBounds.left, bh);
    ctx.fillRect(this.movementBounds.right, this.movementBounds.top, this.width - this.movementBounds.right, bh);
    ctx.strokeStyle = 'rgba(0,255,0,0.8)';
    ctx.lineWidth   = 3;
    ctx.strokeRect(this.movementBounds.left, this.movementBounds.top, bw, bh);
    const m = 10;
    ctx.fillStyle = 'rgba(0,255,0,0.9)';
    ctx.fillRect(this.movementBounds.left  - 2,     this.movementBounds.top    - 2,     m, m);
    ctx.fillRect(this.movementBounds.right - m + 2, this.movementBounds.top    - 2,     m, m);
    ctx.fillRect(this.movementBounds.left  - 2,     this.movementBounds.bottom - m + 2, m, m);
    ctx.fillRect(this.movementBounds.right - m + 2, this.movementBounds.bottom - m + 2, m, m);
  }

  private drawInteractionPrompt(patient: Patient): void {
    const ctx = this.ctx;
    const hh  = 270;
    const hy  = patient.y - hh / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(patient.x - 40, hy - 35, 80, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press E', patient.x, hy - 15);
  }

  private drawUI(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, this.height - 50, 250, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / Arrow Keys: Move',   20, this.height - 25);
    ctx.fillText('E: Interact with patients', 20, this.height - 10);
  }
}