// ============================================================
//  patients.ts
// ============================================================
//
//  Patient configuration for story-based game structure.
//  Defines which characters appear in which beds and their
//  story progression requirements.

export interface PatientConfig {
  id: string;              // Unique identifier for this patient instance
  characterId: string;     // References CHARACTERS in DialogueScene.ts
  location: string;        // Bed location in hospital (e.g., "Bed 1")
  position: {              // Position on the canvas
    x: number;
    y: number;
  };
  storyFile: string;       // Path to dialogue JSON file
  chapter?: number;        // Optional: Story chapter this patient belongs to
  unlockRequirements?: string[];  // Optional: Story IDs that must be completed first
  displayName?: string;    // Optional: Override character name for UI
}

/**
 * Configure all patients in the hospital ward.
 * This array defines which characters appear where and in what order.
 */
export const PATIENTS: PatientConfig[] = [
  {
    id: 'patient_1_mr_tan',
    characterId: 'patient_elderly_man',
    location: 'Bed 1',
    position: { x: 200, y: 350 },
    storyFile: '/src/assets/stories/patients/mr_tan_example.json',
    chapter: 1,
  },
  {
    id: 'patient_2_mdm_siti',
    characterId: 'patient_young_woman',
    location: 'Bed 2',
    position: { x: 700, y: 350 },
    storyFile: '/src/assets/stories/patients/mdm_siti.json',
    chapter: 1,
    unlockRequirements: ['patient_1_mr_tan'],  // Must complete Mr. Tan first
  },
  {
    id: 'patient_3_dr_lim',
    characterId: 'doctor_senior',
    location: 'Bed 3',
    position: { x: 200, y: 650 },
    storyFile: '/src/assets/stories/patients/dr_lim.json',
    chapter: 2,
    unlockRequirements: ['patient_1_mr_tan', 'patient_2_mdm_siti'],
  },
  {
    id: 'patient_4_nurse_mei',
    characterId: 'nurse_colleague',
    location: 'Bed 4',
    position: { x: 700, y: 650 },
    storyFile: '/src/assets/stories/patients/nurse_mei.json',
    chapter: 2,
  },
  // Add more patients as needed...
];

/**
 * Helper function to get patient by ID
 */
export function getPatientById(id: string): PatientConfig | undefined {
  return PATIENTS.find(p => p.id === id);
}

/**
 * Helper function to get patients by chapter
 */
export function getPatientsByChapter(chapter: number): PatientConfig[] {
  return PATIENTS.filter(p => p.chapter === chapter);
}

/**
 * Helper function to get available patients (no unlock requirements)
 */
export function getAvailablePatients(completedStories: Set<string>): PatientConfig[] {
  return PATIENTS.filter(patient => {
    if (!patient.unlockRequirements) return true;
    return patient.unlockRequirements.every(req => completedStories.has(req));
  });
}
