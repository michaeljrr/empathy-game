# Data Configuration

This folder contains configuration files that define game data structures separate from the code logic.

## Files

### `patients.ts`
Defines all patient configurations including:
- **Character mapping** - Which character appears in which bed
- **Position data** - Where patients appear on the hospital map
- **Story file references** - Links patients to their dialogue files
- **Unlock requirements** - Story progression dependencies
- **Chapter organization** - Grouping patients by story chapters

**Example:**
```typescript
{
  id: 'patient_1_mr_tan',
  characterId: 'patient_elderly_man',
  location: 'Bed 1',
  position: { x: 200, y: 350 },
  storyFile: '/src/assets/stories/patients/mr_tan_example.json',
  chapter: 1,
}
```

### Future Files

As the game grows, you might add:
- `chapters.ts` - Chapter definitions and flow
- `achievements.ts` - Achievement definitions
- `endings.ts` - Different story endings configuration
- `items.ts` - In-game items or collectibles

## Usage

Import configuration in your scenes:

```typescript
import { PATIENTS, getPatientById } from '../data/patients';
import { storyManager } from '../core/StoryManager';

// Get available patients based on progress
const available = PATIENTS.filter(p => 
  storyManager.canAccessPatient(p.unlockRequirements)
);

// Get specific patient
const mrTan = getPatientById('patient_1_mr_tan');
```

## Benefits of This Structure

1. **Data-Driven** - Change game content without modifying core code
2. **Easy Testing** - Quickly add/remove patients for testing
3. **Clear Organization** - All game data in one place
4. **Type Safety** - TypeScript interfaces ensure correct data structure
5. **Scalability** - Easy to add more patients, chapters, etc.

## Workflow

1. Create story dialogue file in `assets/stories/patients/`
2. Add patient configuration to `patients.ts`
3. StoryManager automatically handles unlock logic
4. HospitalScene loads patients from configuration

This keeps your game logic clean and your content easy to manage!
