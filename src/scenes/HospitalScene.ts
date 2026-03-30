import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import wardEmptyBg from '../assets/images/hospital/hospitalbg.png';
import patientA_in_bed from '../assets/images/hospital/patientA_in_bed.png';
import patientB_in_bed from '../assets/images/hospital/patientB_in_bed.png';
import patientC_in_bed from '../assets/images/hospital/patientC_in_bed.png';
import bed from '../assets/images/hospital/bed.png';
import pagerImg from '../assets/images/ui/pager.png';
import phoneImg from '../assets/images/items/phone.png';
import lyliaNeutral from '../assets/images/characters/lylia/lylia_neutral.png';
import nurseHappy from '../assets/images/characters/nurse/nurse_happy.png';

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
  private isTransitioning: boolean = false; // Prevents input spam during scene transitions

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
  private boundClick: (e: MouseEvent) => void;
  
  // ── Phone Popup System ────────────────────────────────────────────────────
  private phonePopupActive: boolean = false;
  private phonePopupY: number = 0; // Current Y position for animation
  private phonePopupTargetY: number = 0; // Target Y position
  private readonly PHONE_POPUP_SPEED: number = 25; // Animation speed
  private readonly PHONE_POPUP_HEIGHT: number = 875; // Height of popup (matches phoneHeight)
  
  // Character sprites for phone dialogue
  private lyliaSprite: HTMLImageElement;
  private lyliaSpriteLoaded: boolean = false;
  private nurseSprite: HTMLImageElement;
  
  // Phone dialogue state
  private phoneDialogueStep: number = 0; // 0: Lylia message, 1: MC response
  private phoneDialogueText: string = '';
  private phoneDisplayedText: string = '';
  private phoneTypewriterIndex: number = 0;
  private phoneTypewriterTimer: number = 0;
  private readonly PHONE_TYPEWRITER_SPEED: number = 30; // ms per character
  private phoneIsTyping: boolean = false;
  private phoneTextComplete: boolean = false;
  
  // Phone sprite bobbing animation
  private phoneBobOffset: number = 0;
  private phoneBobTime: number = 0;
  
  // Phone dialogue scripts
  private readonly PHONE_DIALOGUES = [
    { speaker: 'Lylia', text: 'eh you done yet? would you like to go home together', accentColor: '#B5748A', sprite: 'lylia' },
    { speaker: 'player', text: 'sure', accentColor: '#5AC57A', sprite: 'lylia' } // Changed to 'player' and keep lylia sprite
  ];
  
  // ── Phone UI Layout Configuration (configurable) ──────────────────────────
  // You can now adjust phone image position, size, and content area independently:
  // - phoneOffsetX/Y: Move the entire phone on screen (0 = centered horizontally)
  // - phoneWidth/Height: Resize the phone image
  // - contentAreaX/Y: Adjust where sprite/text appear relative to phone edge
  private readonly PHONE_POPUP_CONFIG = {
    // Phone position on screen
    phoneOffsetX: 0,         // Horizontal offset from center (+ = right, - = left)
    phoneOffsetY: 0,         // Vertical offset from animated position (+ = down, - = up)
    
    // Phone image display size (adjust this to resize the phone image)
    phoneWidth: 1100,
    phoneHeight: 1295,
    
    // Content area (independent from phone size - adjust sprite/text box area)
    // These define the actual usable area for sprite and text
    contentAreaX: 267,        // X offset from phone left edge
    contentAreaY: 240,       // Y offset from phone top edge
    contentAreaWidth: 547,   // Width of content area (680 - 62 - 62)
    contentAreaHeight: 566,  // Height of content area (875 - 124 - 185)
    
    screenColor: '#95b899', // Sage green screen background
    
    // Dialogue box position within content area
    dialogueBoxBottomMargin: 30, // Space from bottom of content area
    dialogueBoxHeight: 140,
    dialogueBoxPadding: 18,
    
    // Sprite position within content area
    spritePadding: 25,
    spriteMaxHeight: 340, // Max height for character sprite
  };
  
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
    
    // Load character sprites for phone dialogue
    this.lyliaSprite     = new Image();
    this.lyliaSprite.src = lyliaNeutral;
    this.lyliaSprite.onload = () => { this.lyliaSpriteLoaded = true; };
    
    this.nurseSprite     = new Image();
    this.nurseSprite.src = nurseHappy;

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
    this.boundClick = this.onClick.bind(this);

    // Register listeners once — they stay registered the whole game lifetime.
    // The isActive flag gates whether they do anything.
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup',   this.boundKeyUp);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('click', this.boundClick);
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

    // Handle phone popup dialogue
    if (this.phonePopupActive) {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        this.advancePhoneDialogue();
        return;
      }
    }

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
    if (this.isTransitioning) return; // Ignore input during scene transition
    
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
        this.isTransitioning = true; // Block further input during transition
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
    this.isTransitioning = false; // Reset transition flag when returning to scene
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

  // ── Click handler ─────────────────────────────────────────────────────────
  private onClick(_e: MouseEvent): void {
    if (!this.isActive) return;
    
    // If phone popup is active, handle dialogue progression
    if (this.phonePopupActive) {
      this.advancePhoneDialogue();
      return;
    }
    
    // Check if phone icon was clicked
    if (this.isMouseOverPhone() && this.phoneNotifications > 0) {
      this.openPhonePopup();
    }
  }

  // ── Open phone popup ──────────────────────────────────────────────────────
  private openPhonePopup(): void {
    console.log('[HospitalScene] Opening phone popup');
    this.phonePopupActive = true;
    this.phonePopupY = this.height; // Start off-screen at bottom
    this.phonePopupTargetY = this.height - this.PHONE_POPUP_HEIGHT; // Target position
    this.phoneDialogueStep = 0;
    this.startPhoneTypewriter(this.PHONE_DIALOGUES[0].text);
  }

  // ── Start phone typewriter ────────────────────────────────────────────────
  private startPhoneTypewriter(text: string): void {
    this.phoneDialogueText = text;
    this.phoneDisplayedText = '';
    this.phoneTypewriterIndex = 0;
    this.phoneTypewriterTimer = 0;
    this.phoneIsTyping = true;
    this.phoneTextComplete = false;
  }

  // ── Advance phone dialogue ────────────────────────────────────────────────
  private advancePhoneDialogue(): void {
    // If still typing, skip to end
    if (this.phoneIsTyping) {
      this.phoneIsTyping = false;
      this.phoneDisplayedText = this.phoneDialogueText;
      this.phoneTextComplete = true;
      return;
    }

    // If text is complete, move to next step
    if (this.phoneTextComplete) {
      this.phoneDialogueStep++;
      
      if (this.phoneDialogueStep < this.PHONE_DIALOGUES.length) {
        // Show next dialogue
        this.startPhoneTypewriter(this.PHONE_DIALOGUES[this.phoneDialogueStep].text);
      } else {
        // Phone dialogue complete - transition to ending scene
        this.closePhonePopup();
        console.log('[HospitalScene] Phone dialogue complete, transitioning to Day1EndingScene');
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: 'day1Ending' }
        }));
      }
    }
  }

  // ── Close phone popup ─────────────────────────────────────────────────────
  private closePhonePopup(): void {
    console.log('[HospitalScene] Closing phone popup');
    this.phonePopupActive = false;
    this.phoneNotifications = 0; // Clear notification badge
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
    
    // ── Phone popup animation and typewriter ───────────────────────────────
    if (this.phonePopupActive) {
      // Animate popup sliding up
      if (this.phonePopupY > this.phonePopupTargetY) {
        this.phonePopupY = Math.max(this.phonePopupTargetY, this.phonePopupY - this.PHONE_POPUP_SPEED);
      }
      
      // Update typewriter
      if (this.phoneIsTyping) {
        this.phoneTypewriterTimer += 16; // Assuming ~60fps, each frame is ~16ms
        while (this.phoneTypewriterTimer >= this.PHONE_TYPEWRITER_SPEED && this.phoneTypewriterIndex < this.phoneDialogueText.length) {
          this.phoneTypewriterTimer -= this.PHONE_TYPEWRITER_SPEED;
          this.phoneDisplayedText += this.phoneDialogueText[this.phoneTypewriterIndex++];
        }
        if (this.phoneTypewriterIndex >= this.phoneDialogueText.length) {
          this.phoneIsTyping = false;
          this.phoneDisplayedText = this.phoneDialogueText;
          this.phoneTextComplete = true;
        }
      }
      
      // Update sprite bobbing animation
      this.phoneBobTime += 16;
      this.phoneBobOffset = this.phoneIsTyping
        ? Math.sin(this.phoneBobTime / 280) * 4
        : Math.sin(this.phoneBobTime / 800) * 2;
      
      // Don't process other updates while phone popup is active
      return;
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
    
    // Draw phone popup overlay (on top of everything)
    if (this.phonePopupActive) {
      this.drawPhonePopup();
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
    const speakerName = localStorage.getItem('playerName') || 'Nurse';
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

  // ── Draw phone popup overlay ──────────────────────────────────────────────
  private drawPhonePopup(): void {
    const ctx = this.ctx;
    const cfg = this.PHONE_POPUP_CONFIG;
    
    // Draw semi-transparent overlay background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Phone popup dimensions and position
    const phoneWidth = cfg.phoneWidth;
    const phoneHeight = cfg.phoneHeight;
    const phoneX = (this.width - phoneWidth) / 2 + cfg.phoneOffsetX;
    const phoneY = this.phonePopupY + cfg.phoneOffsetY;
    
    // Draw phone image (no stretching - maintain aspect ratio)
    if (this.phoneImageLoaded) {
      ctx.drawImage(this.phoneImage, phoneX, phoneY, phoneWidth, phoneHeight);
    } else {
      // Fallback: draw phone outline
      ctx.fillStyle = '#2c3e50';
      this.roundRect(ctx, phoneX, phoneY, phoneWidth, phoneHeight, 40);
      ctx.fill();
      
      // Phone screen area
      ctx.fillStyle = cfg.screenColor;
      const screenX = phoneX + cfg.contentAreaX;
      const screenY = phoneY + cfg.contentAreaY;
      const screenW = cfg.contentAreaWidth;
      const screenH = cfg.contentAreaHeight;
      this.roundRect(ctx, screenX, screenY, screenW, screenH, 8);
      ctx.fill();
    }
    
    // ── Calculate content area inside phone (independent from phone size) ──
    const screenX = phoneX + cfg.contentAreaX;
    const screenY = phoneY + cfg.contentAreaY;
    const screenWidth = cfg.contentAreaWidth;
    const screenHeight = cfg.contentAreaHeight;
    
    // Draw backdrop to hide "ONE NEW MESSAGE" text
    ctx.fillStyle = cfg.screenColor;
    this.roundRect(ctx, screenX, screenY, screenWidth, screenHeight, 8);
    ctx.fill();
    
    // Get current dialogue
    const currentDialogue = this.PHONE_DIALOGUES[this.phoneDialogueStep];
    
    // Draw character sprite (always Lylia, with bobbing)
    if (this.lyliaSpriteLoaded) {
      const img = this.lyliaSprite;
      const spriteNaturalW = img.naturalWidth;
      const spriteNaturalH = img.naturalHeight;
      
      // Scale to fit within sprite area
      const scale = Math.min(
        (screenWidth - cfg.spritePadding * 2) / spriteNaturalW,
        cfg.spriteMaxHeight / spriteNaturalH,
        1 // Don't upscale
      );
      
      const spriteWidth = spriteNaturalW * scale;
      const spriteHeight = spriteNaturalH * scale;
      const spriteX = screenX + (screenWidth - spriteWidth) / 2;
      const spriteY = screenY + cfg.spritePadding + this.phoneBobOffset;
      
      ctx.drawImage(img, spriteX, spriteY, spriteWidth, spriteHeight);
    }
    
    // ── Draw DialogueScene-style text box ─────────────────────────────────
    const boxX = screenX + cfg.dialogueBoxPadding;
    const boxY = screenY + screenHeight - cfg.dialogueBoxHeight - cfg.dialogueBoxBottomMargin;
    const boxW = screenWidth - cfg.dialogueBoxPadding * 2;
    const boxH = cfg.dialogueBoxHeight;
    
    // Get speaker info
    const isPlayer = currentDialogue.speaker === 'player';
    const playerName = localStorage.getItem('playerName') || 'Nurse';
    const speakerName = isPlayer ? playerName : currentDialogue.speaker;
    const accentColor = currentDialogue.accentColor;
    
    // Panel (dark semi-transparent background)
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    
    // Left accent stripe
    ctx.fillStyle = accentColor;
    this.roundRect(ctx, boxX, boxY, 4, boxH, 10);
    ctx.fill();
    
    // Top border line
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 10, boxY);
    ctx.lineTo(boxX + boxW - 10, boxY);
    ctx.stroke();
    
    // Name plate (top-left corner)
    ctx.font = '700 12px "Segoe UI", sans-serif';
    const nameWidth = ctx.measureText(speakerName).width;
    const namePlateW = nameWidth + 20;
    const namePlateH = 22;
    
    ctx.fillStyle = accentColor;
    this.roundRect(ctx, boxX + cfg.dialogueBoxPadding, boxY - namePlateH, namePlateW, namePlateH, 5);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(speakerName, boxX + cfg.dialogueBoxPadding + 10, boxY - namePlateH / 2);
    
    // Dialogue text with word wrapping
    ctx.fillStyle = '#F0F0F0';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const textX = boxX + cfg.dialogueBoxPadding + 6;
    const textY = boxY + 12;
    const maxWidth = boxW - cfg.dialogueBoxPadding * 2 - 12;
    
    this.wrapTextPhone(ctx, this.phoneDisplayedText, textX, textY, maxWidth, 20);
    
    // "Tap to continue" indicator (only show when text is complete)
    if (this.phoneTextComplete) {
      const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 420)) * 0.5;
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = pulse;
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText('▼  E to continue', boxX + boxW - cfg.dialogueBoxPadding, boxY + boxH - 12);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  // Helper method for word wrapping in phone dialogue
  private wrapTextPhone(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
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