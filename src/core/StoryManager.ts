// ============================================================
//  StoryManager.ts
// ============================================================
//
//  Manages story progression, tracks completed stories,
//  and handles save/load functionality.

export class StoryManager {
  private completedStories: Set<string> = new Set();
  private currentChapter: number = 1;
  private storyMetadata: Map<string, any> = new Map();
  private readonly STORAGE_KEY = 'empathy_game_progress';

  constructor() {
    this.loadProgress();
  }

  // ── Story Completion ───────────────────────────────────────────────────────

  /**
   * Mark a story as completed
   */
  completeStory(storyId: string, metadata?: any): void {
    this.completedStories.add(storyId);
    if (metadata) {
      this.storyMetadata.set(storyId, metadata);
    }
    this.saveProgress();
    console.log(`[StoryManager] Completed story: ${storyId}`);
  }

  /**
   * Check if a story has been completed
   */
  isStoryCompleted(storyId: string): boolean {
    return this.completedStories.has(storyId);
  }

  /**
   * Get metadata for a completed story
   */
  getStoryMetadata(storyId: string): any {
    return this.storyMetadata.get(storyId);
  }

  /**
   * Get all completed story IDs
   */
  getCompletedStories(): string[] {
    return Array.from(this.completedStories);
  }

  /**
   * Reset a specific story (for testing or replays)
   */
  resetStory(storyId: string): void {
    this.completedStories.delete(storyId);
    this.storyMetadata.delete(storyId);
    this.saveProgress();
  }

  // ── Patient Access Control ─────────────────────────────────────────────────

  /**
   * Check if a patient can be interacted with based on unlock requirements
   */
  canAccessPatient(patientRequirements?: string[]): boolean {
    if (!patientRequirements || patientRequirements.length === 0) {
      return true;
    }
    return patientRequirements.every(req => this.completedStories.has(req));
  }

  /**
   * Get list of locked patient IDs
   */
  getLockedPatients(allPatients: any[]): string[] {
    return allPatients
      .filter(p => !this.canAccessPatient(p.unlockRequirements))
      .map(p => p.id);
  }

  // ── Chapter Management ─────────────────────────────────────────────────────

  /**
   * Get current chapter
   */
  getCurrentChapter(): number {
    return this.currentChapter;
  }

  /**
   * Advance to next chapter
   */
  advanceChapter(): void {
    this.currentChapter++;
    this.saveProgress();
    console.log(`[StoryManager] Advanced to chapter ${this.currentChapter}`);
  }

  /**
   * Set chapter explicitly
   */
  setChapter(chapter: number): void {
    this.currentChapter = chapter;
    this.saveProgress();
  }

  // ── Progress Statistics ────────────────────────────────────────────────────

  /**
   * Get completion statistics
   */
  getStats(): {
    storiesCompleted: number;
    currentChapter: number;
    completionRate: number;
  } {
    // This could be enhanced to calculate against total available stories
    return {
      storiesCompleted: this.completedStories.size,
      currentChapter: this.currentChapter,
      completionRate: 0, // TODO: Calculate based on total stories
    };
  }

  // ── Save/Load ──────────────────────────────────────────────────────────────

  /**
   * Save progress to localStorage
   */
  saveProgress(): void {
    const data = {
      completedStories: Array.from(this.completedStories),
      currentChapter: this.currentChapter,
      metadata: Array.from(this.storyMetadata.entries()),
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('[StoryManager] Progress saved');
    } catch (error) {
      console.error('[StoryManager] Failed to save progress:', error);
    }
  }

  /**
   * Load progress from localStorage
   */
  loadProgress(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        console.log('[StoryManager] No saved progress found');
        return;
      }

      const data = JSON.parse(saved);
      this.completedStories = new Set(data.completedStories || []);
      this.currentChapter = data.currentChapter || 1;
      this.storyMetadata = new Map(data.metadata || []);
      
      console.log('[StoryManager] Progress loaded:', {
        stories: this.completedStories.size,
        chapter: this.currentChapter,
      });
    } catch (error) {
      console.error('[StoryManager] Failed to load progress:', error);
    }
  }

  /**
   * Clear all progress (reset game)
   */
  resetAllProgress(): void {
    this.completedStories.clear();
    this.storyMetadata.clear();
    this.currentChapter = 1;
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[StoryManager] All progress reset');
  }

  /**
   * Export progress as JSON string
   */
  exportProgress(): string {
    return JSON.stringify({
      completedStories: Array.from(this.completedStories),
      currentChapter: this.currentChapter,
      metadata: Array.from(this.storyMetadata.entries()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import progress from JSON string
   */
  importProgress(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      this.completedStories = new Set(data.completedStories || []);
      this.currentChapter = data.currentChapter || 1;
      this.storyMetadata = new Map(data.metadata || []);
      this.saveProgress();
      console.log('[StoryManager] Progress imported successfully');
      return true;
    } catch (error) {
      console.error('[StoryManager] Failed to import progress:', error);
      return false;
    }
  }
}

// Create singleton instance
export const storyManager = new StoryManager();
