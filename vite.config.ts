import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function cleanSupabaseUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/rest\/v1.*$/i, '').replace(/\/+$/, '');
  }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const resolvedUrl = cleanSupabaseUrl(
      process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.SUPABASE_URL || ''
    );
    const resolvedKey = (
      process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || env.SUPABASE_KEY || ''
    ).trim();

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolvedKey),
        'import.meta.env.SUPABASE_URL': JSON.stringify(resolvedUrl),
        'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(resolvedKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
