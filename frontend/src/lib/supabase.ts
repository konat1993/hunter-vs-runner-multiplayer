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

export async function signOut() {
  return supabase.auth.signOut();
}

/** Maps Supabase Auth errors to clearer copy; rate limits are enforced server-side. */
export function formatAuthErrorMessage(error: { message?: string } | null): string {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('email rate limit')
  ) {
    return (
      'Email send limit reached (Supabase Auth). Wait up to an hour, avoid repeated "Resend", ' +
      'or in Supabase: Authentication → Rate Limits — raise OTP/email limits; built-in email also has an hourly cap (custom SMTP unlocks higher limits).'
    );
  }
  return raw || 'Sign-in failed.';
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
