import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, upsertUser, getUserStats } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  wins: number;
  losses: number;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setStats: (wins: number, losses: number) => void;
  initialize: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  wins: 0,
  losses: 0,
  loading: true,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setStats: (wins, losses) => {
    set({ wins, losses });
  },

  initialize: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });

    if (session?.user) {
      await upsertUser(session.user.id, session.user.email ?? '');
      const { data } = await getUserStats(session.user.id);
      if (data) set({ wins: data.wins, losses: data.losses });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        await upsertUser(session.user.id, session.user.email ?? '');
        const { data } = await getUserStats(session.user.id);
        if (data) set({ wins: data.wins, losses: data.losses });
      } else {
        set({ wins: 0, losses: 0 });
      }
    });

    set({ loading: false, initialized: true });
  },

  refreshStats: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await getUserStats(user.id);
    if (data) set({ wins: data.wins, losses: data.losses });
  },
}));
