import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean and normalize Supabase project URL (stripping any accidental /rest/v1/ suffix, query params, etc.)
export const cleanSupabaseUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    // Origin cleanly strips /rest/v1 or any sub-path, yielding e.g. "https://xyz.supabase.co"
    return parsed.origin;
  } catch {
    return trimmed
      .replace(/\/rest\/v1.*$/i, '')
      .replace(/\/auth\/v1.*$/i, '')
      .replace(/\/storage\/v1.*$/i, '')
      .replace(/\/+$/, '');
  }
};

// Returns production redirect URL so confirmation/reset links direct to phdy.vercel.app
export const getAuthRedirectUrl = (route: string = '#login'): string => {
  const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
  
  if (typeof window === 'undefined') {
    return `https://phdy.vercel.app/${cleanRoute}`;
  }

  const hostname = window.location.hostname;
  // If already running on production domain or custom domain
  if (hostname.includes('phdy.vercel.app') || hostname.includes('phdy.org')) {
    return `${window.location.origin}/${cleanRoute}`;
  }

  // Always route auth verification links to production domain
  return `https://phdy.vercel.app/${cleanRoute}`;
};

// Retrieve environment variables with fallback to project config
const DEFAULT_SUPABASE_URL = 'https://icjbagncemlpibulbmkw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljamJhZ25jZW1scGlidWxibWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDQ4NzgsImV4cCI6MjEwNjY4MDg3OH0.dPQAs46Myjl6V6r1CfabsgUXS4wTxMFYSdv6N-n_Kl4';

const getRawEnvConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = cleanSupabaseUrl(metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_ANON_KEY || metaEnv.SUPABASE_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  return { envUrl, envKey };
};

// Get active configuration (checking runtime localStorage overrides first, then Vite env)
export const getSupabaseConfig = () => {
  const { envUrl, envKey } = getRawEnvConfig();
  let url = envUrl;
  let anonKey = envKey;
  let source: 'env' | 'localStorage' | 'unconfigured' = 'unconfigured';

  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('phdy_supabase_url');
    const localKey = localStorage.getItem('phdy_supabase_anon_key');
    if (localUrl && localKey) {
      const cleaned = cleanSupabaseUrl(localUrl);
      // Auto-correct local storage if it had /rest/v1
      if (cleaned !== localUrl) {
        localStorage.setItem('phdy_supabase_url', cleaned);
      }
      url = cleaned;
      anonKey = localKey.trim();
      source = 'localStorage';
    } else if (envUrl && envKey) {
      source = 'env';
    }
  } else if (envUrl && envKey) {
    source = 'env';
  }

  const isValid = Boolean(
    url && 
    anonKey && 
    !url.includes('your-project-id') && 
    !anonKey.includes('your-anon-key') &&
    url.startsWith('https://')
  );

  return { url, anonKey, isValid, source: isValid ? source : 'unconfigured' };
};

// Auto-hydrate credentials from server-side environment if client cache is empty
if (typeof window !== 'undefined') {
  fetch('/api/supabase-config')
    .then(r => r.json())
    .then(data => {
      if (data?.configured && data.url && data.anonKey) {
        const cleaned = cleanSupabaseUrl(data.url);
        const current = getSupabaseConfig();
        if (!current.isValid) {
          localStorage.setItem('phdy_supabase_url', cleaned);
          localStorage.setItem('phdy_supabase_anon_key', data.anonKey);
          recreateSupabaseClient();
          window.dispatchEvent(new CustomEvent('supabase-config-loaded'));
        }
      }
    })
    .catch(() => {});
}

// Check if valid Supabase configuration is present
export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isValid;
};

// Save credentials in browser storage for instant testing without server reload
export const setSupabaseRuntimeConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('phdy_supabase_url', url.trim());
    localStorage.setItem('phdy_supabase_anon_key', anonKey.trim());
    recreateSupabaseClient();
  }
};

export const clearSupabaseRuntimeConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('phdy_supabase_url');
    localStorage.removeItem('phdy_supabase_anon_key');
    recreateSupabaseClient();
  }
};

