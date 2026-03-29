# Story Assets

This folder contains all dialogue/story content for the game, organized for easy management of story-based interactions.

## Folder Structure

```
stories/
├── patients/          # Individual patient story files
│   ├── mr_tan.json
│   ├── mdm_siti.json
│   ├── patient_3.json
│   └── ...
│
└── chapters/          # Optional: Multi-patient story arcs
    ├── chapter1_introduction.json
    ├── chapter2_crisis.json
    └── ...
```

## Story File Format

Each story file (JSON) defines dialogue trees with support for:
- **Dynamic music changes** based on story progression
- Character expressions
- Branching choices
- Story progression tracking

### Example: `mr_tan.json`

```json
{
  "metadata": {
    "id": "mr_tan_story",
    "title": "The Lonely Patient",
    "chapter": 1,
    "characterId": "patient_elderly_man",
    "defaultMusic": "/src/assets/audio/music/calm_hospital.mp3"
  },
  "start": {
    "text": "Hello nurse... I've been waiting for someone to talk to.",
    "expression": "neutral",
    "options": [
      {
        "text": "How are you feeling today?",
        "response": "Better now that you're here. Thank you for asking.",
        "responseExpression": "happy",
        "next": "feeling_better"
      },
      {
        "text": "I'm quite busy right now.",
        "response": "Oh... I understand. Everyone is busy...",
        "responseExpression": "sad",
        "next": "feeling_lonely",
        "musicTrack": "/src/assets/audio/music/sad_moment.mp3"
      }
    ]
  },
  "feeling_better": {
    "text": "You know, your kindness means a lot to an old man like me.",
    "expression": "happy",
    "options": [
      {
        "text": "Would you like to talk?",
        "response": "I'd love that.",
        "responseExpression": "happy",
        "next": "deep_conversation",
        "musicTrack": "/src/assets/audio/music/emotional_connection.mp3"
      }
    ]
  },
  "feeling_lonely": {
    "text": "Sometimes I feel like nobody has time for me anymore...",
    "expression": "sad",
    "musicTrack": "/src/assets/audio/music/melancholy.mp3",
    "options": [
      {
        "text": "I'm sorry, let me sit with you.",
        "response": "Really? Thank you so much...",
        "responseExpression": "surprised",
        "next": "redemption",
        "musicTrack": "/src/assets/audio/music/hopeful.mp3"
      }
    ]
  }
}
```

## Music Control

### Three Ways to Control Music:

1. **Default Story Music** - Set in metadata:
   ```json
   "metadata": {
     "defaultMusic": "/src/assets/audio/music/calm_hospital.mp3"
   }
   ```

2. **Node-Level Music** - Changes when entering a node:
   ```json
   "sad_scene": {
     "text": "I miss my family...",
     "expression": "sad",
     "musicTrack": "/src/assets/audio/music/melancholy.mp3",
     "options": [...]
   }
   ```

3. **Choice-Triggered Music** - Changes when player selects an option:
   ```json
   {
     "text": "Tell me about your family",
     "response": "They haven't visited in weeks...",
     "responseExpression": "sad",
     "next": "family_story",
     "musicTrack": "/src/assets/audio/music/emotional.mp3"
   }
   ```

## Best Practices

### Story Flow
- Start with a default music to set the mood
- Change music at emotional turning points
- Use node-level music for major scene changes
- Use choice-level music for player-driven emotional shifts

### File Organization
- One file per patient for simple linear stories
- Use chapter files for multi-patient story arcs
- Group related files in subfolders if needed

### Naming Conventions
- Patient files: `[name]_[descriptor].json` (e.g., `mr_tan_lonely.json`)
- Chapter files: `chapter[N]_[theme].json` (e.g., `chapter1_first_shift.json`)
- Music files: `[mood]_[context].mp3` (e.g., `sad_family_grief.mp3`)

## Migration from Old Structure

If you have existing files in `assets/dialouge/`, move them to `assets/stories/patients/` and add metadata:

```json
{
  "metadata": {
    "id": "story_id",
    "defaultMusic": "/src/assets/audio/music/default.mp3"
  },
  "start": { ... }
}
```

The old structure without metadata will still work, but won't have background music.
