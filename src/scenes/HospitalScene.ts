import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import wardEmptyBg from '../assets/images/hospital/hospitalbg.png';
import patientA_in_bed from '../assets/images/hospital/patientA_in_bed.png';
import patientB_in_bed from '../assets/images/hospital/patientB_in_bed.png';
import patientC_in_bed from '../assets/images/hospital/patientC_in_bed.png';
import bed from '../assets/images/hospital/bed.png';
export class HospitalScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private patients: Patient[] = [];
  private keys: { [key: string]: boolean } = {};
  private backgroundImage: HTMLImageElement;
  private backgroundLoaded: boolean = false;
  private patientAElement: HTMLImageElement;
  private patientALoaded: boolean = false;
  private patientBElement: HTMLImageElement;
  private patientBLoaded: boolean = false;
  private patientCElement: HTMLImageElement;
  private patientCLoaded: boolean = false;
  private patientDElement: HTMLImageElement;
  private patientDLoaded: boolean = false;

  // ── Whether this scene is the active one ─────────────────────────────────
  // When false, ALL key input is ignored — prevents E from resetting dialogue
  private isActive: boolean = false;

  private showBedHitboxes: boolean = false; // Set to false to hide bed interaction zones
  private showMovementBoundary: boolean = false; // Set to false to hide movement boundary

  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // Movement bounds for horizontal left-to-right movement
  private movementBounds = {
    left: 0, right: 1600, top: 400, bottom: 880
  };

  private bedCharacterMap: Record<string, string> = {
    'Bed 1': 'day1patientA',
    'Bed 2': 'day1patientB',
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

    this.patientAElement     = new Image();
    this.patientBElement     = new Image();
    this.patientCElement     = new Image();
    this.patientDElement     = new Image();

    this.player = new Player(800, 680);
    
    // Set up Day 1 beds
    this.setBedDay(
      { image: patientA_in_bed, characterId: 'day1patientA' },
      { image: patientB_in_bed, characterId: 'day1patientB' },
      { image: patientC_in_bed, characterId: 'doctor_senior' },
      { image: bed }
    );
    
    this.setupPatients();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp   = this.onKeyUp.bind(this);

    // Register listeners once — they stay registered the whole game lifetime.
    // The isActive flag gates whether they do anything.
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup',   this.boundKeyUp);
  }

  public setBedImages(patientAImg?: string, patientBImg?: string, patientCImg?: string, patientDImg?: string): void {
    if (patientAImg) {
      this.patientAElement.src = patientAImg;
      this.patientAElement.onload = () => { this.patientALoaded = true; };
    } else {
      this.patientALoaded = false;
    }
    
    if (patientBImg) {
      this.patientBElement.src = patientBImg;
      this.patientBElement.onload = () => { this.patientBLoaded = true; };
    } else {
      this.patientBLoaded = false;
    }
    
    if (patientCImg) {
      this.patientCElement.src = patientCImg;
      this.patientCElement.onload = () => { this.patientCLoaded = true; };
    } else {
      this.patientCLoaded = false;
    }
    
    if (patientDImg) {
      this.patientDElement.src = patientDImg;
      this.patientDElement.onload = () => { this.patientDLoaded = true; };
    } else {
      this.patientDLoaded = false;
    }
  }

  public  setBedDay(
    bedA?: { image?: string; characterId?: string },
    bedB?: { image?: string; characterId?: string },
    bedC?: { image?: string; characterId?: string },
    bedD?: { image?: string; characterId?: string },
    bedE?: { image?: string; characterId?: string }
  ): void {
    // Set images
    this.setBedImages(bedA?.image, bedB?.image, bedC?.image, bedD?.image);
    
    // Update bedCharacterMap - only include beds with patients
    this.bedCharacterMap = {};
    if (bedA?.characterId) this.bedCharacterMap['Bed 1'] = bedA.characterId;
    if (bedB?.characterId) this.bedCharacterMap['Bed 2'] = bedB.characterId;
    if (bedC?.characterId) this.bedCharacterMap['Bed 3'] = bedC.characterId;
    if (bedD?.characterId) this.bedCharacterMap['Bed 4'] = bedD.characterId;
    if (bedE?.characterId) this.bedCharacterMap['Bed 5'] = bedE.characterId;
  }

  private setupPatients(): void {
    this.patients = [
      new Patient(325, 680, 'Mr. Chen',  'Bed 1'),
      new Patient(625, 680, 'Mrs. Park', 'Bed 2'),
      new Patient(925, 680, 'Mr. Liu',   'Bed 3'),
      new Patient(1225, 680, 'Ms. Wong',  'Bed 4'),
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
    // Vertical movement disabled - only left/right allowed

    this.player.move(dx, 0, this.width, this.height, this.movementBounds);
    
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
    if (this.patientALoaded) {
      ctx.drawImage(this.patientAElement, 0, 100, 650, 812);
    }
    if (this.patientBLoaded) {
      ctx.drawImage(this.patientBElement, 300, 100, 650, 812);
    }
    if (this.patientCLoaded) {
      ctx.drawImage(this.patientCElement, 600, 100, 650, 812);
    }
    if (this.patientDLoaded) {
      ctx.drawImage(this.patientDElement, 900, 100, 650, 812);
    }
    this.drawBedShadows();
    this.drawBedHitboxes();
    for (const patient of this.patients) {
      if (this.isPlayerNearHitbox(patient) && this.bedCharacterMap[patient.location]) this.drawInteractionPrompt(patient);
    }
    this.player.render(ctx);
    this.drawUI();
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
      ctx.fillText(patient.location, patient.x, hy - 5);
    });
  }

  private drawBedShadows(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

    // PatientA bed 
    ctx.beginPath();
    ctx.ellipse(300, 800, 130, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // PatientB bed 
    ctx.beginPath();
    ctx.ellipse(600, 800, 130, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // PatientC bed 
    ctx.beginPath();
    ctx.ellipse(900, 800, 130, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // PatientD bed 
    ctx.beginPath();
    ctx.ellipse(1200, 800, 130, 18, 0, 0, Math.PI * 2);
    ctx.fill();
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
    const promptY = patient.y - 100; // Position 100px above the patient
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(patient.x - 40, promptY - 12, 80, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press E', patient.x, promptY + 5);
  }

  private drawUI(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.width - 260, this.height - 90, 250, 90);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('A/D or ← →: Move',  this.width - 20, this.height - 55);
    ctx.fillText('E: Interact', this.width - 20, this.height - 25);
  }
}