// Active client instance
let currentClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  if (!currentClient || !config.isValid) {
    currentClient = createClient(
      config.isValid ? config.url : 'https://placeholder.supabase.co',
      config.isValid ? config.anonKey : 'placeholder-anon-key'
    );
  }
  return currentClient;
};

export const recreateSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  currentClient = createClient(
    config.isValid ? config.url : 'https://placeholder.supabase.co',
    config.isValid ? config.anonKey : 'placeholder-anon-key'
  );
  return currentClient;
};

// Export proxy client for backward compatibility
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

// ============================================================================
// COMPREHENSIVE CONNECTION TEST & DIAGNOSTICS SUITE
// ============================================================================

export interface SupabaseTableStatus {
  name: string;
  accessible: boolean;
  count: number | null;
  error?: string;
}

export interface SupabaseStorageStatus {
  name: string;
  accessible: boolean;
  error?: string;
}

export interface SupabaseTestResult {
  connected: boolean;
  configured: boolean;
  url: string;
  source: 'env' | 'localStorage' | 'unconfigured';
  latencyMs: number;
  timestamp: string;
  authWorking: boolean;
  authMessage?: string;
  tables: Record<string, SupabaseTableStatus>;
  storage: Record<string, SupabaseStorageStatus>;
  rpcWorking: boolean;
  summary: string;
  recommendations: string[];
}

/**
 * Test the Supabase connection thoroughly.
 * Can be called with custom credentials to test before saving, or empty to test active setup.
 */
