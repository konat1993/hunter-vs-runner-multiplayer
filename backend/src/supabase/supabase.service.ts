import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient<Database, 'public', 'public'>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
      );
    }

    this.client = createClient<Database, 'public', 'public'>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getClient(): SupabaseClient<Database, 'public', 'public'> {
    return this.client;
  }

  async verifyToken(token: string) {
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) throw new Error('Invalid token');
    return data.user;
  }

  async upsertUser(userId: string, email: string) {
    return this.client
      .from('users')
      .upsert({ id: userId, email }, { onConflict: 'id' });
  }

  async recordGameResult(
    winnerId: string,
    loserId: string,
    durationMs: number,
    endedReason: string,
  ) {
    const { error: insertError } = await this.client
      .from('game_results')
      .insert({
        winner_id: winnerId,
        loser_id: loserId,
        duration_ms: durationMs,
        ended_reason: endedReason,
      });

    if (insertError) {
      console.error('Failed to insert game_result:', insertError);
      return;
    }

    // Increment wins for winner
    await this.client.rpc('increment_wins', { user_id: winnerId });
    // Increment losses for loser
    await this.client.rpc('increment_losses', { user_id: loserId });
  }
}
