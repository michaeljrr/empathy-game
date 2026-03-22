import { EntryScene }    from '../scenes/EntryScene';
import { HospitalScene } from '../scenes/HospitalScene';
import { DialogueScene } from '../scenes/DialogueScene';

type SceneType = 'entry' | 'hospital' | 'dialogue';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;
  private currentScene: SceneType = 'entry';
  private scenes: {
    entry:    EntryScene;
    hospital: HospitalScene;
    dialogue: DialogueScene;
  };

  private lastTimestamp: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d')!;

    this.scenes = {
      entry:    new EntryScene(this.canvas, this.ctx),
      hospital: new HospitalScene(this.canvas, this.ctx),
      dialogue: new DialogueScene(this.canvas, this.ctx),
    };

    // Hospital starts inactive — entry scene is first
    this.scenes.hospital.deactivate();

    this.setupSceneChangeListener();
    this.startGameLoop();
  }

  private setupSceneChangeListener(): void {
    window.addEventListener('sceneChange', ((e: CustomEvent) => {
      const { scene, characterId } = e.detail as {
        scene: SceneType;
        characterId?: string;
      };

      // ── Leave current scene ───────────────────────────────────────────────
      switch (this.currentScene) {
        case 'hospital':
          // Deactivate BEFORE switching — blocks E from reaching checkInteraction
          this.scenes.hospital.deactivate();
          break;
        case 'dialogue':
          this.scenes.dialogue.cleanup();
          break;
      }

      this.currentScene = scene;

      // ── Enter new scene ───────────────────────────────────────────────────
      switch (scene) {
        case 'hospital':
          // Re-activate so keys work again
          this.scenes.hospital.activate();
          break;
        case 'dialogue':
          if (!characterId) {
            console.error('Game: missing characterId for dialogue scene');
            return;
          }
          this.scenes.dialogue.init(characterId);
          break;
      }

    }) as EventListener);
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      const delta = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      this.update(delta);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(delta: number): void {
    switch (this.currentScene) {
      case 'entry':    this.scenes.entry.update();         break;
      case 'hospital': this.scenes.hospital.update();      break;
      case 'dialogue': this.scenes.dialogue.update(delta); break;
    }
  }

  private render(): void {
    const width  = (this.canvas as any).logicalWidth  || this.canvas.width;
    const height = (this.canvas as any).logicalHeight || this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    switch (this.currentScene) {
      case 'entry':    this.scenes.entry.render();    break;
      case 'hospital': this.scenes.hospital.render(); break;
      case 'dialogue': this.scenes.dialogue.render(); break;
    }
  }
}