export const testSupabaseConnection = async (customUrl?: string, customKey?: string): Promise<SupabaseTestResult> => {
  const startTime = performance.now();
  const config = getSupabaseConfig();

  const testUrl = cleanSupabaseUrl(customUrl || config.url || '');
  const testKey = (customKey || config.anonKey || '').trim();

  const isConfigured = Boolean(
    testUrl && 
    testKey && 
    !testUrl.includes('your-project-id') && 
    !testKey.includes('your-anon-key') &&
    testUrl.startsWith('https://')
  );

  const result: SupabaseTestResult = {
    connected: false,
    configured: isConfigured,
    url: testUrl || 'Not configured',
    source: customUrl ? 'localStorage' : config.source,
    latencyMs: 0,
    timestamp: new Date().toLocaleTimeString(),
    authWorking: false,
    tables: {},
    storage: {},
    rpcWorking: false,
    summary: '',
    recommendations: []
  };

  if (!isConfigured) {
    result.summary = 'Supabase credentials are not set. The app is running in offline fallback mode.';
    result.recommendations.push('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or enter them in the UI tester.');
    result.recommendations.push('Visit supabase.com to create a free project if you do not have one yet.');
    return result;
  }

  // Create temporary test client
  const testClient = createClient(testUrl, testKey, {
    auth: { persistSession: false }
  });

  // 1. Test Auth / Core API Connectivity
  try {
    const authStart = performance.now();
    const { error: authErr } = await testClient.auth.getSession();
    result.latencyMs = Math.round(performance.now() - authStart);
    
    if (authErr) {
      result.authWorking = false;
      result.authMessage = authErr.message;
      result.recommendations.push(`Auth check failed: ${authErr.message}`);
    } else {
      result.authWorking = true;
      result.connected = true;
    }
  } catch (err: any) {
    result.authWorking = false;
    result.authMessage = err?.message || 'Network request failed';
    result.recommendations.push(`Connection failed: Check if ${testUrl} is valid and reachable.`);
    result.latencyMs = Math.round(performance.now() - startTime);
    result.summary = `Failed to connect to Supabase: ${err?.message || 'Network error'}`;
    return result;
  }

  // 2. Test Tables Accessibility
  const tablesToTest = [
    'phdy_fund_transactions',
    'membership_requests',
    'members_directory',
    'village_panchayat_accounting',
    'landmarks'
  ];

  for (const tableName of tablesToTest) {
    try {
      const { data, count, error } = await testClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        // PostgREST code 42P01 is table does not exist
        result.tables[tableName] = {
          name: tableName,
          accessible: false,
          count: null,
          error: error.message
        };
      } else {
        result.tables[tableName] = {
          name: tableName,
          accessible: true,
          count: count ?? 0
        };
      }
    } catch (tblErr: any) {
      result.tables[tableName] = {
        name: tableName,
        accessible: false,
        count: null,
        error: tblErr?.message || 'Query failed'
      };
    }
  }

  // 3. Test Storage Buckets
  const bucketsToTest = ['phdy-receipts', 'member-photos'];
  for (const bucketName of bucketsToTest) {
    try {
      const { data: bucket, error } = await testClient.storage.getBucket(bucketName);
      if (error || !bucket) {
        // Try fallback list check
        const { error: listErr } = await testClient.storage.from(bucketName).list();
        if (listErr) {
          result.storage[bucketName] = {
            name: bucketName,
            accessible: false,
            error: error?.message || listErr.message
          };
        } else {
          result.storage[bucketName] = {
            name: bucketName,
            accessible: true
          };
        }
      } else {
        result.storage[bucketName] = {
          name: bucketName,
          accessible: true
        };
      }
    } catch (storageErr: any) {
      result.storage[bucketName] = {
        name: bucketName,
        accessible: false,
        error: storageErr?.message || 'Bucket query failed'
      };
    }
  }

  // 4. Test RPC functions
  try {
    const { error: rpcErr } = await testClient.rpc('get_landmarks_geojson');
    result.rpcWorking = !rpcErr;
  } catch {
    result.rpcWorking = false;
  }

  // Calculate final status and summary
  const tableSuccessCount = Object.values(result.tables).filter(t => t.accessible).length;
  const storageSuccessCount = Object.values(result.storage).filter(s => s.accessible).length;

  if (tableSuccessCount === tablesToTest.length && storageSuccessCount === bucketsToTest.length) {
    result.connected = true;
    result.summary = `Connected successfully to Supabase! All ${tablesToTest.length} tables and ${bucketsToTest.length} storage buckets are ready. (${result.latencyMs}ms)`;
  } else if (tableSuccessCount > 0 || result.authWorking) {
    result.connected = true;
    result.summary = `Connected to Supabase endpoint (${result.latencyMs}ms), but some tables or buckets need initialization.`;
    if (tableSuccessCount < tablesToTest.length) {
      result.recommendations.push(`Run the provided SQL schema in Supabase SQL Editor to create missing tables (${tablesToTest.length - tableSuccessCount} missing).`);
    }
    if (storageSuccessCount < bucketsToTest.length) {
      result.recommendations.push('Create storage buckets "phdy-receipts" and "member-photos" under Supabase Storage.');
    }
  } else {
    result.connected = false;
    result.summary = 'Could not authenticate or query Supabase tables. Check your anon public key and RLS policies.';
  }

  // Log friendly colorized report in browser console
  if (typeof console !== 'undefined') {
    const statusIcon = result.connected ? '✅' : '❌';
    console.group(`%c${statusIcon} Supabase Connection Diagnostic Report (${result.latencyMs}ms)`, 'font-weight: bold; font-size: 14px; color: #10b981;');
    console.log('Project URL:', result.url);
    console.log('Config Source:', result.source);
    console.log('Auth Working:', result.authWorking);
    console.log('Summary:', result.summary);
    console.table(
      Object.entries(result.tables).map(([table, stat]) => ({
        Table: table,
        Status: stat.accessible ? 'ONLINE' : 'MISSING / RESTRICTED',
        Rows: stat.count ?? 'N/A',
        Error: stat.error || '-'
      }))
    );
    console.table(
      Object.entries(result.storage).map(([bucket, stat]) => ({
        Bucket: bucket,
        Status: stat.accessible ? 'ONLINE' : 'MISSING / RESTRICTED',
        Error: stat.error || '-'
      }))
    );
    if (result.recommendations.length > 0) {
      console.warn('Action Items:', result.recommendations);
    }
    console.groupEnd();
  }

  return result;
};

// Expose diagnostic function on window for immediate F12 developer console access
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
  (window as any).getSupabaseConfig = getSupabaseConfig;
  (window as any).setSupabaseRuntimeConfig = setSupabaseRuntimeConfig;
  (window as any).clearSupabaseRuntimeConfig = clearSupabaseRuntimeConfig;
}

