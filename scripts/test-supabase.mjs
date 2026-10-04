// Standalone script to test Supabase connection from terminal
// Usage: node scripts/test-supabase.mjs [SUPABASE_URL] [SUPABASE_ANON_KEY]

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Attempt to read from .env if present
let envUrl = process.env.VITE_SUPABASE_URL || '';
let envKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      envUrl = trimmed.split('=')[1]?.trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      envKey = trimmed.split('=')[1]?.trim();
    }
  }
}

// Override with CLI arguments if provided
const cliUrl = process.argv[2] || envUrl;
const cliKey = process.argv[3] || envKey;

console.log('='.repeat(60));
console.log('  PHDY Portal - Supabase Connection Health Check');
console.log('='.repeat(60));
console.log('Target URL:', cliUrl || '(Not specified)');
console.log('Anon Key  :', cliKey ? `${cliKey.substring(0, 16)}...` : '(Not specified)');
console.log('-'.repeat(60));

if (!cliUrl || !cliKey || cliUrl.includes('your-project-id')) {
  console.log('❌ Error: Supabase credentials are missing or default placeholder.');
  console.log('Please provide them via arguments or set in .env:');
  console.log('  node scripts/test-supabase.mjs https://YOUR_ID.supabase.co YOUR_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(cliUrl, cliKey);

async function runDiagnostics() {
  const start = Date.now();

  // 1. Auth Ping
  try {
    const { error: authErr } = await supabase.auth.getSession();
    const pingTime = Date.now() - start;
    if (authErr) {
      console.log(`❌ Auth endpoint responded with error: ${authErr.message} (${pingTime}ms)`);
    } else {
      console.log(`✅ Base API & Auth ping successful (${pingTime}ms)`);
    }
  } catch (err) {
    console.log(`❌ Network connection failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Tables Check
  const tables = [
    'phdy_fund_transactions',
    'membership_requests',
    'members_directory',
    'village_panchayat_accounting',
    'landmarks'
  ];

  console.log('\nChecking Database Tables:');
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ❌ [${table}]: Missing or Access Denied (${error.message})`);
      } else {
        console.log(`  ✅ [${table}]: Online (${count ?? 0} records)`);
      }
    } catch (e) {
      console.log(`  ❌ [${table}]: Query failed (${e.message})`);
    }
  }

  // 3. Storage Buckets Check
  const buckets = ['phdy-receipts', 'member-photos'];
  console.log('\nChecking Storage Buckets:');
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (error || !data) {
        console.log(`  ⚠️  Bucket [${bucket}]: Not created yet or private (${error?.message || 'Not found'})`);
      } else {
        console.log(`  ✅ Bucket [${bucket}]: Ready (Public: ${data.public ? 'Yes' : 'No'})`);
      }
    } catch (e) {
      console.log(`  ⚠️  Bucket [${bucket}]: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Diagnostics Completed.');
  console.log('='.repeat(60));
  process.exit(0);
}

runDiagnostics();
