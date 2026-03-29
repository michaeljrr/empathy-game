# Audio Assets

This folder contains all audio files for the game, including **story-based background music** and character voice sounds.

## Folder Structure

```
audio/
├── music/              # Background music for different story moments
│   ├── calm_hospital.mp3          # Default peaceful hospital ambience
│   ├── hopeful.mp3                # Uplifting, positive moments
│   ├── melancholy.mp3             # Sad, reflective scenes
│   ├── emotional_connection.mp3   # Deep conversations, bonding
│   ├── sad_family_grief.mp3       # Family loss, grief
│   ├── anxious_tension.mp3        # Stressful, tense situations
│   ├── gentle_empathy.mp3         # Caring, compassionate moments
│   └── resolution.mp3             # Story conclusions, endings
│
└── voices/             # Character talking sounds (short blips)
    ├── elderly_male_blip.mp3
    ├── female_blip.mp3
    ├── doctor_male_blip.mp3
    ├── nurse_female_blip.mp3
    └── young_male_blip.mp3
```

## Audio Specifications

### Background Music
- **Format**: MP3 or OGG
- **Duration**: 1-3 minutes (will loop)
- **Volume**: Played at 30% volume (adjustable in code)
- **Style**: Ambient music that fits different emotional story moments
- **Important**: Music is **story-based**, not character-based!

### Voice Blips
- **Format**: MP3 or OGG
- **Duration**: 50-150ms (very short)
- **Volume**: Played at 50% volume (adjustable in code)
- **Style**: Short vocal sounds representing character speech
  - Vary pitch/tone for different character types
  - Examples: "hmm", "eh", "ah" sounds

## Story-Based Music System

### How It Works

Music changes dynamically based on **story progression** rather than which character is speaking:

1. **Default Story Music** - Set in story file metadata
2. **Scene-Based Music** - Changes at specific dialogue nodes
3. **Choice-Driven Music** - Changes when player makes emotional choices

### Example Story Flow

```
Story Starts → calm_hospital.mp3 (default)
  ↓
Patient shares sad news → melancholy.mp3 (node change)
  ↓
Player chooses compassionate option → gentle_empathy.mp3 (choice change)
  ↓
Deep conversation → emotional_connection.mp3 (node change)
  ↓
Story resolves → hopeful.mp3 (choice change)
```

### Music Categories

Organize your music by **emotional tone** and **story context**:

#### Neutral/Background
- `calm_hospital.mp3` - Default ambience
- `routine_ward.mp3` - Daily hospital life
- `quiet_morning.mp3` - Peaceful moments

#### Positive Emotions
- `hopeful.mp3` - Recovery, good news
- `gentle_empathy.mp3` - Connection, caring
- `grateful.mp3` - Thankfulness, appreciation

#### Negative Emotions  
- `melancholy.mp3` - Sadness, loneliness
- `sad_family_grief.mp3` - Loss, mourning
- `anxious_tension.mp3` - Stress, worry

#### Dramatic Moments
- `emotional_connection.mp3` - Deep conversations
- `critical_moment.mp3` - Important decisions
- `resolution.mp3` - Story conclusions

## Usage in Story Files

Music is controlled in your story JSON files:

```json
{
  "metadata": {
    "defaultMusic": "/src/assets/audio/music/calm_hospital.mp3"
  },
  "sad_scene": {
    "text": "I miss my family...",
    "expression": "sad",
    "musicTrack": "/src/assets/audio/music/melancholy.mp3",
    "options": [
      {
        "text": "Tell me about them",
        "response": "...",
        "responseExpression": "sad",
        "next": "family_story",
        "musicTrack": "/src/assets/audio/music/sad_family_grief.mp3"
      }
    ]
  }
}
```

## Finding Audio Files

### Free Sources:
- **Music**: 
  - [Freesound.org](https://freesound.org/)
  - [Incompetech](https://incompetech.com/music/royalty-free/)
  - [Purple Planet Music](https://www.purple-planet.com/)
  - [Bensound](https://www.bensound.com/)
  
- **Voice Blips**:
  - Record your own using Audacity
  - Use [jsfxr](https://sfxr.me/) for synthetic sounds
  - Search "text blip" on Freesound.org

### Search Terms for Music
- "hospital ambient"
- "sad piano"
- "emotional strings"
- "hopeful acoustic"
- "melancholy cello"
- "gentle piano"

## Implementation Notes

- The game will continue to work without audio files (warnings appear in console)
- Audio files can be added incrementally
- Music changes are smooth - old track stops, new one starts
- Adjust volumes in `DialogueScene.ts` if needed:
  - Background music: Line ~705 (`audio.volume = 0.3`)
  - Voice blips: Line ~690 (`audio.volume = 0.5`)

## Tips for Better Audio Experience

1. **Keep music consistent in style** - All tracks should feel cohesive
2. **Test emotional transitions** - Make sure music changes feel natural
3. **Don't overuse music changes** - Only at key emotional moments
4. **Balance volumes** - Music shouldn't overpower voice blips
5. **Loop-friendly tracks** - Ensure music loops seamlessly