// ============================================================================
// 1. PHDY INTERNAL TREASURY & FUNDS SERVICE
// ============================================================================
export const phdyFundsService = {
  // Fetch all transactions ordered by date descending
  async getTransactions() {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('phdy_fund_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.warn('[Supabase] Error fetching transactions:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('[Supabase] Exception in getTransactions:', err.message);
      return null;
    }
  },

  // Add a new fund transaction
  async addTransaction(tx: {
    id: string;
    transaction_date: string;
    contributor_or_payee: string;
    type: 'Credit' | 'Debit';
    amount: number;
    purpose: string;
    category?: string;
    payment_mode?: string;
    receipt_voucher_url?: string;
    balance_after?: number;
    notes?: string;
  }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL.');
    }
    const { data, error } = await supabase
      .from('phdy_fund_transactions')
      .insert([tx])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a fund transaction
  async deleteTransaction(id: string) {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from('phdy_fund_transactions')
        .delete()
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Upload bill / receipt to Supabase Storage bucket 'phdy-receipts'
  async uploadReceipt(file: File) {
    if (!isSupabaseConfigured()) return null;
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `vouchers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('phdy-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.warn('[Supabase Storage] Error uploading receipt:', uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('phdy-receipts').getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (err: any) {
      console.warn('[Supabase Storage] Upload exception:', err.message);
      return null;
    }
  }
};

// ============================================================================
// 2. MEMBERSHIP & USER REGISTRATION SERVICE
// ============================================================================
export const membershipService = {
  // Submit a new join request from Contact / Join Us page
  async submitJoinRequest(formData: {
    fullName: string;
    phone: string;
    email?: string;
    dob?: string;
    age?: number;
    gender?: string;
    education?: string;
    address?: string;
    motivation?: string;
    photoFile?: File | null;
  }) {
    let uploadedPhotoUrl = '';

    // If photo file provided and Supabase is configured, upload to 'member-photos' bucket
    if (formData.photoFile && isSupabaseConfigured()) {
      try {
        const fileExt = formData.photoFile.name.split('.').pop() || 'jpg';
        const fileName = `member_${Date.now()}_${formData.phone}.${fileExt}`;
        const filePath = `applicants/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(filePath, formData.photoFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('member-photos').getPublicUrl(filePath);
          uploadedPhotoUrl = data?.publicUrl || '';
        }
      } catch (err) {
        console.warn('[Supabase Storage] Member photo upload skipped:', err);
      }
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('membership_requests')
        .insert([{
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email || null,
          education: formData.education || null,
          address: formData.address || null,
          motivation: formData.motivation || null,
          photo_url: uploadedPhotoUrl || null,
          status: 'Pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    }

    return { success: false, reason: 'unconfigured' };
  },

  // Get active approved members from members table
  async getActiveMembers() {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active');

      if (!error && data) {
        return data.map(m => ({
          id: m.id,
          name: m.full_name || 'Member',
          role: 'Active Member',
          qualification: m.qualification || m.date_of_birth || '',
          mobile: m.phone || '',
          photo_url: m.photo_url || '',
          is_active: true
        }));
      }
    } catch {}

    return [];
  },

  // Get all membership applications / join requests
  async getMembershipRequests() {
    if (!isSupabaseConfigured()) return null;
    try {
      // Try with submitted_at
      let { data, error } = await supabase
        .from('membership_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error || !data) {
        const res2 = await supabase
          .from('membership_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!res2.error && res2.data) {
          return res2.data;
        }
        const res3 = await supabase
          .from('membership_requests')
          .select('*');
        if (!res3.error && res3.data) {
          return res3.data;
        }
        return null;
      }
      return data;
    } catch {
      try {
        const { data } = await supabase.from('membership_requests').select('*');
        return data || null;
      } catch {
        return null;
      }
    }
  },

  // Update a join request status ('Pending', 'Approved', 'Rejected')
  async updateRequestStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected') {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from('membership_requests')
        .update({ status })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Approve a join request and promote to official members table
  async approveAndCreateMember(req: {
    requestId?: string;
    email?: string;
    phone?: string;
    name: string;
    role?: string;
    qualification?: string;
    mobile?: string;
    photo_url?: string;
  }) {
    if (!isSupabaseConfigured()) return false;
    try {
      if (req.requestId) {
        await supabase
          .from('membership_requests')
          .update({ status: 'approved' })
          .eq('id', req.requestId);
        await supabase
          .from('membership_requests')
          .update({ status: 'Approved' })
          .eq('id', req.requestId);
      }
      if (req.email) {
        await supabase
          .from('membership_requests')
          .update({ status: 'approved' })
          .eq('email', req.email);
        await supabase
          .from('membership_requests')
          .update({ status: 'Approved' })
          .eq('email', req.email);
      }
      if (req.phone) {
        await supabase
          .from('membership_requests')
          .update({ status: 'approved' })
          .eq('phone', req.phone);
        await supabase
          .from('membership_requests')
          .update({ status: 'Approved' })
          .eq('phone', req.phone);
      }

      await supabase
        .from('members')
        .insert([{
          full_name: req.name,
          qualification: req.qualification || null,
          phone: req.mobile || null,
          photo_url: req.photo_url || null,
          status: 'active'
        }]);

      return true;
    } catch {
      return false;
    }
  },

  // Add a member directly into members table
  async addMember(member: {
    name: string;
    role?: string;
    qualification?: string;
    mobile?: string;
    photo_url?: string;
  }) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{
          full_name: member.name,
          qualification: member.qualification || null,
          phone: member.mobile || null,
          photo_url: member.photo_url || null,
          status: 'active'
        }])
        .select()
        .single();
      if (!error && data) return { id: data.id, name: data.full_name, role: 'Active Member', qualification: data.qualification, mobile: data.phone, photo_url: data.photo_url, is_active: true };
    } catch {}

    return null;
  },

  // Remove a member from members table
  async deleteMember(id: string) {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (!error) return true;
    } catch {}

    return false;
  }
};

