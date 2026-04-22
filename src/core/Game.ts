import { EntryScene }     from '../scenes/EntryScene';
import { SettingsScene }  from '../scenes/SettingsScene';
import { NameInputScene } from '../scenes/NameInputScene';
import { IntroScene }     from '../scenes/IntroScene';
import { HospitalScene }  from '../scenes/HospitalScene';
import { DialogueScene }  from '../scenes/DialogueScene';
import { Day1EndingScene } from '../scenes/Day1EndingScene';
import { Day2EndingScene } from '../scenes/Day2EndingScene';
import { Day3EndingScene } from '../scenes/Day3EndingScene';
import { Day4EndingScene } from '../scenes/Day4EndingScene';
import { Day5EndingScene } from '../scenes/Day5EndingScene';
import { Day6EndingScene } from '../scenes/Day6EndingScene';
import { PauseMenu }       from '../scenes/PauseMenu';
import patientA_in_bed from '../assets/images/hospital/patientA_in_bed.png';
import patientC_in_bed from '../assets/images/hospital/patientC_in_bed.png';
import karen_in_bed from '../assets/images/hospital/day3_bed4.png';
// Mr Soo agitated portrait is used as his hospital bed image per spec
import mrsoo_in_bed from '../assets/images/characters/mr soo/Mr Soo agitated.png';
import bed from '../assets/images/hospital/bed.png';

type SceneType = 'entry' | 'settings' | 'nameInput' | 'intro' | 'hospital' | 'dialogue' | 'day1Ending' | 'day2Ending' | 'day3Ending' | 'day4Ending' | 'day5Ending' | 'day6Ending';

