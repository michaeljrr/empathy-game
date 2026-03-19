export class EntryScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playButtonHovered: boolean = false;
  private playButtonBounds = { x: 350, y: 550, width: 200, height: 60 };
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number, y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);
    this.playButtonHovered = this.isPointInButton(coords.x, coords.y);
    this.canvas.style.cursor = this.playButtonHovered ? 'pointer' : 'default';
  }

  private handleClick(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);

    if (this.isPointInButton(coords.x, coords.y)) {
      // Trigger scene change to hospital scene
      const event = new CustomEvent('sceneChange', { detail: { scene: 'hospital' } });
      window.dispatchEvent(event);
    }
  }

  private isPointInButton(x: number, y: number): boolean {
    return x >= this.playButtonBounds.x &&
           x <= this.playButtonBounds.x + this.playButtonBounds.width &&
           y >= this.playButtonBounds.y &&
           y <= this.playButtonBounds.y + this.playButtonBounds.height;
  }

  public update(): void {
    // Animation logic can go here
  }

  public render(): void {
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EMPATHY', this.width / 2, 250);

    ctx.font = '32px Arial';
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText('A Nurse\'s Journey', this.width / 2, 320);

    // Instructions
    ctx.font = '20px Arial';
    ctx.fillStyle = '#808080';
    ctx.fillText('Care for patients. Make meaningful choices.', this.width / 2, 450);

    // Play button
    const btnColor = this.playButtonHovered ? '#4CAF50' : '#2e7d32';
    ctx.fillStyle = btnColor;
    ctx.fillRect(
      this.playButtonBounds.x,
      this.playButtonBounds.y,
      this.playButtonBounds.width,
      this.playButtonBounds.height
    );

    // Play button text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(
      'PLAY',
      this.width / 2,
      this.playButtonBounds.y + 40
    );

    // Credits
    ctx.font = '16px Arial';
    ctx.fillStyle = '#606060';
    ctx.textAlign = 'center';
    ctx.fillText('© 2026 SUTD', this.width / 2, this.height - 40);
  }
}
