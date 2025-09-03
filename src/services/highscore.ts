// High score persistence service for ASTRO
// Handles localStorage persistence with namespace isolation

const STORAGE_KEY = 'astro_highscore_v1';

/**
 * Get the current high score from localStorage
 * @returns The high score, or 0 if none exists
 */
export function getHighScore(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to read high score from localStorage:', error);
    return 0;
  }
}

/**
 * Set a new high score in localStorage
 * @param score The new high score to store
 */
export function setHighScore(score: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, score.toString());
  } catch (error) {
    console.warn('Failed to save high score to localStorage:', error);
  }
}

/**
 * Try to update the high score if the given score is higher
 * @param finalScore The final score from a game session
 * @returns Object indicating if it was a new best and the current best score
 */
export function tryUpdateHighScore(finalScore: number): { isNew: boolean; best: number } {
  const currentBest = getHighScore();

  if (finalScore > currentBest) {
    setHighScore(finalScore);
    return { isNew: true, best: finalScore };
  }

  return { isNew: false, best: currentBest };
}

/**
 * Reset the high score (for testing/debugging)
 */
export function resetHighScore(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset high score:', error);
  }
}

// TODO: Add Supabase sync capability
// export async function syncToSupabase(finalScore: number): Promise<void> {
//   // Implementation for syncing to Supabase leaderboard
// }