// ============================================================================
// 3. VILLAGE GRAM PANCHAYAT ACCOUNTING SERVICE
// ============================================================================
export const villageAccountingService = {
  // Fetch vouchers for a specific financial year
  async getVouchersByYear(financialYear: string) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('village_panchayat_accounting')
        .select('*')
        .eq('financial_year', financialYear)
        .order('id', { ascending: true });

      if (error) {
        console.warn('[Supabase] Error fetching accounting records:', error.message);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  // Alias for getVouchersByYear
  async getAccountingVouchers(financialYear: string) {
    return this.getVouchersByYear(financialYear);
  },

  // Add a new accounting voucher
  async addVoucher(voucher: {
    financial_year: string;
    month: string;
    type: 'Income' | 'Expenditure';
    description: string;
    voucher_id?: string;
    pdf_url?: string;
    amount?: number;
  }) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('village_panchayat_accounting')
        .insert([voucher])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Supabase] addVoucher error:', e);
      return null;
    }
  },

  // Delete an accounting voucher
  async deleteVoucher(id: number | string) {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from('village_panchayat_accounting')
        .delete()
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Bulk seed/insert vouchers from Account_config.json into Supabase
  async seedVouchers(vouchers: Array<{
    financial_year: string;
    month: string;
    type: 'Income' | 'Expenditure';
    description: string;
    voucher_id?: string;
    pdf_url?: string;
    amount?: number;
  }>) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('village_panchayat_accounting')
      .insert(vouchers);

    if (error) throw error;
    return data;
  }
};

// ============================================================================
// 4. VILLAGE GIS LANDMARKS SERVICE
// ============================================================================
export const landmarksService = {
  // Fetch GeoJSON FeatureCollection directly from Supabase
  async getLandmarksFeatureCollection() {
    if (!isSupabaseConfigured()) return null;
    try {
      // 1. Try stored procedure if created
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_landmarks_geojson');
      if (!rpcError && rpcData) {
        return rpcData;
      }

      // 2. Direct table select fallback
      const { data: rows, error: selectError } = await supabase
        .from('landmarks')
        .select('id, name, type, category, latitude, longitude, properties');

      if (selectError || !rows) return null;

      return {
        type: 'FeatureCollection',
        name: 'Pedda_harivanam_point',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: rows.map((r: any) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [r.longitude, r.latitude]
          },
          properties: {
            id: r.id,
            Name: r.name,
            type: r.type,
            category: r.category,
            ...(r.properties || {})
          }
        }))
      };
    } catch {
      return null;
    }
  }
};
