# Empathy Game - Nurse Simulator

A web-based 2D game about nurses in Singapore, built with TypeScript and deployable on Vercel.

## Project Structure

```
empathy/
├── src/
│   ├── core/
│   │   └── Game.ts           # Main game loop and scene manager
│   ├── scenes/
│   │   ├── EntryScene.ts     # Title screen with play button
│   │   ├── HospitalScene.ts  # Main gameplay - move around hospital
│   │   └── DialogueScene.ts  # Interactive dialogue with patients
│   ├── entities/
│   │   ├── Player.ts         # Nurse character
│   │   └── Patient.ts        # Patient entities
│   ├── assets/
│   │   ├── images/
│   │   │   ├── backgrounds/  # Background images
│   │   │   ├── characters/   # Character sprites
│   │   │   ├── ui/          # UI elements
│   │   │   └── items/       # Item sprites
│   │   └── audio/           # Sound effects and music
│   ├── main.ts              # Entry point
│   ├── style.css            # Global styles
│   └── vite-env.d.ts        # TypeScript definitions
├── public/                  # Static assets
├── index.html               # HTML entry
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json              # Vercel deployment config
```

## Game Scenes

### 1. Entry Scene
- Title screen with game logo
- Play button to start
- Simple, clean interface

### 2. Hospital Scene
- Main gameplay area
- Move nurse character with WASD/Arrow keys
- Interact with patients by pressing 'E'
- Navigate between different hospital rooms/areas

### 3. Dialogue Scene
- Conversation system with patients
- Multiple dialogue options
- Branching conversations
- Return to hospital after conversation

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open http://localhost:5173

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Deployment to Vercel

### Option 1: GitHub + Vercel Dashboard
1. Push your code to GitHub
2. Go to vercel.com and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite and deploy

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

## Adding Images

Place your images in the appropriate folders:

### Backgrounds
`src/assets/images/backgrounds/`
- `hospital-lobby.png`
- `ward-room.png`
- `nurses-station.png`

### Character Sprites
`src/assets/images/characters/`
- `nurse-idle.png`
- `nurse-walk.png`
- `patient-bed1.png`

### UI Elements
`src/assets/images/ui/`
- `button-play.png`
- `dialogue-box.png`
- `interaction-icon.png`

## Loading Images in TypeScript

```typescript
// Import image
import nurseSprite from './assets/images/characters/nurse-idle.png';

// Create image element
const img = new Image();
img.src = nurseSprite;
img.onload = () => {
  // Draw image when loaded
  ctx.drawImage(img, x, y, width, height);
};
```

## Customization

### Adding New Patients
Edit `src/scenes/HospitalScene.ts`:
```typescript
this.patients = [
  new Patient(200, 150, 'Patient Name', 'Bed 1'),
  // Add more patients here
];
```

### Creating Dialogue Trees
Edit `src/scenes/DialogueScene.ts` to add custom dialogue branches.

### Styling
Modify `src/style.css` for custom colors and fonts.

## Technologies Used

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **HTML5 Canvas** - 2D rendering
- **Vercel** - Hosting and deployment

## Future Enhancements

- [ ] Add sprite animations
- [ ] Implement sound effects
- [ ] Add multiple hospital rooms
- [ ] Create patient health tracking
- [ ] Add mini-games for medical procedures
- [ ] Implement save/load system
- [ ] Add more dialogue branches
- [ ] Create story progression system

## License

© 2026 SUTD - Educational Project
