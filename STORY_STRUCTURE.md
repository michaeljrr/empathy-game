# Story-Based Game Structure

This document explains the file organization for your story-based empathy game.

## Overview

Your game is now organized with a **data-driven, story-centric** architecture where:
- **Music changes based on story progression**, not character
- **Patient stories are separate from game logic**
- **Story progression is tracked and saved**
- **Content can be added without changing code**

## Folder Structure

```
empathy/
├── src/
│   ├── assets/
│   │   ├── audio/
│   │   │   ├── music/          # Story-based background music
│   │   │   │   ├── calm_hospital.mp3
│   │   │   │   ├── melancholy.mp3
│   │   │   │   ├── hopeful.mp3
│   │   │   │   └── ...
│   │   │   └── voices/         # Character talking sounds
│   │   │       ├── elderly_male_blip.mp3
│   │   │       └── ...
│   │   │
│   │   ├── stories/            # Dialogue/story content
│   │   │   ├── patients/       # Individual patient stories
│   │   │   │   ├── mr_tan_example.json
│   │   │   │   ├── mdm_siti.json
│   │   │   │   └── ...
│   │   │   ├── chapters/       # Multi-patient story arcs
│   │   │   └── README.md       # Story format documentation
│   │   │
│   │   └── images/             # Visual assets
│   │       ├── backgrounds/
│   │       └── characters/
│   │
│   ├── core/
│   │   ├── Game.ts             # Main game loop
│   │   └── StoryManager.ts     # Story progress tracking
│   │
│   ├── data/
│   │   ├── patients.ts         # Patient configuration
│   │   └── README.md           # Data structure docs
│   │
│   ├── entities/
│   │   ├── Patient.ts
│   │   ├── Player.ts
│   │   └── Obstacle.ts
│   │
│   └── scenes/
│       ├── HospitalScene.ts    # Hospital ward gameplay
│       └── DialogueScene.ts    # Dialogue interactions
│
└── [Old dialouge folder can be deprecated]
```

## How It Works

### 1. Story Files (`assets/stories/patients/`)

Each patient has a JSON file with:
- **Metadata** - ID, title, default music
- **Dialogue nodes** - Text, expressions, choices
- **Music triggers** - Change music at key moments

**Example:**
```json
{
  "metadata": {
    "id": "mr_tan_loneliness",
    "defaultMusic": "/src/assets/audio/music/calm_hospital.mp3"
  },
  "start": {
    "text": "Hello nurse...",
    "expression": "neutral",
    "musicTrack": "/src/assets/audio/music/melancholy.mp3",
    "options": [...]
  }
}
```

### 2. Patient Configuration (`data/patients.ts`)

Maps characters to bed locations and story files:

```typescript
{
  id: 'patient_1_mr_tan',
  characterId: 'patient_elderly_man',
  location: 'Bed 1',
  storyFile: '/src/assets/stories/patients/mr_tan_example.json',
  unlockRequirements: []  // Available from start
}
```

### 3. Story Manager (`core/StoryManager.ts`)

Tracks:
- Which stories are completed
- Current chapter
- Which patients are unlocked
- Save/load from localStorage

### 4. Audio System

**Story-Based Music Flow:**
```
Default music (from metadata)
  ↓
Node music (at dialogue nodes)
  ↓
Choice music (when player chooses)
```

Music files are organized by emotion/context, not character:
- `calm_hospital.mp3` - Default peaceful moments
- `melancholy.mp3` - Sad scenes
- `hopeful.mp3` - Positive resolutions
- `emotional_connection.mp3` - Deep conversations

## Workflow for Adding New Stories

### 1. Create Story File
Create `src/assets/stories/patients/your_story.json`:
```json
{
  "metadata": {
    "id": "unique_story_id",
    "title": "Story Title",
    "defaultMusic": "/src/assets/audio/music/appropriate_mood.mp3"
  },
  "start": {
    "text": "Opening dialogue...",
    "expression": "neutral",
    "options": [...]
  }
}
```

### 2. Add Patient Configuration
In `src/data/patients.ts`:
```typescript
{
  id: 'patient_5_new',
  characterId: 'existing_character',
  location: 'Bed 5',
  position: { x: 400, y: 500 },
  storyFile: '/src/assets/stories/patients/your_story.json',
  chapter: 2,
  unlockRequirements: ['patient_1_mr_tan']  // Optional
}
```

### 3. Add Music (if needed)
Place music files in `src/assets/audio/music/` and reference them in your story JSON.

### 4. Test
The game automatically:
- Loads your patient configuration
- Shows "Press E" when player is near
- Loads the story with appropriate music
- Tracks completion in StoryManager

## Key Features

### ✅ Story-Based Music
Music changes based on narrative progression, not character selection.

### ✅ Unlock System
Stories can require previous stories to be completed:
```typescript
unlockRequirements: ['patient_1_mr_tan', 'patient_2_mdm_siti']
```

### ✅ Save System
Progress automatically saves to browser localStorage.

### ✅ Data-Driven
Add content by editing JSON/TS files, no core code changes needed.

### ✅ Type-Safe
TypeScript interfaces ensure correct data structure.

## Migration from Old Structure

If you have files in `assets/dialouge/`:

1. Move JSON files to `assets/stories/patients/`
2. Add metadata section with music info
3. Update references in `patients.ts`
4. Old files will still work but without music

## Next Steps

1. **Create your stories** - Write dialogue JSON files
2. **Add music** - Find/create appropriate mood music
3. **Configure patients** - Set up bed positions and requirements
4. **Test progression** - Play through to verify unlock flow
5. **Add more features** - Achievements, multiple endings, etc.

## Documentation

- Story format: `src/assets/stories/README.md`
- Audio system: `src/assets/audio/README.md`
- Data config: `src/data/README.md`
- Example story: `src/assets/stories/patients/mr_tan_example.json`

## Benefits

- **Writers** can create stories without coding
- **Designers** can adjust progression flow
- **Musicians** can align music with emotional beats
- **Developers** maintain clean, modular code
- **Players** get dynamic, emotionally-driven experience

Happy storytelling! 🏥💙
