import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface LeaderboardEntry {
  name: string;
  score: number;
}

interface SupabaseScore {
  id: string;
  name: string;
  score: number;
  created_at: string;
}

// Local storage fallback
const LOCAL_STORAGE_KEY = 'astro.local.leaderboard';
const MAX_LOCAL_SCORES = 10;

class LocalLeaderboard {
  private scores: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        this.scores = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load local leaderboard:', e);
    }
  }

  private save(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.scores));
    } catch (e) {
      console.warn('Failed to save local leaderboard:', e);
    }
  }

  async submitScore(entry: LeaderboardEntry): Promise<void> {
    // Add new score
    this.scores.push(entry);

    // Sort by score descending
    this.scores.sort((a, b) => b.score - a.score);

    // Keep only top scores
    this.scores = this.scores.slice(0, MAX_LOCAL_SCORES);

    this.save();
  }

  async fetchTop(limit: number = 10): Promise<LeaderboardEntry[]> {
    return this.scores.slice(0, limit);
  }
}

class SupabaseLeaderboard {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  async submitScore(entry: LeaderboardEntry): Promise<void> {
    const { error } = await this.client
      .from('astro_scores')
      .insert([{
        name: entry.name,
        score: entry.score
      }]);

    if (error) {
      console.warn('Supabase leaderboard submission failed:', error);
      throw error;
    }
  }

  async fetchTop(limit: number = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('astro_scores')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase leaderboard fetch failed:', error);
      throw error;
    }

    return data || [];
  }
}

class LeaderboardManager {
  private provider: SupabaseLeaderboard | LocalLeaderboard;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log('Using Supabase leaderboard');
      this.provider = new SupabaseLeaderboard(supabaseUrl, supabaseKey);
    } else {
      console.log('Using local leaderboard fallback');
      this.provider = new LocalLeaderboard();
    }
  }

  async submitScore(name: string, score: number): Promise<void> {
    if (!name || name.length < 1 || name.length > 12) {
      throw new Error('Name must be 1-12 characters');
    }

    if (score < 0) {
      throw new Error('Score must be non-negative');
    }

    return this.provider.submitScore({ name, score });
  }

  async fetchTop(limit: number = 10): Promise<LeaderboardEntry[]> {
    return this.provider.fetchTop(limit);
  }

  isSupabaseAvailable(): boolean {
    return this.provider instanceof SupabaseLeaderboard;
  }
}

// Global instance
export const leaderboard = new LeaderboardManager();

export type { LeaderboardEntry };

