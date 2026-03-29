import { Patient } from './Patient';
import nurseHappy from '../assets/images/characters/nurse/nurse_happy.png';
import nurseWalk1 from '../assets/images/characters/nurse/nurse_walk1.png';
import nurseWalk2 from '../assets/images/characters/nurse/nurse_walk2.png';

export class Player {
  public x: number;
  public y: number;
  public width: number = 420;
  public height: number = 420;
  
  // Separate dimensions for each sprite type
  public walkingWidth: number = 336;
  public walkingHeight: number = 420;
  public idleWidth: number = 336;
  public idleHeight: number = 420;
  
  private happySprite: HTMLImageElement;
  private walkingSprite1: HTMLImageElement;
  private walkingSprite2: HTMLImageElement;
  private spritesLoaded: boolean = false;
  
  private isMoving: boolean = false;
  private facingLeft: boolean = false;
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private animationSpeed: number = 8; // Frames between sprite changes (increased for slower animation)

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    
    // Load nurse sprites
    this.happySprite = new Image();
    this.happySprite.src = nurseHappy;
    this.happySprite.onload = () => this.checkSpritesLoaded();
    
    this.walkingSprite1 = new Image();
    this.walkingSprite1.src = nurseWalk1;
    this.walkingSprite1.onload = () => this.checkSpritesLoaded();
    
    this.walkingSprite2 = new Image();
    this.walkingSprite2.src = nurseWalk2;
    this.walkingSprite2.onload = () => this.checkSpritesLoaded();
  }
  
  private checkSpritesLoaded(): void {
    if (this.happySprite.complete && this.walkingSprite1.complete && this.walkingSprite2.complete) {
      this.spritesLoaded = true;
    }
  }

  public move(dx: number, dy: number, canvasWidth: number, canvasHeight: number, customBounds?: { left: number, right: number, top: number, bottom: number }): void {
    this.x += dx;
    this.y += dy;

    // Use the largest dimensions to ensure sprite never goes out of bounds
    const halfWidth = Math.max(this.walkingWidth, this.idleWidth) / 2;
    const halfHeight = Math.max(this.walkingHeight, this.idleHeight) / 2;

    // Keep player in bounds (accounting for sprite size)
    if (customBounds) {
      // Use custom boundaries with sprite dimensions
      this.x = Math.max(customBounds.left + halfWidth, Math.min(customBounds.right - halfWidth, this.x));
      this.y = Math.max(customBounds.top + halfHeight, Math.min(customBounds.bottom - halfHeight, this.y));
    } else {
      // Use default boundaries with sprite dimensions
      this.x = Math.max(halfWidth, Math.min(canvasWidth - halfWidth, this.x));
      this.y = Math.max(100 + halfHeight, Math.min(canvasHeight - halfHeight, this.y));
    }
    
    this.isMoving = dx !== 0 || dy !== 0;
    
    // Determine facing direction (only change if moving horizontally)
    if (dx < 0) {
      this.facingLeft = true;
    } else if (dx > 0) {
      this.facingLeft = false;
    }
  }

  public update(): void {
    // Update walking animation
    if (this.isMoving) {
      this.animationTimer++;
      if (this.animationTimer >= this.animationSpeed) {
        this.animationTimer = 0;
        this.animationFrame = this.animationFrame === 0 ? 1 : 0; // Toggle between 0 and 1
      }
    } else {
      this.animationFrame = 0;
      this.animationTimer = 0;
    }
  }

  public isNear(patient: Patient): boolean {
    const distance = Math.sqrt(
      Math.pow(this.x - patient.x, 2) + 
      Math.pow(this.y - patient.y, 2)
    );
    return distance < 80; // Interaction range
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.spritesLoaded) {
      // Fallback: Draw a simple placeholder while sprites load
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      return;
    }
    
    // Vertical offset to move character down closer to shadow (adjust this value to move character up/down)
    const yOffset = 10;
    
    // Draw shadow (stays at player hitbox position)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.height / 2, this.width * 0.3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Choose sprite based on movement state
    if (this.isMoving) {
      // Select which walking sprite to use based on animation frame
      const currentWalkingSprite = this.animationFrame === 0 ? this.walkingSprite1 : this.walkingSprite2;
      
      // Use walking sprite dimensions
      const renderHeight = this.walkingHeight;
      const renderWidth = this.walkingWidth;
      
      // Calculate position
      const drawX = this.x - renderWidth / 2;
      const drawY = this.y - renderHeight / 2 + yOffset;
      
      // Draw the current walking frame with flip if needed
      ctx.save();
      if (this.facingLeft) {
        // Flip horizontally around the center X position
        ctx.translate(this.x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.x, 0);
      }
      
      ctx.drawImage(
        currentWalkingSprite,
        drawX, drawY,
        renderWidth, renderHeight
      );
      ctx.restore();
      
    } else {
      // Happy sprite when idle
      // Use idle sprite dimensions
      const renderHeight = this.idleHeight;
      const renderWidth = this.idleWidth;
      
      // Calculate position
      const drawX = this.x - renderWidth / 2;
      const drawY = this.y - renderHeight / 2 + yOffset;
      
      // Draw sprite with flip if needed
      ctx.save();
      if (this.facingLeft) {
        // Flip horizontally around the center X position
        ctx.translate(this.x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.x, 0);
      }
      
      ctx.drawImage(
        this.happySprite,
        drawX, drawY,
        renderWidth, renderHeight
      );
      ctx.restore();
    }
  }
}
