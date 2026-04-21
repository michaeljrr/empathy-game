import { Player } from '../entities/Player';
import { Patient } from '../entities/Patient';
import { SFX, BGM, playOnce, playClipped, startLoop, stopLoop, fadeOutLoop } from '../core/audio';
import { isInteractKey, isMoveLeftKey, isMoveRightKey } from '../core/settings';
import wardEmptyBg from '../assets/images/hospital/hospitalbg.png';
import patientA_in_bed from '../assets/images/hospital/patientA_in_bed.png';
import patientB_in_bed from '../assets/images/hospital/patientB_in_bed.png';
import patientC_in_bed from '../assets/images/hospital/patientC_in_bed.png';
import bed from '../assets/images/hospital/bed.png';
import pagerImg from '../assets/images/ui/pager.png';
import phoneImg from '../assets/images/items/phone.png';
import lyliaNeutral from '../assets/images/characters/lylia/lylia_neutral.png';
import nurseHappy from '../assets/images/characters/nurse/nurse_happy.png';
import yingYingSprite from '../assets/images/characters/yingying/Ying ying.png';

type SceneType = 'entry' | 'nameInput' | 'intro' | 'hospital' | 'dialogue' | 'day1Ending' | 'day2Ending' | 'day3Ending' | 'day4Ending' | 'day5Ending' | 'day6Ending';

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
  private pagerWasHovered: boolean = false;
  private phoneWasHovered: boolean = false;
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
  
  // Phone dialogue scripts (configurable for different days)
  private PHONE_DIALOGUES = [
    { speaker: 'Lylia', text: 'eh you done yet? would you like to go home together', accentColor: '#B5748A', sprite: 'lylia' },
    { speaker: 'player', text: 'sure', accentColor: '#5AC57A', sprite: 'lylia' }
  ];
  
  // Target ending scene after phone dialogue completes
  private phoneTargetScene: SceneType = 'day1Ending';
  
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
    dialogueBoxBottomMargin: 0, // Space from bottom of content area
    dialogueBoxHeight: 140,
    dialogueBoxPadding: 18,
    
    // Sprite position within content area
    spritePadding: 60,
    spriteMaxHeight: 540, // Max height for character sprite
  };
  
  // ── Day indicator (top-right) ─────────────────────────────────────────────
  private readonly DAY_INDICATOR = {
    rightOffset: 30,
    y: 30,
    width: 160,
    height: 50,
    backdropRadius: 12,
  };

  // ── Pager UI Configuration (adjust these for size/position) ────────────────
  private readonly PAGER_CONFIG = {
    x: 30,           // X position from left edge
    y: 30,           // Y position from top edge (back to original — day indicator moved to top-right)
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
    
    // The "nurse" sprite slot on the phone popup is used for Ying Ying's
    // colleague texts (Day 5 + Day 6 intro). If her dedicated asset ever
    // fails to load, the fall-back generic nurse sprite (nurseHappy) will
    // still be swapped in via the naturalWidth check below.
    this.nurseSprite     = new Image();
    this.nurseSprite.src = yingYingSprite;
    this.nurseSprite.onerror = () => { this.nurseSprite.src = nurseHappy; };

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

    // Enable/disable interaction zones based on whether beds have patients
    this.ZONES[0].enabled = !!bedA?.characterId;
    this.ZONES[1].enabled = !!bedB?.characterId;
    this.ZONES[2].enabled = !!bedC?.characterId;
    this.ZONES[3].enabled = !!bedD?.characterId;

    // Reset bed A visibility whenever beds are reconfigured
    this.bedAVisible = !!bedA?.characterId;
  }

  // ── Set current day (triggers day-specific mechanics) ────────────────────
  public setCurrentDay(day: number): void {
    this.currentDay = day;
    this.postOpReturnTriggered = false;
    this.postOpReturnState = 'none';
    this.postOpFadeAlpha = 0;
    this.bellTimer = 0;
    // Bell activates on Day 3 immediately; on Day 4 the bell starts AFTER
    // the forced Bed A pre-op interaction unlocks Bed D (handled in completeBed).
    this.bellActive = (day === 3);
    // Day 4: Bed D is locked until Bed A (Uncle Lim pre-op) is visited first
    if (day === 4) {
      this.ZONES[3].enabled = false;
      // Day 4 opens with MC being forced over to Bed A for the interrupted pre-op
      this.forcedBedAActive = true;
      this.forcedBedASettleFrames = 0;
    }
    // Day 3 opens with the pager beeping (from startDay) followed immediately
    // by Karen's call bell ringing — she's already pressing
    if (day === 3) {
      window.setTimeout(() => playOnce(SFX.BELL, 0.55), 2000);
    }
  }

  public setPhoneDialogue(
    dialogues: Array<{ speaker: string; text: string; accentColor: string; sprite: string }>,
    targetScene: SceneType = 'day1Ending'
  ): void {
    this.PHONE_DIALOGUES = dialogues;
    this.phoneTargetScene = targetScene;
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

    // Dev-only silent skip: `\` fast-forwards through popups/completion sequences.
    if (e.key === '\\') {
      if (this.phonePopupActive) {
        // Close popup and jump straight to its target scene
        const target = this.phoneTargetScene;
        this.closePhonePopup();
        window.dispatchEvent(new CustomEvent('sceneChange', { detail: { scene: target } }));
        return;
      }
      if (this.completionSequenceActive) {
        this.completionSequenceActive = false;
        this.completionTextDisplayed = false;
        this.setPhoneNotifications(1);
        return;
      }
      // On the ward itself — nothing to skip; fall through silently.
      return;
    }

    // Handle phone popup dialogue
    if (this.phonePopupActive) {
      if (isInteractKey(e)) {
        playClipped(SFX.CHOICE, 1000, 0.35);
        this.advancePhoneDialogue();
        return;
      }
    }

    // Handle completion sequence text box
    if (this.completionSequenceActive && this.completionTextDisplayed) {
      if (isInteractKey(e)) {
        playClipped(SFX.CHOICE, 1000, 0.35);
        console.log('[HospitalScene] Dismissing completion text box');
        this.completionSequenceActive = false;
        this.completionTextDisplayed = false;
        // Add phone notification
        this.setPhoneNotifications(1);
        return;
      }
    }

    this.keys[e.key] = true;
    if (isInteractKey(e)) {
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
        playClipped(SFX.CHOICE, 1000, 0.5); // Confirm blip on bed selection (clipped to 1 s)
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
  // (mutable so setBedDay can enable/disable per day)
  private ZONES = [
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: 0, promptOy: -100, enabled: true  },  // Bed A
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -10, promptOy: -100, enabled: true  },  // Bed B
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -60, promptOy: -100, enabled: true  },  // Bed C
    { hw: 150, hh: 1000, ox: 0, oy: 0, promptOx: -80, promptOy: -100, enabled: false },  // Bed D
  ];

  // ── Day 3: Post-op return + bell timer mechanics ─────────────────────────
  private currentDay: number = 1;
  private postOpReturnTriggered: boolean = false;
  // Kept for the no-op branches left in startDay/activate so nothing downstream
  // breaks; the post-op return itself no longer animates through states.
  private postOpReturnState: 'none' = 'none';
  private postOpFadeAlpha: number = 0;

  // Bell timer — Bed D pager escalates while unvisited (Day 3 only)
  private bellActive: boolean = false;
  private bellTimer: number = 0;
  private readonly BELL_INTERVAL_MS: number = 30000;
  // How many bell-driven notifications have piled up on the pager. When Bed D
  // is finally visited, this amount is subtracted from the pager (on top of
  // the normal −1 for completing that bed), matching the narrative that the
  // "ignored calls" are all resolved by the one visit.
  private bellNotificationsAdded: number = 0;

  // Per-day bed sprite visibility (Day 3 only: Uncle Lim's bed fades out after pre-op)
  private bedAVisible: boolean = true;
  private bedAFadeAlpha: number = 1.0;
  private bedAFading: boolean = false;
  private readonly BED_A_FADE_SPEED: number = 0.015; // fade over ~1s at 60fps

  // Day 4 forced interaction: MC is auto-walked to Bed A at day start, then
  // the interrupted pre-op dialogue is triggered automatically.
  private forcedBedAActive: boolean = false;
  private forcedBedASettleFrames: number = 0;
  private readonly FORCED_MOVE_SPEED: number = 3;
  private readonly BED_A_TARGET_X: number = 325;
  private readonly BED_A_TARGET_Y: number = 680;

  // When set, Game.ts will redirect the next sceneChange to this scene
  // instead of returning to hospital. Consumed by takePendingSceneOverride().
  private pendingSceneOverride: SceneType | null = null;

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
    // Safety: the post-op dispatch leaves the overlay fully black when it
    // hands off to the dialogue scene. Clear it on re-entry so the ward
    // doesn't come back under a black veil.
    if (this.postOpReturnState === 'none' && this.postOpFadeAlpha > 0) {
      this.postOpFadeAlpha = 0;
    }
    // Hospital ambience — plays whenever the player is on the ward, pauses
    // while they're in a dialogue (because deactivate fades it out below).
    startLoop(SFX.HOSPITAL_AMBIENT, 0.28);
  }

  // ── Initialize pager for a new day ───────────────────────────────────────
  public startDay(patientCount: number): void {
    this.pagerNotifications = patientCount;
    this.completedBeds = new Set();
    this.postOpReturnTriggered = false;
    this.postOpReturnState = 'none';
    this.postOpFadeAlpha = 0;
    this.bellTimer = 0;
    this.bellNotificationsAdded = 0;
    this.bedAVisible = true;
    this.bedAFadeAlpha = 1.0;
    this.bedAFading = false;
    this.forcedBedAActive = false;
    this.forcedBedASettleFrames = 0;
    // Pager beeps for 2s when the day's notifications arrive
    if (patientCount > 0) {
      playClipped(SFX.PAGER_BEEP, 2000, 0.45);
    }
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

    // Phone icon click (with notifications) → open popup
    if (this.isMouseOverPhone() && this.phoneNotifications > 0) {
      playOnce(SFX.ITEM, 0.45);
      this.openPhonePopup();
      return;
    }

    // Plain pager/phone clicks (no popup to open) still get a UI blip
    if (this.isMouseOverPager() || this.isMouseOverPhone()) {
      playOnce(SFX.ITEM, 0.45);
    }
  }

  // ── Open phone popup ──────────────────────────────────────────────────────
  private openPhonePopup(): void {
    console.log('[HospitalScene] Opening phone popup');
    this.phonePopupActive = true;
    this.phonePopupY = this.height; // Start off-screen at bottom
    this.phonePopupTargetY = this.height - this.PHONE_POPUP_HEIGHT; // Target position
    this.phoneDialogueStep = 0;
    playClipped(SFX.PHONE_MSG, 1000, 0.45);
    // Day 3's phone beat with Lylia is scripted as [BGM: sad TUNE]
    if (this.currentDay === 3) {
      startLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 0.28);
    }
    // Day 5's phone beat (Ying Ying asking about Lylia) leans on the
    // ward ambience — the hospital ambient loop is already running through
    // HospitalScene, so no extra track is added here.
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
        // Message send/receive blip as each new message appears
        playClipped(SFX.PHONE_MSG, 1000, 0.45);
        // Show next dialogue
        this.startPhoneTypewriter(this.PHONE_DIALOGUES[this.phoneDialogueStep].text);
      } else {
        // Phone dialogue complete - transition to ending scene
        this.closePhonePopup();
        console.log(`[HospitalScene] Phone dialogue complete, transitioning to ${this.phoneTargetScene}`);
        window.dispatchEvent(new CustomEvent('sceneChange', {
          detail: { scene: this.phoneTargetScene }
        }));
      }
    }
  }

  // ── Close phone popup ─────────────────────────────────────────────────────
  private closePhonePopup(): void {
    console.log('[HospitalScene] Closing phone popup');
    this.phonePopupActive = false;
    this.phoneNotifications = 0; // Clear notification badge
    // Fade any phone-scene BGM (noop if not running)
    fadeOutLoop(BGM.EMOTIONAL_CONTEMPLATIVE, 900);
  }

  // Game.ts calls this right after completeBed to see if the next scene
  // transition should be redirected (e.g. Day 6 Bed A → day6Ending).
  public takePendingSceneOverride(): SceneType | null {
    const s = this.pendingSceneOverride;
    this.pendingSceneOverride = null;
    return s;
  }

  // ── Mark a bed as completed ──────────────────────────────────────────────
  public completeBed(bedLocation: string): void {
    if (!this.completedBeds.has(bedLocation)) {
      this.completedBeds.add(bedLocation);
      this.pagerNotifications = Math.max(0, this.pagerNotifications - 1);

      // Day 6: Bed A is the one-and-only interaction — redirect directly to day6Ending
      if (this.currentDay === 6 && bedLocation === 'Bed 1') {
        console.log('[HospitalScene] Day 6 Bed A done - redirecting to day6Ending');
        this.pendingSceneOverride = 'day6Ending';
        return;
      }

      // Days 3 & 4: stop the bell timer once Bed D (Karen) is visited, and
      // clear the pile of bell-added notifications from the pager.
      if ((this.currentDay === 3 || this.currentDay === 4) && bedLocation === 'Bed 4') {
        this.bellActive = false;
        if (this.bellNotificationsAdded > 0) {
          this.pagerNotifications = Math.max(0, this.pagerNotifications - this.bellNotificationsAdded);
          console.log('[HospitalScene] Bed D visited — cleared', this.bellNotificationsAdded,
                      'bell-added notifications; pager →', this.pagerNotifications);
          this.bellNotificationsAdded = 0;
        }
      }

      // Day 4: unlock Bed D once Bed A pre-op interaction has happened, and
      // kick off the same bell-escalation mechanic Day 3 uses.
      if (this.currentDay === 4 && bedLocation === 'Bed 1' && !this.postOpReturnTriggered) {
        this.ZONES[3].enabled = true;
        this.bellActive = true;
        this.bellTimer = 0;
      }

      // Day 3 only: after Uncle Lim's pre-op, fade his bed sprite + shadow
      // out of the ward (he's been taken to surgery). Day 4's interrupted
      // pre-op leaves him in the bed.
      if (this.currentDay === 3 && bedLocation === 'Bed 1' && !this.postOpReturnTriggered) {
        this.bedAFading = true;
      }

      // Day 3 & 4: first time pager hits 0 → trigger post-op return instead of completion
      if (this.pagerNotifications === 0 && (this.currentDay === 3 || this.currentDay === 4) && !this.postOpReturnTriggered) {
        this.postOpReturnTriggered = true;
        this.startPostOpReturn();
        return;
      }

      // Day 3 & 4: post-op check complete → skip empty-bed sequence, go straight to phone
      if (this.pagerNotifications === 0 && (this.currentDay === 3 || this.currentDay === 4)
          && this.postOpReturnTriggered && bedLocation === 'Bed 1') {
        console.log('[HospitalScene] Day ' + this.currentDay + ' post-op complete - triggering phone notification');
        this.setPhoneNotifications(1);
        return;
      }

      // Check if all patients have been seen.
      // Day 1 plays the "walk to Bed D + empty-bed text" sequence; every other
      // day skips straight to the phone notification (on Days 2+ Bed D isn't
      // narratively empty, so the walk and line don't apply).
      if (this.pagerNotifications === 0 && !this.completionSequenceActive) {
        if (this.currentDay === 1) {
          console.log('[HospitalScene] Day 1 complete - starting Bed D walk sequence');
          this.startCompletionSequence();
        } else {
          console.log('[HospitalScene] Day ' + this.currentDay + ' complete - triggering phone notification directly');
          this.setPhoneNotifications(1);
        }
      }
    }
  }

  // ── Day 3/4: post-op return ──────────────────────────────────────────────
  // No fade — the swap happens instantly once all pre-op beds are cleared.
  // Bed A simply re-appears in the ward with a fresh pager notification.
  private startPostOpReturn(): void {
    console.log('[HospitalScene] Day ' + this.currentDay + ' post-op return — re-adding Bed A');
    this.completedBeds.delete('Bed 1');
    this.bedCharacterMap['Bed 1'] = this.currentDay === 4
      ? 'day4patientA_postop'
      : 'day3patientA_postop';
    this.ZONES[0].enabled = true;
    this.bedAVisible = true;
    this.bedAFadeAlpha = 1.0;
    this.bedAFading = false;
    this.setPhoneNotifications(0); // keep phone silent until the post-op dialogue wraps
    this.pagerNotifications += 1;
    playClipped(SFX.PAGER_BEEP, 1500, 0.45); // notification beep for the new pager
    // Ensure any leftover state-machine fields are inert
    this.postOpReturnState = 'none';
    this.postOpFadeAlpha = 0;
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
    // Stop looping SFX so it doesn't bleed into dialogue/ending scenes.
    // Footsteps stops instantly (already near silent anyway); hospital
    // ambience fades gracefully so the transition into dialogue isn't abrupt.
    stopLoop(SFX.FOOTSTEPS);
    fadeOutLoop(SFX.HOSPITAL_AMBIENT, 700);
  }

  // cleanup kept for compatibility — deactivate is the main mechanism now
  public cleanup(): void {
    this.deactivate();
  }

  public resume(): void {
    this.activate();
  }

  public update(delta: number = 16.67): void {
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

    // ── Day 3 & 4: Bell timer — Bed D pager escalates while unvisited ─────
    if (this.bellActive && (this.currentDay === 3 || this.currentDay === 4) && !this.phonePopupActive
        && !this.completionSequenceActive && this.postOpReturnState === 'none') {
      this.bellTimer += delta;
      if (this.bellTimer >= this.BELL_INTERVAL_MS) {
        this.bellTimer = 0;
        this.pagerNotifications += 1;
        this.bellNotificationsAdded += 1;
        playOnce(SFX.BELL, 0.5);
        console.log('[HospitalScene] Bell: Bed D pager incremented →', this.pagerNotifications,
                    '(bell-added so far:', this.bellNotificationsAdded + ')');
      }
    }

    // ── Bed A fade-out (Day 3/4: Uncle Lim leaves for surgery) ─────────────
    if (this.bedAFading && this.bedAFadeAlpha > 0) {
      this.bedAFadeAlpha = Math.max(0, this.bedAFadeAlpha - this.BED_A_FADE_SPEED);
      if (this.bedAFadeAlpha <= 0) {
        this.bedAFading = false;
        this.bedAVisible = false;
      }
    }

    // Post-op return is now instantaneous (no fade) — no per-frame work here.

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

    // Day 4: forced auto-walk to Bed A → auto-dispatch the interrupted pre-op
    // dialogue. Same mechanic as Day 1's end-of-day auto-walk to Bed D,
    // applied at day start.
    if (this.forcedBedAActive) {
      const dx = this.BED_A_TARGET_X - this.player.x;
      const dy = this.BED_A_TARGET_Y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 20) {
        const moveX = (dx / distance) * this.FORCED_MOVE_SPEED;
        const moveY = (dy / distance) * this.FORCED_MOVE_SPEED;
        this.player.move(moveX, moveY, this.width, this.height, this.movementBounds);
        this.forcedBedASettleFrames = 0;
        startLoop(SFX.FOOTSTEPS, 0.35);
        this.player.update();
      } else {
        // Reached — snap, settle briefly, then auto-trigger the dialogue
        if (this.forcedBedASettleFrames === 0) {
          this.player.x = this.BED_A_TARGET_X;
          this.player.y = this.BED_A_TARGET_Y;
          this.player.move(0, 0, this.width, this.height, this.movementBounds);
          this.player.update();
          stopLoop(SFX.FOOTSTEPS);
        }
        this.forcedBedASettleFrames++;
        if (this.forcedBedASettleFrames > 8) {
          const characterId = this.bedCharacterMap['Bed 1'];
          if (characterId) {
            this.isTransitioning = true;
            window.dispatchEvent(new CustomEvent('sceneChange', {
              detail: { scene: 'dialogue', characterId, bedLocation: 'Bed 1' }
            }));
          }
          this.forcedBedAActive = false;
        }
      }
      return; // block other updates during forced walk
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

    // Horizontal movement only (left-right) — uses the player's keybinds
    const heldKeys = Object.keys(this.keys).filter(k => this.keys[k]);
    if (heldKeys.some(isMoveLeftKey))  dx = -speed;
    if (heldKeys.some(isMoveRightKey)) dx =  speed;
    // Vertical movement disabled - only left/right allowed

    // Footsteps loop while the player is actively moving horizontally
    if (dx !== 0) {
      startLoop(SFX.FOOTSTEPS, 0.35);
    } else {
      stopLoop(SFX.FOOTSTEPS);
    }

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
    if (this.patientALoaded && this.bedAVisible && this.bedAFadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.bedAFadeAlpha;
      ctx.drawImage(this.patientAElement, 0, 100, 650, 812);
      ctx.restore();
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
    // Days 3 & 4: pulsing bell above Bed D while Karen is still pressing the call button
    if (this.bellActive && (this.currentDay === 3 || this.currentDay === 4)) {
      this.drawBedDBell();
    }
    this.player.render(ctx);
    this.drawDayIndicator();
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

    // Bed A shadow fades in step with the Bed A sprite (Day 3/4 post-op hand-off)
    const alphaA = 0.2 * (this.bedAVisible ? this.bedAFadeAlpha : 0);
    if (alphaA > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alphaA})`;
      ctx.beginPath();
      ctx.ellipse(300, 800, 130, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

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

  // Pulsing bell icon drawn above Bed D while Karen's call bell is
  // unanswered (Day 3 mechanic). Pure canvas shapes — no asset required.
  private drawBedDBell(): void {
    const ctx = this.ctx;
    const t = performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(t / 300);   // 0..1
    const scale = 1 + pulse * 0.18;                 // 1.00..1.18

    // Position: slightly left of the bed centre (user-tuned)
    const cx = 1221;
    const cy = 420;

    ctx.save();

    // Expanding ripple rings — three concentric circles at staggered phases
    // that grow outward and fade as they go, simulating the bell "ringing".
    const ringCount = 3;
    const maxRadius = 72;
    for (let i = 0; i < ringCount; i++) {
      const phase = ((t / 900) + i / ringCount) % 1; // 0..1, offset per ring
      const r = 16 + phase * (maxRadius - 16);
      const alpha = (1 - phase) * 0.7;
      ctx.strokeStyle = `rgba(255, 220, 120, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Soft glow halo
    const glowR = 42 + pulse * 10;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, `rgba(255, 220, 120, ${0.45 + 0.35 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Bell body — draw around (cx, cy), transformed for pulse scaling
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Dome
    ctx.fillStyle = '#f4c447';
    ctx.strokeStyle = '#8a5a00';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(-14, -4);
    ctx.quadraticCurveTo(-14, -20, 0, -22);
    ctx.quadraticCurveTo(14, -20, 14, -4);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rim
    ctx.fillStyle = '#d9a028';
    ctx.fillRect(-20, 10, 40, 4);
    ctx.strokeRect(-20, 10, 40, 4);

    // Handle
    ctx.fillStyle = '#8a5a00';
    ctx.fillRect(-2.5, -28, 5, 8);

    // Clapper
    ctx.fillStyle = '#8a5a00';
    ctx.beginPath();
    ctx.arc(0, 16, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

    // Check for hover and draw tooltip (+ play item sfx on hover-enter)
    const pagerHovered = this.isMouseOverPager();
    if (pagerHovered && !this.pagerWasHovered) {
      playOnce(SFX.ITEM, 0.35);
    }
    this.pagerWasHovered = pagerHovered;
    if (pagerHovered) {
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

    // Check for hover and draw tooltip (+ play item sfx on hover-enter)
    const phoneHovered = this.isMouseOverPhone();
    if (phoneHovered && !this.phoneWasHovered) {
      playOnce(SFX.ITEM, 0.35);
    }
    this.phoneWasHovered = phoneHovered;
    if (phoneHovered) {
      this.drawPhoneTooltip(backdropRight + 10, backdropTop + backdropHeight / 2);
    }

    // Day 1 only: persistent "Click to open the message" hint next to the
    // phone icon so the player notices the first-ever phone notification.
    // Shown only while the popup isn't already open.
    if (this.currentDay === 1 && this.phoneNotifications > 0 && !this.phonePopupActive) {
      this.drawDay1PhoneHint(backdropRight, cfg.y, cfg.height);
    }
  }

  // Pulsing floating hint card — only appears on Day 1 to call out the
  // phone notification for the very first time.
  private drawDay1PhoneHint(phoneRight: number, phoneY: number, phoneH: number): void {
    const ctx = this.ctx;
    const pulse = 0.7 + Math.abs(Math.sin(performance.now() / 500)) * 0.3;
    const text = 'Click to open the message';

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    const padX = 14;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 38;
    const boxX = phoneRight + 18;
    const boxY = phoneY + (phoneH - boxH) / 2;

    ctx.save();
    ctx.globalAlpha = pulse;

    // Panel
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, boxX - 3, boxY - 3, boxW + 6, boxH + 6, 10);
    ctx.fill();
    ctx.fillStyle = '#34495e';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, boxX + 1, boxY + 1, boxW - 2, boxH - 2, 7);
    ctx.stroke();

    // Small pointer triangle on the left edge, aiming at the phone
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH / 2);
    ctx.lineTo(boxX - 10, boxY + boxH / 2 - 7);
    ctx.lineTo(boxX - 10, boxY + boxH / 2 + 7);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);

    ctx.restore();
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
    const prev = this.phoneNotifications;
    this.phoneNotifications = Math.max(0, count);
    // Play the notif ping when transitioning from 0 → non-zero
    if (prev === 0 && this.phoneNotifications > 0) {
      playOnce(SFX.PHONE_PING, 0.55);
    }
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

    // Green screen backdrop — top corners rounded, extends all the way to the
    // bottom of the canvas with a flat bottom edge.
    ctx.fillStyle = cfg.screenColor;
    ctx.beginPath();
    (ctx as any).roundRect(
      screenX,
      screenY,
      screenWidth,
      this.height - screenY,
      [8, 8, 0, 0] // [top-left, top-right, bottom-right, bottom-left]
    );
    ctx.fill();
    
    // Get current dialogue
    const currentDialogue = this.PHONE_DIALOGUES[this.phoneDialogueStep];
    
    // Draw character sprite based on current dialogue's `sprite` field
    // Supported: 'lylia' (default), 'nurse' (for new colleagues like Ying Ying), 'none'
    let phoneSprite: HTMLImageElement | null = null;
    const spriteKey = currentDialogue.sprite;
    if (spriteKey === 'nurse' && this.nurseSprite.complete && this.nurseSprite.naturalWidth > 0) {
      phoneSprite = this.nurseSprite;
    } else if (spriteKey !== 'none' && this.lyliaSpriteLoaded) {
      phoneSprite = this.lyliaSprite;
    }

    if (phoneSprite) {
      const img = phoneSprite;
      const spriteNaturalW = img.naturalWidth;
      const spriteNaturalH = img.naturalHeight;

      const scale = Math.min(
        (screenWidth - cfg.spritePadding * 2) / spriteNaturalW,
        cfg.spriteMaxHeight / spriteNaturalH,
        1
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

  // Day indicator — top-right, same card styling as pager/phone
  private drawDayIndicator(): void {
    const ctx = this.ctx;
    const cfg = this.DAY_INDICATOR;
    const x = this.width - cfg.width - cfg.rightOffset;
    const y = cfg.y;

    // Outer border
    ctx.fillStyle = '#2c3e50';
    this.roundRect(ctx, x - 3, y - 3, cfg.width + 6, cfg.height + 6, cfg.backdropRadius + 2);
    ctx.fill();

    // Inner background
    ctx.fillStyle = '#34495e';
    this.roundRect(ctx, x, y, cfg.width, cfg.height, cfg.backdropRadius);
    ctx.fill();

    // Highlight border
    ctx.strokeStyle = '#5a6d7f';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x + 2, y + 2, cfg.width - 4, cfg.height - 4, cfg.backdropRadius - 1);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Day ' + this.currentDay, x + cfg.width / 2, y + cfg.height / 2);
  }

  private drawUI(): void {
    const ctx = this.ctx;

    // Controls tooltip — bottom-right. Sized to the widest line so it doesn't
    // leave extra empty space.
    const lines = ['A/D or ← →: Move', 'E: Interact', 'ESC: Menu'];
    const font = '14px Arial';
    ctx.font = font;

    const padX = 14;
    const padY = 10;
    const lineH = 20;
    let maxW = 0;
    for (const l of lines) {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    }

    const boxW = maxW + padX * 2;
    const boxH = lineH * lines.length + padY * 2;
    const boxX = this.width - boxW - 10;
    const boxY = this.height - boxH - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + boxW - padX, boxY + padY + lineH / 2 + i * lineH);
    }
  }
}