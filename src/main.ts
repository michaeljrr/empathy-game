import './style.css';
import { Game } from './core/Game';

// Get canvas element
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

// Get device pixel ratio for crisp rendering
const dpr = window.devicePixelRatio || 1;

// Set fixed logical canvas size for game logic (consistent across all screens)
const logicalWidth = 1600;
const logicalHeight = 900;

// Store logical dimensions on canvas for game logic to use
(canvas as any).logicalWidth = logicalWidth;
(canvas as any).logicalHeight = logicalHeight;

// Set actual canvas size accounting for device pixel ratio
canvas.width = logicalWidth * dpr;
canvas.height = logicalHeight * dpr;

// Get context and scale it for high-DPI displays
const ctx = canvas.getContext('2d');
if (ctx) {
  ctx.scale(dpr, dpr);
}

// Scale canvas to fit window while maintaining aspect ratio
function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const canvasRatio = logicalWidth / logicalHeight;
  const windowRatio = windowWidth / windowHeight;
  
  let scale;
  if (windowRatio > canvasRatio) {
    // Window is wider than canvas ratio
    scale = windowHeight / logicalHeight;
  } else {
    // Window is taller than canvas ratio
    scale = windowWidth / logicalWidth;
  }
  
  canvas.style.width = (logicalWidth * scale) + 'px';
  canvas.style.height = (logicalHeight * scale) + 'px';
}

// Initial resize
resizeCanvas();

// Resize when window size changes
window.addEventListener('resize', resizeCanvas);

// Initialize and start the game
new Game(canvas);