type FadeState = 'none' | 'out' | 'in';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;
  private currentScene: SceneType = 'entry';
  private scenes: {
    entry:     EntryScene;
    settings:  SettingsScene;
    nameInput: NameInputScene;
    intro:     IntroScene;
    hospital:  HospitalScene;
    dialogue:  DialogueScene;
    day1Ending: Day1EndingScene;
    day2Ending: Day2EndingScene;
    day3Ending: Day3EndingScene;
    day4Ending: Day4EndingScene;
    day5Ending: Day5EndingScene;
    day6Ending: Day6EndingScene;
  };

  private lastTimestamp: number = 0;

  // ── Fade transition ───────────────────────────────────────
  private fadeAlpha:   number    = 0;
  private fadeState:   FadeState = 'none';
  private pendingScene: { scene: SceneType; characterId?: string; bedLocation?: string } | null = null;
  private readonly FADE_SPEED = 0.05; // alpha change per frame (~20 frames = 333ms at 60fps)

  // ── Pause ─────────────────────────────────────────────────
  private isPaused: boolean = false;
  private pauseMenu!: PauseMenu;
  // Scenes where the ESC pause menu is allowed (keeps it off the entry/name/intro flow)
  private readonly PAUSABLE: Set<SceneType> = new Set<SceneType>([
    'hospital', 'dialogue', 'day1Ending', 'day2Ending', 'day3Ending',
    'day4Ending', 'day5Ending', 'day6Ending',
  ]);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d')!;

    this.scenes = {
      entry:     new EntryScene(this.canvas, this.ctx),
      settings:  new SettingsScene(this.canvas, this.ctx),
      nameInput: new NameInputScene(this.canvas, this.ctx),
      intro:     new IntroScene(this.canvas, this.ctx),
      hospital:  new HospitalScene(this.canvas, this.ctx),
      dialogue:  new DialogueScene(this.canvas, this.ctx),
      day2Ending: new Day2EndingScene(this.canvas, this.ctx),
      day1Ending: new Day1EndingScene(this.canvas, this.ctx),
      day3Ending: new Day3EndingScene(this.canvas, this.ctx),
      day4Ending: new Day4EndingScene(this.canvas, this.ctx),
      day5Ending: new Day5EndingScene(this.canvas, this.ctx),
      day6Ending: new Day6EndingScene(this.canvas, this.ctx),
    };

    // Hospital starts inactive — entry scene is first
    this.scenes.hospital.deactivate();

    // Pause menu — singleton overlay that sits above every scene
    this.pauseMenu = new PauseMenu(this.canvas, this.ctx, {
      onResume:  () => { this.isPaused = false; },
      onRestart: () => { window.location.reload(); },
    });

    this.setupSceneChangeListener();
    this.setupPauseListeners();

    // ── DEV: flip this flag to boot straight into Day 6's paper letter view
    // for tuning paper/text visuals without replaying the game. Set false
    // before shipping.
    const DEBUG_START_AT_PAPER = false;
    if (DEBUG_START_AT_PAPER) {
      this.scenes.entry.deactivate();
      this.currentScene = 'day6Ending';
      this.scenes.day6Ending.activate();
      this.scenes.day6Ending.debugSkipToLetter();
    }

    this.startGameLoop();
  }

  // ── Pause: ESC toggles; while paused, capture-phase listeners eat all
  // keyboard + mouse events before the underlying scene can see them.
  private setupPauseListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // If the settings panel is currently rebinding a key, forward the
      // keydown to it and swallow the event so no other listener reacts.
      if (this.isPaused && this.pauseMenu.onGlobalKeyDown(e)) {
        e.stopImmediatePropagation();
        return;
      }
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (!this.PAUSABLE.has(this.currentScene)) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) this.pauseMenu.open();
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      if (this.isPaused) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);

    const toCanvasXY = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = ((this.canvas as any).logicalWidth  || this.canvas.width)  / rect.width;
      const sy = ((this.canvas as any).logicalHeight || this.canvas.height) / rect.height;
      return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    };

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPaused) return;
      const { x, y } = toCanvasXY(e);
      this.pauseMenu.onMouseMove(x, y);
      e.stopImmediatePropagation();
    }, true);

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isPaused) return;
      const { x, y } = toCanvasXY(e);
      this.pauseMenu.onMouseMove(x, y);
      this.pauseMenu.onClick();
      e.stopImmediatePropagation();
    }, true);

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      if (!this.isPaused) return;
      this.pauseMenu.onMouseUp();
      e.stopImmediatePropagation();
    }, true);

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.isPaused) return;
      // Clicks are already handled on mousedown above; keep swallowing here
      // so scene-level click handlers never see them while paused.
      e.stopImmediatePropagation();
    }, true);
  }

  private setupSceneChangeListener(): void {
    window.addEventListener('sceneChange', ((e: CustomEvent) => {
      const { scene, characterId, bedLocation, startDay, dayPatientCount, day } = e.detail as {
        scene: SceneType;
        characterId?: string;
        bedLocation?: string;
        startDay?: boolean;
        dayPatientCount?: number;
        day?: number;
      };

      // Handle bed completion when returning from dialogue
      let overriddenScene: SceneType | null = null;
      if (scene === 'hospital' && bedLocation) {
        this.scenes.hospital.completeBed(bedLocation);
        // Day-specific overrides (e.g. Day 6 Bed A goes straight to day6Ending)
        overriddenScene = this.scenes.hospital.takePendingSceneOverride() as SceneType | null;
      }

      // Handle day initialization and bed configuration
      if (startDay && dayPatientCount !== undefined) {
        this.scenes.hospital.startDay(dayPatientCount);

        // Configure beds based on day (setBedDay enables zones per characterId).
        // setCurrentDay is called AFTER setBedDay so day-specific locks (e.g. Day 4
        // Bed D lock) are applied on top of the zone enables.
        if (day === 2) {
          // Day 2: Uncle Lim at Bed A, empty Bed B (discharged), Sleeping Patient at Bed C
          this.scenes.hospital.setBedDay(
            { image: patientA_in_bed, characterId: 'day2patientA' },
            { image: bed }, // Bed B empty (no characterId)
            { image: patientC_in_bed, characterId: 'day2patientC' },
            { image: bed }
          );
          // Set Day 2 phone dialogue for Lylia dinner invitation
          this.scenes.hospital.setPhoneDialogue([
            { speaker: 'Lylia', text: 'dinner? I\'m kinda craving the chicken rice from that fancy place', accentColor: '#B5748A', sprite: 'lylia' },
            { speaker: 'player', text: 'see you there!', accentColor: '#5AC57A', sprite: 'lylia' }
          ], 'day2Ending');
        } else if (day === 3) {
          // Day 3: Uncle Lim (pre-op) at Bed A, empty Bed B, Sleeping Patient at Bed C, Karen at Bed D
          this.scenes.hospital.setBedDay(
            { image: patientA_in_bed, characterId: 'day3patientA_preop' },
            { image: bed },
            { image: patientC_in_bed, characterId: 'day3patientC' },
            { image: karen_in_bed,    characterId: 'day3patientD' }
          );
          // Day 3 phone dialogue: Lylia's dampened reply after Uncle Lim's transplant
          this.scenes.hospital.setPhoneDialogue([
            { speaker: 'Lylia', text: 'hey, how was your day?', accentColor: '#B5748A', sprite: 'lylia' },
            { speaker: 'player', text: 'great actually! uncle lim\'s transplant was successful :)', accentColor: '#5AC57A', sprite: 'lylia' },
            { speaker: 'Lylia', text: 'oh. that\'s good.', accentColor: '#B5748A', sprite: 'lylia' },
            { speaker: 'player', text: 'going home together later?', accentColor: '#5AC57A', sprite: 'lylia' },
            { speaker: 'Lylia', text: 'not today. you go ahead.', accentColor: '#B5748A', sprite: 'lylia' },
            { speaker: 'player', text: 'okay, rest well!', accentColor: '#5AC57A', sprite: 'lylia' }
          ], 'day3Ending');
        } else if (day === 4) {
          // Day 4: Uncle Lim (interrupted pre-op) at Bed A, empty Bed B, Sleeping Patient at Bed C, Karen at Bed D
          // Same structural mechanics as Day 3 (post-op return), minus the bell timer.
          this.scenes.hospital.setBedDay(
            { image: patientA_in_bed, characterId: 'day4patientA_preop' },
            { image: bed },
            { image: patientC_in_bed, characterId: 'day4patientC' },
            { image: karen_in_bed,    characterId: 'day4patientD' }
          );
          // Day 4 phone dialogue: Lylia summons player to break room
          this.scenes.hospital.setPhoneDialogue([
            { speaker: 'Lylia', text: 'you done? come find me at the break room', accentColor: '#B5748A', sprite: 'lylia' },
            { speaker: 'player', text: 'on my way', accentColor: '#5AC57A', sprite: 'lylia' }
          ], 'day4Ending');
        } else if (day === 5) {
          // Day 5: Uncle Lim (recovery) at Bed A, Mr. Soo at Bed B, NPC at Bed C (no interaction), Karen at Bed D
          // Standard flow — no post-op return, no bell timer. 3 pager notifications.
          this.scenes.hospital.setBedDay(
            { image: patientA_in_bed, characterId: 'day5patientA' },
            { image: mrsoo_in_bed,    characterId: 'day5patientB' },
            { image: patientC_in_bed }, // NPC — visible but no interaction (no characterId)
            { image: karen_in_bed,    characterId: 'day5patientD' }
          );
          // Day 5 phone dialogue: Ying Ying asks about Lylia (sprite: 'nurse' draws colleague sprite)
          this.scenes.hospital.setPhoneDialogue([
            { speaker: 'Ying Ying', text: 'Hey, have you seen Lylia around today?', accentColor: '#7A9B76', sprite: 'nurse' },
            { speaker: 'player', text: 'No. Why?', accentColor: '#5AC57A', sprite: 'nurse' },
            { speaker: 'Ying Ying', text: 'Aiya, I was trying to pass her something. Cannot find her the whole day. Asked around also nobody knows.', accentColor: '#7A9B76', sprite: 'nurse' }
          ], 'day5Ending');
        } else if (day === 6) {
          // Day 6: Bed A is empty (Uncle Lim has passed). Bed B/C/D are visual NPCs only.
          // Interacting with Bed A triggers the empty-bed story → letter (via day6Ending).
          // No phone — day6Ending is dispatched directly from the Bed A dialogue.
          this.scenes.hospital.setBedDay(
            { image: bed, characterId: 'day6patientA' },     // empty bed sprite, narrative interaction
            { image: mrsoo_in_bed },                         // Mr. Soo (NPC) — uses Mr Soo agitated portrait
            { image: patientC_in_bed },                      // sleeping patient (NPC)
            { image: karen_in_bed }                          // Karen (NPC, Bed D)
          );
        }

        // Apply day-specific mechanics last (so locks override auto-enabled zones)
        this.scenes.hospital.setCurrentDay(day ?? 1);
      }

      // Begin fade-out; actual scene switch happens at peak black.
      // If the hospital flagged an override, redirect to that scene instead.
      const targetScene = overriddenScene ?? scene;
      this.pendingScene = { scene: targetScene, characterId, bedLocation };
      this.fadeAlpha    = 0;
      this.fadeState    = 'out';

    }) as EventListener);
  }

  private applySceneSwitch(pending: { scene: SceneType; characterId?: string; bedLocation?: string }): void {
    const { scene, characterId, bedLocation } = pending;

    // Leave current scene
    switch (this.currentScene) {
      case 'entry':     this.scenes.entry.deactivate();     break;
      case 'settings':  this.scenes.settings.deactivate();  break;
      case 'nameInput': this.scenes.nameInput.deactivate(); break;
      case 'intro':     this.scenes.intro.deactivate();     break;
      case 'hospital':  this.scenes.hospital.deactivate();  break;
      case 'dialogue':  this.scenes.dialogue.cleanup();     break;
      case 'day2Ending': this.scenes.day2Ending.deactivate(); break;
      case 'day1Ending': this.scenes.day1Ending.deactivate(); break;
      case 'day3Ending': this.scenes.day3Ending.deactivate(); break;
      case 'day4Ending': this.scenes.day4Ending.deactivate(); break;
      case 'day5Ending': this.scenes.day5Ending.deactivate(); break;
      case 'day6Ending': this.scenes.day6Ending.deactivate(); break;
    }

    this.currentScene = scene;

    // Enter new scene
    switch (scene) {
      case 'entry':
        this.scenes.entry.activate();
        break;
      case 'settings':
        this.scenes.settings.activate();
        break;
      case 'nameInput':
        this.scenes.nameInput.activate();
        break;
      case 'intro':
        this.scenes.intro.activate();
        break;
      case 'hospital':
        this.scenes.hospital.activate();
        break;
      case 'dialogue':
        if (!characterId) { console.error('Game: missing characterId for dialogue scene'); return; }
        this.scenes.dialogue.init(characterId, bedLocation);
        break;
      case 'day1Ending':
        this.scenes.day1Ending.activate();
        break;
      case 'day2Ending':
        this.scenes.day2Ending.activate();
        break;
      case 'day3Ending':
        this.scenes.day3Ending.activate();
        break;
      case 'day4Ending':
        this.scenes.day4Ending.activate();
        break;
      case 'day5Ending':
        this.scenes.day5Ending.activate();
        break;
      case 'day6Ending':
        this.scenes.day6Ending.activate();
        break;
    }
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      const delta = this.lastTimestamp === 0 ? 16.67 : timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      this.update(delta);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(delta: number): void {
    // While paused the whole game freezes — fades and scene updates both wait.
    if (this.isPaused) return;

    // Tick fade
    if (this.fadeState === 'out') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + this.FADE_SPEED);
      if (this.fadeAlpha >= 1 && this.pendingScene) {
        this.applySceneSwitch(this.pendingScene);
        this.pendingScene = null;
        this.fadeState    = 'in';
      }
    } else if (this.fadeState === 'in') {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - this.FADE_SPEED);
      if (this.fadeAlpha <= 0) this.fadeState = 'none';
    }

    switch (this.currentScene) {
      case 'entry':     this.scenes.entry.update();          break;
      case 'settings':  this.scenes.settings.update(delta);  break;
      case 'nameInput': this.scenes.nameInput.update(delta); break;
      case 'intro':     this.scenes.intro.update(delta);     break;
      case 'hospital':  this.scenes.hospital.update(delta);  break;
      case 'dialogue':  this.scenes.dialogue.update(delta);  break;
      case 'day1Ending': this.scenes.day1Ending.update(delta); break;
      case 'day2Ending': this.scenes.day2Ending.update(delta); break;
      case 'day3Ending': this.scenes.day3Ending.update(delta); break;
      case 'day4Ending': this.scenes.day4Ending.update(delta); break;
      case 'day5Ending': this.scenes.day5Ending.update(delta); break;
      case 'day6Ending': this.scenes.day6Ending.update(delta); break;
    }
  }

  private render(): void {
    const width  = (this.canvas as any).logicalWidth  || this.canvas.width;
    const height = (this.canvas as any).logicalHeight || this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    switch (this.currentScene) {
      case 'entry':     this.scenes.entry.render();     break;
      case 'settings':  this.scenes.settings.render();  break;
      case 'nameInput': this.scenes.nameInput.render(); break;
      case 'day2Ending': this.scenes.day2Ending.render(); break;
      case 'intro':     this.scenes.intro.render();     break;
      case 'hospital':  this.scenes.hospital.render();  break;
      case 'dialogue':  this.scenes.dialogue.render();  break;
      case 'day1Ending': this.scenes.day1Ending.render(); break;
      case 'day3Ending': this.scenes.day3Ending.render(); break;
      case 'day4Ending': this.scenes.day4Ending.render(); break;
      case 'day5Ending': this.scenes.day5Ending.render(); break;
      case 'day6Ending': this.scenes.day6Ending.render(); break;
    }

    // Draw fade overlay on top of everything
    if (this.fadeState !== 'none' && this.fadeAlpha > 0) {
      this.ctx.globalAlpha = this.fadeAlpha;
      this.ctx.fillStyle   = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.globalAlpha = 1;
    }

    // Pause menu sits above everything (including the fade overlay)
    if (this.isPaused) {
      this.pauseMenu.render();
    }
  }

  public setHospitalDay(
    bedA?: { image?: string; characterId?: string },
    bedB?: { image?: string; characterId?: string },
    bedC?: { image?: string; characterId?: string },
    bedD?: { image?: string; characterId?: string },
    bedE?: { image?: string; characterId?: string }
  ): void {
    this.scenes.hospital.setBedDay(
      bedA ?? { image: '../assets/images/hospital/patientA_in_bed.png', characterId: 'day1patientA' },
      bedB ?? { image: '../assets/images/hospital/patientB_in_bed.png', characterId: 'day1patientB' },
      bedC ?? { image: '../assets/images/hospital/patientC_in_bed.png', characterId: 'day1patientC' },
      bedD ?? { image: '../assets/images/hospital/bed.png' },
      bedE
    );
  }
}