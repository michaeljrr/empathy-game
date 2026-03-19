import { EntryScene } from '../scenes/EntryScene';
import { HospitalScene } from '../scenes/HospitalScene';
import { DialogueScene } from '../scenes/DialogueScene';

type SceneType = 'entry' | 'hospital' | 'dialogue';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentScene: SceneType = 'entry';
  private scenes: {
    entry: EntryScene;
    hospital: HospitalScene;
    dialogue: DialogueScene;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Initialize all scenes
    this.scenes = {
      entry: new EntryScene(this.canvas, this.ctx),
      hospital: new HospitalScene(this.canvas, this.ctx),
      dialogue: new DialogueScene(this.canvas, this.ctx)
    };

    this.setupSceneChangeListener();
    this.startGameLoop();
  }

  private setupSceneChangeListener(): void {
    window.addEventListener('sceneChange', ((e: CustomEvent) => {
      const { scene, patient } = e.detail;
      
      // Cleanup current scene
      if (this.currentScene === 'hospital') {
        this.scenes.hospital.cleanup();
      } else if (this.currentScene === 'dialogue') {
        this.scenes.dialogue.cleanup();
      }

      // Change to new scene
      this.currentScene = scene as SceneType;

      // Setup new scene if needed
      if (scene === 'dialogue' && patient) {
        this.scenes.dialogue.setPatient(patient);
      }
    }) as EventListener);
  }

  private startGameLoop(): void {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  private update(): void {
    switch (this.currentScene) {
      case 'entry':
        this.scenes.entry.update();
        break;
      case 'hospital':
        this.scenes.hospital.update();
        break;
      case 'dialogue':
        this.scenes.dialogue.update();
        break;
    }
  }

  private render(): void {
    // Clear canvas using logical dimensions
    const width = (this.canvas as any).logicalWidth || this.canvas.width;
    const height = (this.canvas as any).logicalHeight || this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // Render current scene
    switch (this.currentScene) {
      case 'entry':
        this.scenes.entry.render();
        break;
      case 'hospital':
        this.scenes.hospital.render();
        break;
      case 'dialogue':
        this.scenes.dialogue.render();
        break;
    }
  }
}
