import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import hospitalBg from '../assets/images/hospital/hospitalbg.png';
import bedImgA    from '../assets/images/hospital/bed_w_a.png';       // Elderly man in bed
import bedImgB    from '../assets/images/hospital/ward_strokepatient.png'; // Young woman on bed
import bedImgC    from '../assets/images/hospital/sleeping_patient.png';   // Sleeping patient
import bedImgD    from '../assets/images/hospital/bed.png';                // Empty bed

export class HospitalScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private patients: Patient[] = [];
  private keys: { [key: string]: boolean } = {};
  private backgroundImage: HTMLImageElement;
  private backgroundLoaded: boolean = false;

  // ── Whether this scene is the active one ─────────────────────────────────
  // When false, ALL key input is ignored — prevents E from resetting dialogue
  private isActive: boolean = false;

  private showBedHitboxes: boolean = false; // Set to false to hide bed interaction zones

  // ── Bed sprite layout — adjust width/height/offsetX/offsetY per bed ─────────
  // offsetX/offsetY shift the image relative to the patient's (x, y) anchor point.
  // The image is drawn so its horizontal centre aligns with patient.x + offsetX,
  // and its bottom edge sits at patient.y + offsetY.
  private readonly BED_SPRITES = [
    { src: bedImgA, width: 450, height: 500, offsetX: 20, offsetY: 300 },  // Bed A
    { src: bedImgB, width: 480, height: 500, offsetX: -10, offsetY: 300 },  // Bed B
    { src: bedImgC, width: 480, height: 500, offsetX: -50, offsetY: 300 },  // Bed C
    { src: bedImgD, width: 480, height: 500, offsetX: -70, offsetY: 300 },  // Bed D
  ];
  private bedImages: Array<{ img: HTMLImageElement; loaded: boolean }> = [];
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // Movement bounds for horizontal left-to-right movement
  private movementBounds = {
    left: 100,
    right: 1436,
    verticalY: 340  // Fixed vertical position for horizontal movement
  };

  private bedCharacterMap: Record<string, string> = {
    'Bed A': 'patient_elderly_man',
    'Bed B': 'patient_young_woman',
    'Bed C': 'doctor_senior',
    'Bed D': 'nurse_colleague',
  };

  // Stable bound references so addEventListener/removeEventListener match
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp:   (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx    = ctx;

    this.backgroundImage     = new Image();
    this.backgroundImage.src = hospitalBg;
    this.backgroundImage.onload = () => { this.backgroundLoaded = true; };

    // Load per-bed sprites
    this.bedImages = this.BED_SPRITES.map(cfg => {
      const entry = { img: new Image(), loaded: false };
      entry.img.src = cfg.src;
      entry.img.onload = () => { entry.loaded = true; };
      return entry;
    });

    // Start player at left side, middle vertical position
    this.player = new Player(150, 370);
    this.setupPatients();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp   = this.onKeyUp.bind(this);

    // Register listeners once — they stay registered the whole game lifetime.
    // The isActive flag gates whether they do anything.
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup',   this.boundKeyUp);
  }

  private setupPatients(): void {
    // Beds positioned left to right with equal spacing
    const bedSpacing = (this.movementBounds.right - this.movementBounds.left) / 4;
    const startX = this.movementBounds.left + bedSpacing / 2;
    const yPosition = 300; // Vertical position of beds

    this.patients = [
      new Patient(startX + bedSpacing * 0, yPosition, 'Patient A', 'Bed A'),
      new Patient(startX + bedSpacing * 1, yPosition, 'Patient B', 'Bed B'),
      new Patient(startX + bedSpacing * 2, yPosition, 'Patient C', 'Bed C'),
      new Patient(startX + bedSpacing * 3, yPosition, 'Patient D', 'Bed D'),
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

  // ── Per-bed interaction zones — one entry per bed (A/B/C/D in order) ─────
  // hw = half-width (left/right reach), hh = half-height (up/down reach)
  // ox/oy   = shift the trigger zone from bed centre
  // promptOx/promptOy = shift the "Press E" label from bed centre
  private readonly ZONES = [
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: 0, promptOy: -100 },  // Bed A
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -10, promptOy: -100 },  // Bed B
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -60, promptOy: -100 },  // Bed C
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -80, promptOy: -100 },  // Bed D
  ];

  private isPlayerNearHitbox(patient: Patient): boolean {
    const i = this.patients.indexOf(patient);
    const z = this.ZONES[i] ?? this.ZONES[0];
    return (
      Math.abs(this.player.x - (patient.x + z.ox)) < z.hw &&
      Math.abs(this.player.y - (patient.y + z.oy)) < z.hh
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

    const speed = 5;
    let dx = 0;
    
    // Horizontal movement only (left-right)
    if (this.keys['ArrowLeft']  || this.keys['a']) dx = -speed;
    if (this.keys['ArrowRight'] || this.keys['d']) dx =  speed;

    // Fix vertical position before move so player stays on the horizontal lane
    this.player.y = this.movementBounds.verticalY;

    // Use player.move() so isMoving and facingLeft are set correctly (needed for walking animation)
    this.player.move(dx, 0, this.width, this.height, {
      left:   this.movementBounds.left,
      right:  this.movementBounds.right,
      top:    this.movementBounds.verticalY,
      bottom: this.movementBounds.verticalY,
    });
    
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
    this.drawBedSprites();
    this.drawBedHitboxes();
    for (const patient of this.patients) {
      if (this.isPlayerNearHitbox(patient)) this.drawInteractionPrompt(patient);
    }
    this.player.render(ctx);
    this.drawUI();
  }

  private drawBedSprites(): void {
    const ctx = this.ctx;
    this.patients.forEach((patient, i) => {
      const cfg   = this.BED_SPRITES[i];
      const entry = this.bedImages[i];
      if (!cfg || !entry?.loaded) return;
      const drawX = patient.x + cfg.offsetX - cfg.width  / 2;
      const drawY = patient.y + cfg.offsetY - cfg.height;
      ctx.drawImage(entry.img, drawX, drawY, cfg.width, cfg.height);
    });
  }

  private drawBedHitboxes(): void {
    if (!this.showBedHitboxes) return; // Skip if disabled
    
    const ctx = this.ctx;
    this.patients.forEach((patient, i) => {
      const { hw, hh, ox, oy } = this.ZONES[i] ?? this.ZONES[0];
      const cx = patient.x + ox, cy = patient.y + oy;
      const hx = cx - hw, hy = cy - hh;
      ctx.fillStyle   = 'rgba(255,0,0,0.3)';
      ctx.fillRect(hx, hy, hw * 2, hh * 2);
      ctx.strokeStyle = 'rgba(255,0,0,0.8)';
      ctx.lineWidth   = 2;
      ctx.strokeRect(hx, hy, hw * 2, hh * 2);
      ctx.fillStyle   = 'rgba(0,0,0,0.7)';
      ctx.font        = '12px Arial';
      ctx.textAlign   = 'center';
      ctx.fillText(patient.location, cx, hy - 5);
    });
  }



  private drawInteractionPrompt(patient: Patient): void {
    const ctx = this.ctx;
    const i = this.patients.indexOf(patient);
    const { promptOx, promptOy } = this.ZONES[i] ?? this.ZONES[0];
    const px = patient.x + promptOx;
    const py = patient.y + promptOy;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(px - 40, py, 80, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Press E', px, py + 12.5);
  }

  private drawUI(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, this.height - 63, 250, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('A/D or ← →: Move Left/Right', 20, this.height - 45);
    ctx.fillText('E: Interact with patients',   20, this.height - 25);
  }
}