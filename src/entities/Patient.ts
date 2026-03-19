export class Patient {
  public x: number;
  public y: number;
  public name: string;
  public location: string;
  private width: number = 60;
  private height: number = 40;

  constructor(x: number, y: number, name: string, location: string) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.location = location;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Draw bed
    ctx.fillStyle = '#8b8680';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    
    // Bed frame
    ctx.strokeStyle = '#6b6660';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    
    // Pillow
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - this.width / 2 + 5, this.y - this.height / 2 + 5, 20, 12);
    
    // Blanket
    ctx.fillStyle = '#6ba3d4';
    ctx.fillRect(this.x - this.width / 2 + 5, this.y - this.height / 2 + 18, this.width - 10, 17);
    
    // Patient label
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.location, this.x, this.y + this.height);
  }
}
