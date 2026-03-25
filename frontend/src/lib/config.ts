const colyseusEndpoint =
  (import.meta.env.VITE_COLYSEUS_ENDPOINT as string) || 'ws://localhost:2567';

const backendHttpEndpoint =
  (import.meta.env.VITE_BACKEND_HTTP_ENDPOINT as string) ||
  colyseusEndpoint.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  colyseusEndpoint,
  backendHttpEndpoint,
  siteUrl: (import.meta.env.VITE_SITE_URL as string) || 'http://localhost:5173',
} as const;
