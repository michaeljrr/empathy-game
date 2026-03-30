import { EntryScene }     from '../scenes/EntryScene';
import { NameInputScene } from '../scenes/NameInputScene';
import { IntroScene }     from '../scenes/IntroScene';
import { HospitalScene }  from '../scenes/HospitalScene';
import { DialogueScene }  from '../scenes/DialogueScene';
import { Day1EndingScene } from '../scenes/Day1EndingScene';

type SceneType = 'entry' | 'nameInput' | 'intro' | 'hospital' | 'dialogue' | 'day1Ending';

type FadeState = 'none' | 'out' | 'in';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;
  private currentScene: SceneType = 'entry';
  private scenes: {
    entry:     EntryScene;
    nameInput: NameInputScene;
    intro:     IntroScene;
    hospital:  HospitalScene;
    dialogue:  DialogueScene;
    day1Ending: Day1EndingScene;
  };

  private lastTimestamp: number = 0;

  // ── Fade transition ───────────────────────────────────────
  private fadeAlpha:   number    = 0;
  private fadeState:   FadeState = 'none';
  private pendingScene: { scene: SceneType; characterId?: string; bedLocation?: string } | null = null;
  private readonly FADE_SPEED = 0.05; // alpha change per frame (~20 frames = 333ms at 60fps)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d')!;

    this.scenes = {
      entry:     new EntryScene(this.canvas, this.ctx),
      nameInput: new NameInputScene(this.canvas, this.ctx),
      intro:     new IntroScene(this.canvas, this.ctx),
      hospital:  new HospitalScene(this.canvas, this.ctx),
      dialogue:  new DialogueScene(this.canvas, this.ctx),
      day1Ending: new Day1EndingScene(this.canvas, this.ctx),
    };

    // Hospital starts inactive — entry scene is first
    this.scenes.hospital.deactivate();

    this.setupSceneChangeListener();
    this.startGameLoop();
  }

  private setupSceneChangeListener(): void {
    window.addEventListener('sceneChange', ((e: CustomEvent) => {
      const { scene, characterId, bedLocation, startDay, dayPatientCount } = e.detail as {
        scene: SceneType;
        characterId?: string;
        bedLocation?: string;
        startDay?: boolean;
        dayPatientCount?: number;
      };

      // Handle bed completion when returning from dialogue
      if (scene === 'hospital' && bedLocation) {
        this.scenes.hospital.completeBed(bedLocation);
      }

      // Handle day initialization
      if (startDay && dayPatientCount !== undefined) {
        this.scenes.hospital.startDay(dayPatientCount);
      }

      // Begin fade-out; actual scene switch happens at peak black
      this.pendingScene = { scene, characterId, bedLocation };
      this.fadeAlpha    = 0;
      this.fadeState    = 'out';

    }) as EventListener);
  }

  private applySceneSwitch(pending: { scene: SceneType; characterId?: string; bedLocation?: string }): void {
    const { scene, characterId, bedLocation } = pending;

    // Leave current scene
    switch (this.currentScene) {
      case 'entry':     this.scenes.entry.deactivate();     break;
      case 'nameInput': this.scenes.nameInput.deactivate(); break;
      case 'intro':     this.scenes.intro.deactivate();     break;
      case 'hospital':  this.scenes.hospital.deactivate();  break;
      case 'dialogue':  this.scenes.dialogue.cleanup();     break;
      case 'day1Ending': this.scenes.day1Ending.deactivate(); break;
    }

    this.currentScene = scene;

    // Enter new scene
    switch (scene) {
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
      case 'nameInput': this.scenes.nameInput.update(delta); break;
      case 'intro':     this.scenes.intro.update(delta);     break;
      case 'hospital':  this.scenes.hospital.update();       break;
      case 'dialogue':  this.scenes.dialogue.update(delta);  break;
      case 'day1Ending': this.scenes.day1Ending.update(delta); break;
    }
  }

  private render(): void {
    const width  = (this.canvas as any).logicalWidth  || this.canvas.width;
    const height = (this.canvas as any).logicalHeight || this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    switch (this.currentScene) {
      case 'entry':     this.scenes.entry.render();     break;
      case 'nameInput': this.scenes.nameInput.render(); break;
      case 'intro':     this.scenes.intro.render();     break;
      case 'hospital':  this.scenes.hospital.render();  break;
      case 'dialogue':  this.scenes.dialogue.render();  break;
      case 'day1Ending': this.scenes.day1Ending.render(); break;
    }

    // Draw fade overlay on top of everything
    if (this.fadeState !== 'none' && this.fadeAlpha > 0) {
      this.ctx.globalAlpha = this.fadeAlpha;
      this.ctx.fillStyle   = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.globalAlpha = 1;
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