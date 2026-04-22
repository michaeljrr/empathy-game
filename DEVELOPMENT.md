# Development Guide

## Architecture Overview

This game uses a **Scene-based architecture** where different parts of the game are separated into distinct scenes that can be switched between.

### Scene Flow

```
EntryScene (Title Screen)
    ↓ [Click Play]
HospitalScene (Main Gameplay)
    ↓ [Press E near patient]
DialogueScene (Conversation)
    ↓ [End conversation]
HospitalScene (Return to gameplay)
```

## Core Components

### Game.ts
The main game controller that:
- Manages the game loop (update/render cycle)
- Handles scene switching
- Coordinates between different scenes

### Scenes

#### EntryScene.ts
- **Purpose**: Welcome screen
- **Features**: 
  - Title display
  - Play button with hover effect
  - Clean, simple UI
- **Exit**: Clicking play button transitions to HospitalScene

#### HospitalScene.ts
- **Purpose**: Main gameplay area
- **Features**:
  - Player movement (WASD/Arrows)
  - Patient interaction (E key)
  - Hospital environment rendering
  - Collision detection
- **Exit**: Pressing E near patient transitions to DialogueScene

#### DialogueScene.ts
- **Purpose**: Conversation interface
- **Features**:
  - Display patient information
  - Show dialogue text with word wrapping
  - Multiple choice options
  - Branching dialogue trees
- **Exit**: Selecting "[End conversation]" returns to HospitalScene

### Entities

#### Player.ts
Represents the nurse character:
- Position and movement
- Visual representation
- Interaction range detection
- Simple sprite rendering

#### Patient.ts
Represents hospital patients:
- Position in hospital
- Name and location
- Visual representation (bed with patient)
- Dialogue data

## Adding New Features

### Adding a New Scene

1. Create new scene file in `src/scenes/`
```typescript
export class NewScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  public update(): void {
    // Update logic
  }

  public render(): void {
    // Render logic
  }

  public cleanup(): void {
    // Clean up event listeners, etc.
  }
}
```

2. Add scene to Game.ts
```typescript
import { NewScene } from '../scenes/NewScene';

// In Game class:
private scenes: {
  entry: EntryScene;
  hospital: HospitalScene;
  dialogue: DialogueScene;
  newScene: NewScene; // Add here
};
```

3. Handle scene switching
```typescript
// Emit custom event to change scene
const event = new CustomEvent('sceneChange', { 
  detail: { scene: 'newScene' } 
});
window.dispatchEvent(event);
```

### Adding New Entities

1. Create entity file in `src/entities/`
```typescript
export class Doctor {
  public x: number;
  public y: number;
  public name: string;

  constructor(x: number, y: number, name: string) {
    this.x = x;
    this.y = y;
    this.name = name;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Draw doctor
  }

  public update(): void {
    // Update logic
  }
}
```

2. Use in scenes
```typescript
import { Doctor } from '../entities/Doctor';

// In scene:
private doctors: Doctor[] = [];

// Initialize:
this.doctors = [
  new Doctor(300, 200, 'Dr. Smith')
];

// Render:
for (const doctor of this.doctors) {
  doctor.render(ctx);
}
```

### Customizing Dialogue

Edit dialogue tree in `DialogueScene.ts`:

```typescript
private setupDialogueTree(): void {
  this.dialogueTree = {
    start: {
      text: 'Opening dialogue text...',
      options: [
        { 
          text: 'Option 1', 
          response: 'Response to option 1',
          next: 'node_name'  // Next dialogue node
        },
        { 
          text: 'Option 2', 
          response: 'Response to option 2',
          next: 'another_node'
        }
      ]
    },
    node_name: {
      text: 'Follow-up dialogue...',
      options: [
        { text: 'Continue...', response: '', next: 'end' }
      ]
    },
    end: {
      text: 'Goodbye!',
      options: [
        { text: '[End conversation]', response: '', next: 'exit' }
      ]
    }
  };
}
```

## Event System

The game uses custom events for scene communication:

```typescript
// Emit event
const event = new CustomEvent('sceneChange', { 
  detail: { 
    scene: 'targetScene',
    data: { /* any additional data */ }
  } 
});
window.dispatchEvent(event);

// Listen for event (in Game.ts)
window.addEventListener('sceneChange', (e: CustomEvent) => {
  const { scene, data } = e.detail;
  // Handle scene change
});
```

## Canvas Rendering Tips

### Drawing Text with Word Wrap
```typescript
private wrapText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
```

### Creating Gradients
```typescript
// Linear gradient
const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
gradient.addColorStop(0, 'blue');
gradient.addColorStop(1, 'red');
ctx.fillStyle = gradient;

// Radial gradient
const radial = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
radial.addColorStop(0, 'white');
radial.addColorStop(1, 'black');
ctx.fillStyle = radial;
```

### Basic Button Detection
```typescript
private isPointInButton(x: number, y: number): boolean {
  return x >= this.buttonX &&
         x <= this.buttonX + this.buttonWidth &&
         y >= this.buttonY &&
         y <= this.buttonY + this.buttonHeight;
}
```

## Performance Tips

1. **Pre-render static elements**: Draw unchanging backgrounds to an offscreen canvas once
2. **Use requestAnimationFrame**: Already implemented in Game.ts
3. **Limit calculations**: Only recalculate when needed
4. **Image loading**: Preload all images before game starts
5. **Clear only dirty regions**: If possible, clear only changed areas

## Debugging

### Console Logging
```typescript
// Add temporary logging
console.log('Player position:', this.player.x, this.player.y);
console.log('Current scene:', this.currentScene);
```

### Visual Debugging
```typescript
// Draw collision boxes
ctx.strokeStyle = 'red';
ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);

// Draw interaction ranges
ctx.strokeStyle = 'yellow';
ctx.beginPath();
ctx.arc(player.x, player.y, interactionRange, 0, Math.PI * 2);
ctx.stroke();
```

## Testing

### Browser Console
- Open with F12
- Check for errors
- Monitor performance with Performance tab

### Mobile Testing
- Use browser dev tools device emulation
- Test touch controls if implemented
- Check responsive design

## Common Issues

**Issue**: Canvas is blurry
**Solution**: Ensure pixel ratio is handled or use CSS: `image-rendering: pixelated`

**Issue**: Events not working
**Solution**: Make sure event listeners are properly cleaned up in `cleanup()` methods

**Issue**: Scene not changing
**Solution**: Check console for errors and verify event detail structure

**Issue**: Images not loading
**Solution**: Verify import paths and check network tab in browser dev tools

## Next Steps

1. Replace placeholder graphics with actual art
2. Add sound effects and music
3. Implement more dialogue branches
4. Add game state persistence (localStorage)
5. Create more hospital rooms/areas
6. Add patient health tracking system
7. Implement nurse stats/progression
8. Add mini-games for medical procedures
