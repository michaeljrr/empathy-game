# Assets Folder

Place your game assets here following this structure:

## Images

### backgrounds/
Place background images for different hospital scenes:
- `entry-background.png` - Title screen background
- `hospital-lobby.png` - Main hospital lobby
- `ward-room.png` - Patient ward
- `nurses-station.png` - Nurses' station
- `supply-room.png` - Supply/medication room

Recommended size: 800x600px

### characters/
Character sprites and animations:
- `nurse-idle.png` - Nurse standing still
- `nurse-walk-cycle.png` - Nurse walking animation
- `nurse-interact.png` - Nurse interaction pose
- `patient-1.png` through `patient-5.png` - Different patient characters

Recommended size: 64x64px or 128x128px per frame

### ui/
User interface elements:
- `button-play.png` - Play button
- `button-play-hover.png` - Play button hover state
- `dialogue-box.png` - Dialogue container
- `interaction-prompt.png` - "Press E" prompt
- `health-bar.png` - Patient health indicator
- `icons/` subfolder for small icons

### items/
In-game items and objects:
- `medical-cart.png`
- `iv-stand.png`
- `clipboard.png`
- `stethoscope.png`
- `medicine-bottle.png`

Recommended size: 32x32px or 64x64px

## Audio

### music/
Background music files:
- `title-theme.mp3`
- `hospital-ambient.mp3`
- `dialogue-theme.mp3`

### sfx/
Sound effects:
- `click.mp3` - Button click
- `footsteps.mp3` - Walking sound
- `dialogue-open.mp3` - Dialogue box open
- `dialogue-close.mp3` - Dialogue box close
- `interact.mp3` - Interaction sound

## Usage Example

```typescript
// Import an image
import nurseSprite from '../assets/images/characters/nurse-idle.png';

// Use in your code
const image = new Image();
image.src = nurseSprite;
image.onload = () => {
  ctx.drawImage(image, x, y, width, height);
};
```

## Image Format Recommendations

- **PNG** - For sprites, characters, and UI elements (supports transparency)
- **JPG** - For backgrounds (smaller file size)
- **SVG** - For logos and scalable graphics

## Best Practices

1. Keep file sizes small (compress images before adding)
2. Use consistent naming conventions (lowercase, hyphens)
3. Maintain consistent dimensions for sprite sheets
4. Include source files (.psd, .ai) in a separate `source/` folder
5. Create sprite sheets for animations to reduce loading time

## Tools Recommended

- **Aseprite** - Pixel art and sprite animation
- **GIMP** - Free image editing
- **Photoshop** - Professional image editing
- **TinyPNG** - Image compression
