import { Patient } from '../entities/Patient';

interface DialogueOption {
  text: string;
  response: string;
  next?: string;
}

interface DialogueNode {
  text: string;
  options: DialogueOption[];
}

export class DialogueScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private patient: Patient | null = null;
  private currentNode: string = 'start';
  private dialogueTree: { [key: string]: DialogueNode } = {};
  private hoveredOption: number = -1;
  private get width() { return (this.canvas as any).logicalWidth || this.canvas.width; }
  private get height() { return (this.canvas as any).logicalHeight || this.canvas.height; }

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setupEventListeners();
  }

  public setPatient(patient: Patient): void {
    this.patient = patient;
    this.currentNode = 'start';
    this.setupDialogueTree();
  }

  private setupDialogueTree(): void {
    // Example dialogue tree - can be loaded from JSON
    this.dialogueTree = {
      start: {
        text: `Hello, Nurse. I'm ${this.patient?.name}. I've been feeling unwell...`,
        options: [
          { 
            text: 'How are you feeling today?', 
            response: 'Much better with your care, thank you.',
            next: 'feeling_better'
          },
          { 
            text: 'Let me check your vitals.', 
            response: 'Of course, please go ahead.',
            next: 'check_vitals'
          },
          { 
            text: 'Do you need anything?', 
            response: 'Just some water would be nice.',
            next: 'need_water'
          }
        ]
      },
      feeling_better: {
        text: 'I appreciate your dedication. It makes a real difference.',
        options: [
          { text: 'That\'s what I\'m here for.', response: 'Thank you, Nurse.', next: 'end' },
          { text: 'Anything else I can do?', response: 'No, I\'m fine for now.', next: 'end' }
        ]
      },
      check_vitals: {
        text: 'Hmm, my blood pressure seems a bit high today.',
        options: [
          { text: 'Let me alert the doctor.', response: 'Thank you, I appreciate it.', next: 'end' },
          { text: 'Try to rest and relax.', response: 'I will, thank you.', next: 'end' }
        ]
      },
      need_water: {
        text: 'Thank you so much. You\'re very kind.',
        options: [
          { text: 'You\'re welcome!', response: 'Have a good day, Nurse.', next: 'end' }
        ]
      },
      end: {
        text: 'Take care!',
        options: [
          { text: '[End conversation]', response: '', next: 'exit' }
        ]
      }
    };
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

    const node = this.dialogueTree[this.currentNode];
    if (!node) return;

    this.hoveredOption = -1;
    const startY = 400;
    const optionHeight = 50;

    node.options.forEach((_, index) => {
      const optionY = startY + index * (optionHeight + 10);
      if (coords.y >= optionY && coords.y <= optionY + optionHeight &&
          coords.x >= 100 && coords.x <= this.width - 100) {
        this.hoveredOption = index;
      }
    });

    this.canvas.style.cursor = this.hoveredOption >= 0 ? 'pointer' : 'default';
  }

  private handleClick(_e: MouseEvent): void {
    if (this.hoveredOption >= 0) {
      const node = this.dialogueTree[this.currentNode];
      const option = node.options[this.hoveredOption];

      // Show response briefly
      // console.log(option.response);

      if (option.next === 'exit') {
        // Return to hospital scene
        const event = new CustomEvent('sceneChange', { 
          detail: { scene: 'hospital' } 
        });
        window.dispatchEvent(event);
      } else if (option.next) {
        this.currentNode = option.next;
      }
    }
  }

  public update(): void {
    // Animation logic
  }

  public render(): void {
    const ctx = this.ctx;
    
    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Patient info area
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(50, 50, this.width - 100, 250);

    // Patient name
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.patient?.name || 'Patient', this.width / 2, 100);

    // Location
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '18px Arial';
    ctx.fillText(this.patient?.location || '', this.width / 2, 130);

    // Dialogue text
    const node = this.dialogueTree[this.currentNode];
    if (node) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      this.wrapText(ctx, node.text, this.width / 2, 180, this.width - 140, 30);

      // Dialogue options
      const startY = 400;
      const optionHeight = 50;

      node.options.forEach((option, index) => {
        const optionY = startY + index * (optionHeight + 10);
        const isHovered = this.hoveredOption === index;

        // Option box
        ctx.fillStyle = isHovered ? '#4CAF50' : '#444444';
        ctx.fillRect(100, optionY, this.width - 200, optionHeight);

        // Option border
        ctx.strokeStyle = isHovered ? '#66BB6A' : '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, optionY, this.width - 200, optionHeight);

        // Option text
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(option.text, 120, optionY + 32);
      });
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    ctx.textAlign = 'center';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  public cleanup(): void {
    this.canvas.removeEventListener('mousemove', () => {});
    this.canvas.removeEventListener('click', () => {});
  }
}
