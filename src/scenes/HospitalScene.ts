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
  private showObstacles: boolean = true; // Set to false to hide obstacles
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }
  
  // Movement boundaries - ADJUST THESE VALUES to match your ward image
  private movementBounds = {
    left: 50,      // Left boundary (pixels from left edge)
    right: 850,    // Right boundary (pixels from left edge)
    top: 50,       // Top boundary (pixels from top edge)
    bottom: 850    // Bottom boundary (pixels from top edge)
  };

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = wardEmptyBg;
    this.backgroundImage.onload = () => {
      this.backgroundLoaded = true;
    };
    
    // Initialize player at center
    this.player = new Player(450, 450);
    
    // Initialize patients (rooms/stations)
    this.setupPatients();
    this.setupObstacles();
    this.setupEventListeners();
  }

  private setupPatients(): void {
    // Position beds near the four corners of the ward
    this.patients = [
      new Patient(245, 220, 'Mr. Chen', 'Bed 1'),     // Top-left
      new Patient(660, 225, 'Mrs. Park', 'Bed 2'),    // Top-right
      new Patient(245, 675, 'Mr. Liu', 'Bed 3'),      // Bottom-left
      new Patient(660, 675, 'Ms. Wong', 'Bed 4'),     // Bottom-right
    ];
  }

  private setupObstacles(): void {
    // ADD YOUR OBSTACLES HERE - format: new Obstacle(x, y, width, height, label)
    // Example obstacles:
    this.obstacles = [
      new Obstacle(245, 200, 130, 160, 'Bed 1'),  // Bed 1
      new Obstacle(660, 205, 130, 160, 'Bed 2'),  // Bed 2
      new Obstacle(245, 635, 130, 300, 'Bed 3'),  // Bed 3
      new Obstacle(660, 635, 130, 300, 'Bed 4'),  // Bed 4
      new Obstacle(150, 410, 200, 100, 'Left Wall'),      // Left partition wall
      new Obstacle(750, 410, 200, 100, 'Right Wall'),     // Right partition wall
      new Obstacle(450, 150, 50, 200, 'Top Wall'),       // Top wall
      new Obstacle(450, 750, 50, 200, 'Bottom Wall'),    // Bottom wall
      // Add more obstacles as needed...
    ];
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      
      // Interaction key
      if (e.key === 'e' || e.key === 'E') {
        this.checkInteraction();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  private checkInteraction(): void {
    for (const patient of this.patients) {
      if (this.isPlayerNearHitbox(patient)) {
        // Trigger dialogue scene
        const event = new CustomEvent('sceneChange', { 
          detail: { 
            scene: 'dialogue',
            patient: patient
          } 
        });
        window.dispatchEvent(event);
        break;
      }
    }
  }
  
  private isPlayerNearHitbox(patient: Patient): boolean {
    // Hitbox dimensions (must match drawBedHitboxes)
    const hitboxWidth = 240;  // MUST MATCH drawBedHitboxes
    const hitboxHeight = 280; // MUST MATCH drawBedHitboxes
    const hitboxLeft = patient.x - hitboxWidth / 2;
    const hitboxRight = patient.x + hitboxWidth / 2;
    const hitboxTop = patient.y - hitboxHeight / 2;
    const hitboxBottom = patient.y + hitboxHeight / 2;
    
    // Check if player center is inside the red hitbox rectangle
    return this.player.x >= hitboxLeft &&
           this.player.x <= hitboxRight &&
           this.player.y >= hitboxTop &&
           this.player.y <= hitboxBottom;
  }

  public update(): void {
    // Player movement
    const speed = 4;
    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowLeft'] || this.keys['a']) dx = -speed;
    if (this.keys['ArrowRight'] || this.keys['d']) dx = speed;
    if (this.keys['ArrowUp'] || this.keys['w']) dy = -speed;
    if (this.keys['ArrowDown'] || this.keys['s']) dy = speed;

    // Store old position
    const oldX = this.player.x;
    const oldY = this.player.y;

    // Try to move
    this.player.move(dx, dy, this.width, this.height, this.movementBounds);
    
    // Check for collisions with obstacles
    for (const obstacle of this.obstacles) {
      if (obstacle.contains(this.player.x, this.player.y)) {
        // Collision detected! Revert to old position
        this.player.x = oldX;
        this.player.y = oldY;
        break;
      }
    }

    this.player.update();
  }

  public render(): void {
    const ctx = this.ctx;
    
    // Background - Ward Empty image
    if (this.backgroundLoaded) {
      ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
    } else {
      // Fallback while loading
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    
    // Draw bed hitboxes (visible for positioning)
    this.drawBedHitboxes();
    
    // Draw movement boundary (temporary for debugging)
    this.drawMovementBoundary();

    // Draw obstacles
    for (const obstacle of this.obstacles) {
      obstacle.render(ctx, this.showObstacles);
    }

    // Check for interaction prompts (no bed icons rendered)
    for (const patient of this.patients) {
      // Show interaction prompt if near hitbox
      if (this.isPlayerNearHitbox(patient)) {
        this.drawInteractionPrompt(patient);
      }
    }

    // Draw player
    this.player.render(ctx);

    // UI
    this.drawUI();
  }

  private drawBedHitboxes(): void {
    const ctx = this.ctx;
    
    // Draw hitboxes for each bed (on top of background for now for positioning)
    // These are the areas where the player can press E to interact
    for (const patient of this.patients) {
      // Hitbox dimensions - adjust these to match bed positions
      const hitboxWidth = 220;
      const hitboxHeight = 280;
      const hitboxX = patient.x - hitboxWidth / 2;
      const hitboxY = patient.y - hitboxHeight / 2;
      
      // Draw visible hitbox (semi-transparent for debugging)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red with 30% opacity
      ctx.fillRect(hitboxX, hitboxY, hitboxWidth, hitboxHeight);
      
      // Draw border
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hitboxX, hitboxY, hitboxWidth, hitboxHeight);
      
      // Draw bed label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(patient.location, patient.x, hitboxY - 5);
    }
  }

  private drawMovementBoundary(): void {
    const ctx = this.ctx;
    
    // Calculate boundary rectangle dimensions
    const boundaryWidth = this.movementBounds.right - this.movementBounds.left;
    const boundaryHeight = this.movementBounds.bottom - this.movementBounds.top;
    
    // Draw semi-transparent overlay outside the boundaries (to show restricted area)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    // Top bar
    ctx.fillRect(0, 0, this.width, this.movementBounds.top);
    // Bottom bar
    ctx.fillRect(0, this.movementBounds.bottom, this.width, this.height - this.movementBounds.bottom);
    // Left bar
    ctx.fillRect(0, this.movementBounds.top, this.movementBounds.left, boundaryHeight);
    // Right bar
    ctx.fillRect(this.movementBounds.right, this.movementBounds.top, this.width - this.movementBounds.right, boundaryHeight);
    
    // Draw bright boundary border (where nurse can walk)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green border
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.movementBounds.left,
      this.movementBounds.top,
      boundaryWidth,
      boundaryHeight
    );
    
    // Draw corner markers
    const markerSize = 10;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    // Top-left
    ctx.fillRect(this.movementBounds.left - 2, this.movementBounds.top - 2, markerSize, markerSize);
    // Top-right
    ctx.fillRect(this.movementBounds.right - markerSize + 2, this.movementBounds.top - 2, markerSize, markerSize);
    // Bottom-left
    ctx.fillRect(this.movementBounds.left - 2, this.movementBounds.bottom - markerSize + 2, markerSize, markerSize);
    // Bottom-right
    ctx.fillRect(this.movementBounds.right - markerSize + 2, this.movementBounds.bottom - markerSize + 2, markerSize, markerSize);
  }

  private drawInteractionPrompt(patient: Patient): void {
    const ctx = this.ctx;
    
    // Hitbox dimensions (must match drawBedHitboxes)
    const hitboxHeight = 270; // MUST MATCH drawBedHitboxes
    const hitboxY = patient.y - hitboxHeight / 2;
    
    // Draw prompt above the hitbox
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(patient.x - 40, hitboxY - 35, 80, 25);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press E', patient.x, hitboxY - 15);
  }

  private drawUI(): void {
    const ctx = this.ctx;
    
    // Controls hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, this.height - 50, 250, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / Arrow Keys: Move', 20, this.height - 25);
    ctx.fillText('E: Interact with patients', 20, this.height - 10);
  }

  public cleanup(): void {
    // Remove event listeners when scene changes
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('keyup', () => {});
  }
}
