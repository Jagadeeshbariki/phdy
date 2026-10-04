import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined') {
    const metaEnv = (import.meta as any).env || {};
    return metaEnv[key] || '';
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://icjbagncemlpibulbmkw.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljamJhZ25jZW1scGlidWxibWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDQ4NzgsImV4cCI6MjEwNjY4MDg3OH0.dPQAs46Myjl6V6r1CfabsgUXS4wTxMFYSdv6N-n_Kl4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
