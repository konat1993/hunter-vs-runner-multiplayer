export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
        };
        Insert: {
          id: string;
          email: string;
        };
        Update: {
          id?: string;
          email?: string;
        };
        Relationships: [];
      };
      game_results: {
        Row: {
          winner_id: string;
          loser_id: string;
          duration_ms: number;
          ended_reason: string;
        };
        Insert: {
          winner_id: string;
          loser_id: string;
          duration_ms: number;
          ended_reason: string;
        };
        Update: {
          winner_id?: string;
          loser_id?: string;
          duration_ms?: number;
          ended_reason?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_wins: {
        Args: { user_id: string };
        Returns: Json;
      };
      increment_losses: {
        Args: { user_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
