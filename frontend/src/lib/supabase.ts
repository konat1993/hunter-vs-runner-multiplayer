import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function sendEmailOtp(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${config.siteUrl}/auth/callback`,
      shouldCreateUser: true,
    },
  });
}

export async function verifyEmailOtp(email: string, token: string) {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function upsertUser(userId: string, email: string) {
  return supabase
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id' })
    .select()
    .single();
}

export async function getUserStats(userId: string) {
  return supabase
    .from('users')
    .select('wins, losses')
    .eq('id', userId)
    .single();
}
