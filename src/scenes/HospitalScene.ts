import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import wardEmptyBg from '../assets/images/hospital/hospitalbg.png';
import patientA_in_bed from '../assets/images/hospital/patientA_in_bed.png';
import patientB_in_bed from '../assets/images/hospital/patientB_in_bed.png';
import patientC_in_bed from '../assets/images/hospital/patientC_in_bed.png';
import bed from '../assets/images/hospital/bed.png';
import pagerImg from '../assets/images/ui/pager.png';
import phoneImg from '../assets/images/items/phone.png';

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

  // ── Pager notification system ────────────────────────────────────────────
  private pagerNotifications: number = 0;
  private completedBeds: Set<string> = new Set();
  
  // ── Day completion sequence ───────────────────────────────────────────────
  private completionSequenceActive: boolean = false;
  private completionTextDisplayed: boolean = false;
  private completionSettleFrames: number = 0; // Frames to wait after reaching destination
  private readonly BED_D_TARGET_X: number = 1225; // x position of bed D
  private readonly BED_D_TARGET_Y: number = 680;  // y position of bed D
  private readonly COMPLETION_MOVE_SPEED: number = 3;
  
  // Pager image and configuration
  private pagerImage: HTMLImageElement;
  private pagerImageLoaded: boolean = false;
  
  // Pager floating animation
  private pagerFloatOffset: number = 0;
  
  // Phone notification system
  private phoneNotifications: number = 0;
  private phoneImage: HTMLImageElement;
  private phoneImageLoaded: boolean = false;
  private phoneFloatOffset: number = 0;
  
  // Mouse tracking for hover
  private mouseX: number = 0;
  private mouseY: number = 0;
  private boundMouseMove: (e: MouseEvent) => void;
  
  // ── Pager UI Configuration (adjust these for size/position) ────────────────
  private readonly PAGER_CONFIG = {
    x: 30,           // X position from left edge
    y: 30,           // Y position from top edge
    width: 100,       // Width of pager image
    height: 135,      // Height of pager image (maintaining aspect ratio)
    badgeOffsetX: -20, // Badge X offset from top-right corner of pager
    badgeOffsetY: 30, // Badge Y offset from top-right corner of pager
    badgeRadius: 16, // Radius of notification badge circle
    
    // Backdrop configuration
    backdropPadding: 0,    // Padding around pager and badge
    backdropRadius: 12,     // Corner radius for rounded rectangle
    backdropOffsetX: 0,     // Additional X offset for backdrop
    backdropOffsetY: 0,     // Additional Y offset for backdrop
    
    // Floating animation
    floatAmplitude: 3,      // How many pixels to move up/down
    floatSpeed: 0.05,       // Animation speed (higher = faster)
  };
  
  // ── Phone UI Configuration (adjust these for size/position) ────────────────
  private readonly PHONE_CONFIG = {
    x: 30,           // X position from left edge
    y: 220,          // Y position from top edge (below pager)
    width: 100,      // Width of phone image
    height: 135,     // Height of phone image (maintaining aspect ratio)
    badgeOffsetX: -15, // Badge X offset from top-right corner
    badgeOffsetY: 25,  // Badge Y offset from top-right corner
    badgeRadius: 16, // Radius of notification badge circle
    
    // Backdrop configuration
    backdropPadding: 0,    // Padding around phone and badge
    backdropRadius: 12,     // Corner radius for rounded rectangle
    backdropOffsetX: 0,     // Additional X offset for backdrop
    backdropOffsetY: 0,     // Additional Y offset for backdrop
    
    // Floating animation
    floatAmplitude: 3,      // How many pixels to move up/down
    floatSpeed: 0.05,       // Animation speed (higher = faster)
  };

  private showBedHitboxes: boolean = false; // Set to false to hide bed interaction zones

  // ── Bed sprite layout — adjust width/height/offsetX/offsetY per bed ─────────
  // offsetX/offsetY shift the image relative to the patient's (x, y) anchor point.
  // The image is drawn so its horizontal centre aligns with patient.x + offsetX,
  // and its bottom edge sits at patient.y + offsetY.
  private readonly BED_SPRITES = [
    { src: patientA_in_bed, width: 480, height: 500, offsetX: 20, offsetY: 340 },  // Bed A
    { src: patientB_in_bed, width: 480, height: 500, offsetX: -10, offsetY: 340 },  // Bed B
    { src: patientC_in_bed, width: 480, height: 500, offsetX: -50, offsetY: 340 },  // Bed C
    { src: bed, width: 480, height: 500, offsetX: -70, offsetY: 340 },  // Bed D
  ];
  private bedImages: Array<{ img: HTMLImageElement; loaded: boolean }> = [];
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  // Movement bounds for horizontal left-to-right movement
  private movementBounds = {
    left: 0, right: 1600, top: 400, bottom: 880
  };

  private bedCharacterMap: Record<string, string> = {
    'Bed 1': 'day1patientA',
    'Bed 2': 'day1patientB',
    'Bed 3': 'day1patientC',
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

    // Load pager image
    this.pagerImage     = new Image();
    this.pagerImage.src = pagerImg;
    this.pagerImage.onload = () => { this.pagerImageLoaded = true; };
    
    // Load phone image
    this.phoneImage     = new Image();
    this.phoneImage.src = phoneImg;
    this.phoneImage.onload = () => { this.phoneImageLoaded = true; };

    this.player = new Player(800, 680);
    
    // Set up Day 1 beds
    this.setBedDay(
      { image: patientA_in_bed, characterId: 'day1patientA' },
      { image: patientB_in_bed, characterId: 'day1patientB' },
      { image: patientC_in_bed, characterId: 'day1patientC' },
      { image: bed }
    );
    
    this.setupPatients();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp   = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);

    // Register listeners once — they stay registered the whole game lifetime.
    // The isActive flag gates whether they do anything.
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup',   this.boundKeyUp);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
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

    // Handle completion sequence text box
    if (this.completionSequenceActive && this.completionTextDisplayed) {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        console.log('[HospitalScene] Dismissing completion text box');
        this.completionSequenceActive = false;
        this.completionTextDisplayed = false;
        // Add phone notification
        this.setPhoneNotifications(1);
        return;
      }
    }

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
        // Check if bed is already completed
        if (this.completedBeds.has(patient.location)) {
          console.log(`HospitalScene: ${patient.location} already completed`);
          return;
        }
        
        const characterId = this.bedCharacterMap[patient.location];
        if (!characterId) {
          console.warn(`HospitalScene: no characterId for "${patient.location}"`);
          return;
        }
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'dialogue', characterId, bedLocation: patient.location }
        }));
        break;
      }
    }
  }

  // ── Per-bed interaction zones — one entry per bed (A/B/C/D in order) ─────
  // hw = half-width (left/right reach), hh = half-height (up/down reach)
  // ox/oy   = shift the trigger zone from bed centre
  // promptOx/promptOy = shift the "Press E" label from bed centre
  // enabled = false disables the interaction zone entirely for that bed
  private readonly ZONES = [
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: 0, promptOy: -100, enabled: true  },  // Bed A
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -10, promptOy: -100, enabled: true  },  // Bed B
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -60, promptOy: -100, enabled: true  },  // Bed C
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -80, promptOy: -100, enabled: false },  // Bed D
  ];

  private isPlayerNearHitbox(patient: Patient): boolean {
    const i = this.patients.indexOf(patient);
    const z = this.ZONES[i] ?? this.ZONES[0];
    // Disable interaction if bed is already completed
    if (!z.enabled || this.completedBeds.has(patient.location)) return false;
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

  // ── Initialize pager for a new day ───────────────────────────────────────
  public startDay(patientCount: number): void {
    this.pagerNotifications = patientCount;
    this.completedBeds = new Set();
  }

  // ── Mouse move handler ────────────────────────────────────────────────────
  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  // ── Mark a bed as completed ──────────────────────────────────────────────
  public completeBed(bedLocation: string): void {
    if (!this.completedBeds.has(bedLocation)) {
      this.completedBeds.add(bedLocation);
      this.pagerNotifications = Math.max(0, this.pagerNotifications - 1);
      
      // Check if all patients have been seen (day 1 has 3 patients)
      if (this.pagerNotifications === 0 && !this.completionSequenceActive) {
        console.log('[HospitalScene] All patients seen - starting completion sequence');
        this.startCompletionSequence();
      }
    }
  }
  
  // ── Start day completion sequence ─────────────────────────────────────────
  private startCompletionSequence(): void {
    this.completionSequenceActive = true;
    this.completionTextDisplayed = false;
    this.completionSettleFrames = 0;
    console.log('[HospitalScene] Moving player to bed D...');
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

    // Update pager floating animation
    this.pagerFloatOffset += this.PAGER_CONFIG.floatSpeed;
    if (this.pagerFloatOffset > Math.PI * 2) {
      this.pagerFloatOffset -= Math.PI * 2;
    }
    
    // Update phone floating animation (slightly offset for variety)
    this.phoneFloatOffset += this.PHONE_CONFIG.floatSpeed;
    if (this.phoneFloatOffset > Math.PI * 2) {
      this.phoneFloatOffset -= Math.PI * 2;
    }

    // Handle completion sequence animation
    if (this.completionSequenceActive && !this.completionTextDisplayed) {
      // Auto-move player to bed D
      const dx = this.BED_D_TARGET_X - this.player.x;
      const dy = this.BED_D_TARGET_Y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 20) {
        // Move towards target
        const moveX = (dx / distance) * this.COMPLETION_MOVE_SPEED;
        const moveY = (dy / distance) * this.COMPLETION_MOVE_SPEED;
        this.player.move(moveX, moveY, this.width, this.height, this.movementBounds);
        this.completionSettleFrames = 0; // Reset settle counter while moving
        this.player.update();
      } else {
        // Reached destination - snap to exact position and force stop
        if (this.completionSettleFrames === 0) {
          this.player.x = this.BED_D_TARGET_X;
          this.player.y = this.BED_D_TARGET_Y;
          this.player.move(0, 0, this.width, this.height, this.movementBounds);
          this.player.update(); // Force immediate animation update
        }
        
        // Wait a couple frames for idle animation to fully settle
        this.completionSettleFrames++;
        if (this.completionSettleFrames > 2) {
          this.completionTextDisplayed = true;
          console.log('[HospitalScene] Player reached bed D - showing text box');
        }
      }
      return;
    }
    
    // Don't allow player movement during text display
    if (this.completionSequenceActive && this.completionTextDisplayed) {
      this.player.update();
      return;
    }

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
    this.drawPagerUI();
    this.drawPhoneUI();
    
    // Draw completion text box if active
    if (this.completionSequenceActive && this.completionTextDisplayed) {
      this.drawCompletionTextBox();
    }
    
    this.drawUI();
  }


  private drawBedHitboxes(): void {
    if (!this.showBedHitboxes) return; // Skip if disabled
    
    const ctx = this.ctx;
    this.patients.forEach((patient, i) => {
      const z = this.ZONES[i] ?? this.ZONES[0];
      const { hw, hh, ox, oy, enabled } = z;
      const cx = patient.x + ox, cy = patient.y + oy;
      const hx = cx - hw, hy = cy - hh;
      // Disabled zones shown in grey so you can still see them while debugging
      ctx.fillStyle   = enabled ? 'rgba(255,0,0,0.3)' : 'rgba(120,120,120,0.2)';
      ctx.fillRect(hx, hy, hw * 2, hh * 2);
      ctx.strokeStyle = enabled ? 'rgba(255,0,0,0.8)' : 'rgba(120,120,120,0.5)';
      ctx.lineWidth   = 2;
      ctx.strokeRect(hx, hy, hw * 2, hh * 2);
      ctx.fillStyle   = 'rgba(0,0,0,0.7)';
      ctx.font        = '12px Arial';
      ctx.textAlign   = 'center';
      ctx.fillText(enabled ? patient.location : `${patient.location} (disabled)`, cx, hy - 5);
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

  // private drawMovementBoundary(): void {
  //   if (!this.showMovementBoundary) return; // Skip if disabled
    
  //   const ctx = this.ctx;
  //   const bw  = this.movementBounds.right  - this.movementBounds.left;
  //   const bh  = this.movementBounds.bottom - this.movementBounds.top;
  //   ctx.fillStyle = 'rgba(0,0,0,0.3)';
  //   ctx.fillRect(0, 0, this.width, this.movementBounds.top);
  //   ctx.fillRect(0, this.movementBounds.bottom, this.width, this.height - this.movementBounds.bottom);
  //   ctx.fillRect(0, this.movementBounds.top, this.movementBounds.left, bh);
  //   ctx.fillRect(this.movementBounds.right, this.movementBounds.top, this.width - this.movementBounds.right, bh);
  //   ctx.strokeStyle = 'rgba(0,255,0,0.8)';
  //   ctx.lineWidth   = 3;
  //   ctx.strokeRect(this.movementBounds.left, this.movementBounds.top, bw, bh);
  //   const m = 10;
  //   ctx.fillStyle = 'rgba(0,255,0,0.9)';
  //   ctx.fillRect(this.movementBounds.left  - 2,     this.movementBounds.top    - 2,     m, m);
  //   ctx.fillRect(this.movementBounds.right - m + 2, this.movementBounds.top    - 2,     m, m);
  //   ctx.fillRect(this.movementBounds.left  - 2,     this.movementBounds.bottom - m + 2, m, m);
  //   ctx.fillRect(this.movementBounds.right - m + 2, this.movementBounds.bottom - m + 2, m, m);
  // }

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

  private drawPagerUI(): void {
    const ctx = this.ctx;
    const cfg = this.PAGER_CONFIG;

    // Calculate floating animation offset (only for badge)
    const floatY = Math.sin(this.pagerFloatOffset) * cfg.floatAmplitude;

    // Calculate badge position (needed for backdrop)
    const badgeX = cfg.x + cfg.width + cfg.badgeOffsetX;
    const badgeY = cfg.y + cfg.badgeOffsetY;
    const badgeRadius = cfg.badgeRadius;

    // Calculate backdrop bounds (to encompass pager and badge only if there are notifications)
    const backdropLeft = cfg.x - cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropTop = cfg.y - cfg.backdropPadding + cfg.backdropOffsetY;
    const backdropRight = (this.pagerNotifications > 0 ? Math.max(cfg.x + cfg.width, badgeX + badgeRadius) : cfg.x + cfg.width) + cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropBottom = cfg.y + cfg.height + cfg.backdropPadding + cfg.backdropOffsetY;
    const backdropWidth = backdropRight - backdropLeft;
    const backdropHeight = backdropBottom - backdropTop;

    // Draw backdrop with game-style design
    ctx.save();
    
    // Outer border (dark)
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, backdropLeft - 3, backdropTop - 3, backdropWidth + 6, backdropHeight + 6, cfg.backdropRadius + 2);
    ctx.fill();
    
    // Inner background (lighter)
    ctx.fillStyle = '#34495e';
    this.roundRect(ctx, backdropLeft, backdropTop, backdropWidth, backdropHeight, cfg.backdropRadius);
    ctx.fill();
    
    // Highlight border (top-left)
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 2;
    this.roundRect(ctx, backdropLeft + 2, backdropTop + 2, backdropWidth - 4, backdropHeight - 4, cfg.backdropRadius - 1);
    ctx.stroke();
    
    ctx.restore();

    // Draw pager image (no floating animation)
    if (this.pagerImageLoaded) {
      ctx.drawImage(this.pagerImage, cfg.x, cfg.y, cfg.width, cfg.height);
    } else {
      // Fallback: draw a simple rectangle if image not loaded
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(cfg.x, cfg.y, cfg.width, cfg.height);
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 2;
      ctx.strokeRect(cfg.x, cfg.y, cfg.width, cfg.height);
    }

    // Notification badge (overlaid on top right) - floats up and down
    if (this.pagerNotifications > 0) {
      const badgeYFloat = badgeY + floatY;

      // Red circle
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(badgeX, badgeYFloat, badgeRadius, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.pagerNotifications.toString(), badgeX, badgeYFloat);
    }

    // Check for hover and draw tooltip
    if (this.isMouseOverPager()) {
      this.drawPagerTooltip(backdropRight + 10, backdropTop + backdropHeight / 2);
    }
  }

  // Helper to draw rounded rectangle
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Check if mouse is over the pager area
  private isMouseOverPager(): boolean {
    const cfg = this.PAGER_CONFIG;
    const backdropLeft = cfg.x - cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropTop = cfg.y - cfg.backdropPadding + cfg.backdropOffsetY;
    
    const badgeX = cfg.x + cfg.width + cfg.badgeOffsetX;
    const badgeRadius = cfg.badgeRadius;
    
    const backdropRight = (this.pagerNotifications > 0 ? Math.max(cfg.x + cfg.width, badgeX + badgeRadius) : cfg.x + cfg.width) + cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropBottom = cfg.y + cfg.height + cfg.backdropPadding + cfg.backdropOffsetY;
    
    return this.mouseX >= backdropLeft && this.mouseX <= backdropRight &&
           this.mouseY >= backdropTop && this.mouseY <= backdropBottom;
  }

  // Draw tooltip when hovering over pager
  private drawPagerTooltip(x: number, y: number): void {
    const ctx = this.ctx;
    const text = 'Patients to see';
    const subText = `${this.pagerNotifications} ${this.pagerNotifications === 1 ? 'patient' : 'patients'} remaining`;
    
    // Measure text
    ctx.font = 'bold 14px Arial';
    const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(subText).width);
    const boxWidth = textWidth + 24;
    const boxHeight = 52;
    const boxRadius = 8;
    
    // Ensure tooltip stays on screen
    const tooltipX = Math.min(x, this.width - boxWidth - 10);
    const tooltipY = y - boxHeight / 2;
    
    ctx.save();
    
    // Draw game-style box with borders
    // Outer border
    ctx.fillStyle = '#1a252f';
    this.roundRect(ctx, tooltipX - 2, tooltipY - 2, boxWidth + 4, boxHeight + 4, boxRadius + 1);
    ctx.fill();
    
    // Main background
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, tooltipX, tooltipY, boxWidth, boxHeight, boxRadius);
    ctx.fill();
    
    // Top highlight
    ctx.fillStyle = 'rgba(90, 109, 127, 0.3)';
    this.roundRect(ctx, tooltipX + 2, tooltipY + 2, boxWidth - 4, 6, boxRadius - 1);
    ctx.fill();
    
    // Border accent
    ctx.strokeStyle = '#4a5f73';
    ctx.lineWidth = 1;
    this.roundRect(ctx, tooltipX + 1, tooltipY + 1, boxWidth - 2, boxHeight - 2, boxRadius);
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tooltipX + boxWidth / 2, tooltipY + 18);
    
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '12px Arial';
    ctx.fillText(subText, tooltipX + boxWidth / 2, tooltipY + 36);
    
    ctx.restore();
  }

  private drawPhoneUI(): void {
    const ctx = this.ctx;
    const cfg = this.PHONE_CONFIG;

    // Calculate floating animation offset (offset by PI for different timing than pager badge)
    const floatY = Math.sin(this.phoneFloatOffset + Math.PI) * cfg.floatAmplitude;

    // Calculate badge position (needed for backdrop)
    const badgeX = cfg.x + cfg.width + cfg.badgeOffsetX;
    const badgeY = cfg.y + cfg.badgeOffsetY;
    const badgeRadius = cfg.badgeRadius;

    // Calculate backdrop bounds (to encompass phone and badge if present)
    const backdropLeft = cfg.x - cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropTop = cfg.y - cfg.backdropPadding + cfg.backdropOffsetY;
    const backdropRight = (this.phoneNotifications > 0 ? Math.max(cfg.x + cfg.width, badgeX + badgeRadius) : cfg.x + cfg.width) + cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropBottom = cfg.y + cfg.height + cfg.backdropPadding + cfg.backdropOffsetY;
    const backdropWidth = backdropRight - backdropLeft;
    const backdropHeight = backdropBottom - backdropTop;

    // Draw backdrop with game-style design
    ctx.save();
    
    // Outer border (dark)
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, backdropLeft - 3, backdropTop - 3, backdropWidth + 6, backdropHeight + 6, cfg.backdropRadius + 2);
    ctx.fill();
    
    // Inner background (lighter)
    ctx.fillStyle = '#34495e';
    this.roundRect(ctx, backdropLeft, backdropTop, backdropWidth, backdropHeight, cfg.backdropRadius);
    ctx.fill();
    
    // Highlight border (top-left)
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 2;
    this.roundRect(ctx, backdropLeft + 2, backdropTop + 2, backdropWidth - 4, backdropHeight - 4, cfg.backdropRadius - 1);
    ctx.stroke();
    
    ctx.restore();

    // Draw phone image (no floating animation)
    if (this.phoneImageLoaded) {
      ctx.drawImage(this.phoneImage, cfg.x, cfg.y, cfg.width, cfg.height);
    } else {
      // Fallback: draw a simple rectangle if image not loaded
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(cfg.x, cfg.y, cfg.width, cfg.height);
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 2;
      ctx.strokeRect(cfg.x, cfg.y, cfg.width, cfg.height);
    }

    // Notification badge (overlaid on top right) - floats up and down
    if (this.phoneNotifications > 0) {
      const badgeYFloat = badgeY + floatY;

      // Red circle
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(badgeX, badgeYFloat, badgeRadius, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.phoneNotifications.toString(), badgeX, badgeYFloat);
    }

    // Check for hover and draw tooltip
    if (this.isMouseOverPhone()) {
      this.drawPhoneTooltip(backdropRight + 10, backdropTop + backdropHeight / 2);
    }
  }

  // Check if mouse is over the phone area
  private isMouseOverPhone(): boolean {
    const cfg = this.PHONE_CONFIG;
    const backdropLeft = cfg.x - cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropTop = cfg.y - cfg.backdropPadding + cfg.backdropOffsetY;
    
    const badgeX = cfg.x + cfg.width + cfg.badgeOffsetX;
    const badgeRadius = cfg.badgeRadius;
    
    const backdropRight = (this.phoneNotifications > 0 ? Math.max(cfg.x + cfg.width, badgeX + badgeRadius) : cfg.x + cfg.width) + cfg.backdropPadding + cfg.backdropOffsetX;
    const backdropBottom = cfg.y + cfg.height + cfg.backdropPadding + cfg.backdropOffsetY;
    
    return this.mouseX >= backdropLeft && this.mouseX <= backdropRight &&
           this.mouseY >= backdropTop && this.mouseY <= backdropBottom;
  }

  // Draw tooltip when hovering over phone
  private drawPhoneTooltip(x: number, y: number): void {
    const ctx = this.ctx;
    const text = this.phoneNotifications > 0 ? 'Messages' : 'No messages yet';
    const subText = this.phoneNotifications > 0 ? `${this.phoneNotifications} new ${this.phoneNotifications === 1 ? 'message' : 'messages'}` : '';
    
    // Measure text
    ctx.font = 'bold 14px Arial';
    const textWidth = Math.max(ctx.measureText(text).width, subText ? ctx.measureText(subText).width : 0);
    const boxWidth = textWidth + 24;
    const boxHeight = subText ? 52 : 32;
    const boxRadius = 8;
    
    // Ensure tooltip stays on screen
    const tooltipX = Math.min(x, this.width - boxWidth - 10);
    const tooltipY = y - boxHeight / 2;
    
    ctx.save();
    
    // Draw game-style box with borders
    // Outer border
    ctx.fillStyle = '#1a252f';
    this.roundRect(ctx, tooltipX - 2, tooltipY - 2, boxWidth + 4, boxHeight + 4, boxRadius + 1);
    ctx.fill();
    
    // Main background
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, tooltipX, tooltipY, boxWidth, boxHeight, boxRadius);
    ctx.fill();
    
    // Top highlight
    ctx.fillStyle = 'rgba(90, 109, 127, 0.3)';
    this.roundRect(ctx, tooltipX + 2, tooltipY + 2, boxWidth - 4, 6, boxRadius - 1);
    ctx.fill();
    
    // Border accent
    ctx.strokeStyle = '#4a5f73';
    ctx.lineWidth = 1;
    this.roundRect(ctx, tooltipX + 1, tooltipY + 1, boxWidth - 2, boxHeight - 2, boxRadius);
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (subText) {
      ctx.fillText(text, tooltipX + boxWidth / 2, tooltipY + 18);
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '12px Arial';
      ctx.fillText(subText, tooltipX + boxWidth / 2, tooltipY + 36);
    } else {
      ctx.fillText(text, tooltipX + boxWidth / 2, tooltipY + boxHeight / 2);
    }
    
    ctx.restore();
  }

  // Set phone notifications (call this when messages arrive)
  public setPhoneNotifications(count: number): void {
    this.phoneNotifications = Math.max(0, count);
  }
  
  // ── Draw completion text box (similar to DialogueScene) ──────────────────
  private drawCompletionTextBox(): void {
    const ctx = this.ctx;
    const margin = 40;
    const boxH = 180;
    const boxX = margin;
    const boxY = this.height - boxH - margin;
    const boxW = this.width - margin * 2;
    const boxPad = 20;
    
    // Accent color for nurse (player)
    const accentColor = '#3498db';
    const speakerName = 'Lylia';
    const text = "Hmm… I wonder why the bed's empty.";
    
    // Panel (dark semi-transparent background)
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    
    // Left accent stripe
    ctx.fillStyle = accentColor;
    this.roundRect(ctx, boxX, boxY, 5, boxH, 14);
    ctx.fill();
    
    // Top border line
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 14, boxY);
    ctx.lineTo(boxX + boxW - 14, boxY);
    ctx.stroke();
    
    // Name plate
    ctx.font = '700 14px "Segoe UI", sans-serif';
    const nameWidth = ctx.measureText(speakerName).width + 28;
    ctx.fillStyle = accentColor;
    this.roundRect(ctx, boxX + boxPad, boxY - 28, nameWidth, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(speakerName, boxX + boxPad + 14, boxY - 14);
    
    // Text content
    ctx.fillStyle = '#F0F0F0';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, boxX + boxPad + 8, boxY + 18);
    
    // Pulsing "E to continue" indicator
    const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = pulse;
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText('▼  E to continue', boxX + boxW - boxPad, boxY + boxH - 16);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
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