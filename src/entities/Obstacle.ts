export class Obstacle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public label: string;

  constructor(x: number, y: number, width: number, height: number, label: string = '') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.label = label;
  }

  public contains(px: number, py: number): boolean {
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2;
    const bottom = this.y + this.height / 2;
    
    return px >= left && px <= right && py >= top && py <= bottom;
  }

  public render(ctx: CanvasRenderingContext2D, showDebug: boolean = true): void {
    if (!showDebug) return;

    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;

    // Draw semi-transparent obstacle
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Orange
    ctx.fillRect(left, top, this.width, this.height);

    // Draw border
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, this.width, this.height);

    // Draw label if provided
    if (this.label) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x, top - 5);
    }

    // Draw center point
    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
  }
}
