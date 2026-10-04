import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Server, 
  Table, 
  FolderLock, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  setSupabaseRuntimeConfig, 
  clearSupabaseRuntimeConfig,
  cleanSupabaseUrl,
  SupabaseTestResult,
  SupabaseTableStatus,
  SupabaseStorageStatus
} from '../lib/supabaseClient';

interface SupabaseConnectionTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Enable PostGIS & UUID extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PHDY Internal Fund Transactions
CREATE TABLE IF NOT EXISTS phdy_fund_transactions (
    id VARCHAR(50) PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contributor_or_payee VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('Credit', 'Debit')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    purpose TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    payment_mode VARCHAR(50) DEFAULT 'UPI / Online',
    receipt_voucher_url TEXT,
    balance_after NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Membership Join Requests & Directory
CREATE TABLE IF NOT EXISTS membership_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    education VARCHAR(255),
    address TEXT,
    motivation TEXT,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Active Member',
    qualification VARCHAR(255),
    mobile VARCHAR(20),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Village Panchayat Accounting (eGramSwaraj Vouchers)
CREATE TABLE IF NOT EXISTS village_panchayat_accounting (
    id SERIAL PRIMARY KEY,
    financial_year VARCHAR(20) NOT NULL,
    month VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Income', 'Expenditure')),
    description TEXT NOT NULL,
    voucher_id VARCHAR(100),
    pdf_url TEXT,
    amount NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Village GIS Landmarks (PostGIS)
CREATE TABLE IF NOT EXISTS landmarks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    category VARCHAR(100),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-sync geom from latitude & longitude
CREATE OR REPLACE FUNCTION sync_landmark_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_landmark_geom ON landmarks;
CREATE TRIGGER trg_sync_landmark_geom
BEFORE INSERT OR UPDATE ON landmarks
FOR EACH ROW EXECUTE FUNCTION sync_landmark_geom();

-- 6. Enable Public Read Permissions (Row Level Security)
ALTER TABLE phdy_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE members_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE village_panchayat_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read phdy_fund_transactions" ON phdy_fund_transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert phdy_fund_transactions" ON phdy_fund_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read membership_requests" ON membership_requests FOR SELECT USING (true);
CREATE POLICY "Public Insert membership_requests" ON membership_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read members_directory" ON members_directory FOR SELECT USING (true);
CREATE POLICY "Public Read village_panchayat_accounting" ON village_panchayat_accounting FOR SELECT USING (true);
CREATE POLICY "Public Read landmarks" ON landmarks FOR SELECT USING (true);
`;

export const SupabaseConnectionTester: React.FC<SupabaseConnectionTesterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'credentials' | 'sql'>('status');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SupabaseTestResult | null>(null);
  
  // Custom credentials inputs
  const currentConfig = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(currentConfig.url || '');
  const [customKey, setCustomKey] = useState(currentConfig.anonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-run test once opened
  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      if (cfg.isValid) {
        setCustomUrl(cfg.url);
        setCustomKey(cfg.anonKey);
        handleRunTest(cfg.url, cfg.anonKey);
      } else {
        // Attempt immediate server fetch
        fetch('/api/supabase-config')
          .then(r => r.json())
          .then(data => {
            if (data?.configured && data.url && data.anonKey) {
              setCustomUrl(data.url);
              setCustomKey(data.anonKey);
              setSupabaseRuntimeConfig(data.url, data.anonKey);
              handleRunTest(data.url, data.anonKey);
            } else {
              handleRunTest();
            }
          })
          .catch(() => handleRunTest());
      }
    }

    const onLoaded = () => {
      const updated = getSupabaseConfig();
      if (updated.isValid) {
        setCustomUrl(updated.url);
        setCustomKey(updated.anonKey);
        handleRunTest(updated.url, updated.anonKey);
      }
    };

    window.addEventListener('supabase-config-loaded', onLoaded);
    return () => window.removeEventListener('supabase-config-loaded', onLoaded);
  }, [isOpen]);

  const handleRunTest = async (testUrl?: string, testKey?: string) => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const result = await testSupabaseConnection(testUrl, testKey);
      setTestResult(result);
    } catch (err: any) {
      console.error('Test execution failed:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveRuntimeCredentials = () => {
    if (!customUrl.trim() || !customKey.trim()) {
      setStatusMessage('Please enter both Supabase Project URL and Anon Public Key.');
      return;
    }
    const cleaned = cleanSupabaseUrl(customUrl);
    if (!cleaned.startsWith('https://')) {
      setStatusMessage('Project URL must start with https://');
      return;
    }
    setCustomUrl(cleaned);
    setSupabaseRuntimeConfig(cleaned, customKey.trim());
    setStatusMessage('Credentials saved to browser session! Testing now...');
    handleRunTest(cleaned, customKey.trim());
  };

  const handleClearRuntimeCredentials = () => {
    clearSupabaseRuntimeConfig();
    setCustomUrl('');
    setCustomKey('');
    setStatusMessage('Runtime credentials cleared. Reset to default/env state.');
    handleRunTest();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyEnv = () => {
    const envSnippet = `VITE_SUPABASE_URL=${customUrl || 'https://your-project-id.supabase.co'}\nVITE_SUPABASE_ANON_KEY=${customKey || 'your-anon-key'}\n`;
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Supabase Connection Diagnostics
                <span className="text-xs bg-emerald-800/60 text-emerald-100 font-mono px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Step 4 Verification
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Verify database connectivity, PostgREST API, tables & cloud storage
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-5 pt-3 space-x-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="w-4 h-4" />
            Live Status & Test
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'credentials'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="w-4 h-4" />
            Configure / Override
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table className="w-4 h-4" />
            SQL Schema Helper
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          
          {/* TAB 1: LIVE STATUS & DIAGNOSTICS */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              
              {/* Top Summary Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                testResult?.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : testResult?.configured
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <div className="mt-1">
                  {isTesting ? (
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                  ) : testResult?.connected ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : testResult?.configured ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Database className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">
                      {isTesting 
                        ? 'Testing Supabase Connection...' 
                        : testResult?.connected 
                        ? 'Supabase is Connected & Operational!' 
                        : testResult?.configured 
                        ? 'Connected to API, Missing Database Schema' 
                        : 'Supabase Not Configured (Using Offline / Sheets Fallback)'}
                    </h3>
                    {testResult?.latencyMs ? (
                      <span className="text-xs font-mono bg-white/80 px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                        {testResult.latencyMs} ms
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm mt-1 text-gray-600">
                    {testResult?.summary || 'Checking endpoint reachability and database tables...'}
                  </p>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-between">
                  <span className="text-gray-500 font-medium">Supabase Project URL:</span>
                  <span className="font-mono text-gray-900 font-semibold truncate mt-1">
                    {testResult?.url || 'Not set'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-between">
                  <span className="text-gray-500 font-medium">Configuration Source:</span>
                  <span className="font-semibold text-gray-900 mt-1 capitalize">
                    {testResult?.source === 'env' 
                      ? 'Environment File (.env)' 
                      : testResult?.source === 'localStorage'
                      ? 'Browser Storage Override'
                      : 'None (Placeholder / Fallback Mode)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRunTest()}
                  disabled={isTesting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Running Diagnostics...' : 'Re-test Connection'}
                </button>
                <button
                  onClick={() => setActiveTab('credentials')}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <Key className="w-4 h-4 text-gray-500" />
                  Change Credentials
                </button>
              </div>

              {/* Tables Diagnostic Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-600" />
                    Database Tables Status
                  </span>
                  <span className="text-[11px] normal-case font-normal text-gray-500">
                    Required for Portal Features
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {testResult && Object.keys(testResult.tables).length > 0 ? (
                    (Object.entries(testResult.tables) as [string, SupabaseTableStatus][]).map(([tableName, stat]) => (
                      <div key={tableName} className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-gray-50">
                        <div className="flex items-center gap-2.5">
                          {stat.accessible ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-mono text-xs font-semibold text-gray-800">{tableName}</span>
                            {stat.error && (
                              <p className="text-[11px] text-red-600 font-mono mt-0.5">{stat.error}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                          stat.accessible 
                            ? 'bg-emerald-100 text-emerald-800 font-medium' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {stat.accessible ? `${stat.count ?? 0} rows` : 'Missing Table'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500">
                      {isTesting ? 'Checking tables...' : 'No tables checked. Configure Supabase credentials to test.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Storage Buckets Status */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderLock className="w-4 h-4 text-emerald-600" />
                    Supabase Storage Buckets
                  </span>
                  <span className="text-[11px] normal-case font-normal text-gray-500">
                    File & Receipt Uploads
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {testResult && Object.keys(testResult.storage).length > 0 ? (
                    (Object.entries(testResult.storage) as [string, SupabaseStorageStatus][]).map(([bucketName, stat]) => (
                      <div key={bucketName} className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-gray-50">
                        <div className="flex items-center gap-2.5">
                          {stat.accessible ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs font-semibold text-gray-800">{bucketName}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                          stat.accessible 
                            ? 'bg-emerald-100 text-emerald-800 font-medium' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {stat.accessible ? 'Ready' : 'Bucket Not Found'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500">
                      {isTesting ? 'Checking storage...' : 'Storage check pending.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Developer Console Tip */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Developer Console Command:</span>
                  <p className="mt-0.5 text-blue-800">
                    You can also test directly in your browser console by pressing <kbd className="px-1.5 py-0.5 bg-blue-100 border border-blue-300 rounded font-mono">F12</kbd> &rarr; <span className="font-semibold">Console</span> and running:
                  </p>
                  <code className="inline-block mt-1 bg-blue-900 text-white font-mono px-2 py-1 rounded text-[11px] selection:bg-blue-600">
                    await testSupabaseConnection()
                  </code>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CREDENTIALS & RUNTIME CONFIG */}
          {activeTab === 'credentials' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">How to obtain your Supabase credentials:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Log in to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Click on your project, then open <span className="font-medium text-gray-800">Project Settings</span> (gear icon in sidebar)</li>
                  <li>Click <span className="font-medium text-gray-800">API</span> in the left sub-menu</li>
                  <li>Copy <span className="font-mono font-medium">Project URL</span> and <span className="font-mono font-medium">anon / public key</span></li>
                </ol>
              </div>

              {/* Vercel Environment Variables Guidance */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 text-amber-950 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Adding to Vercel? Notice about &quot;Change variable to Config&quot;
                </p>
                <p className="text-amber-800 mb-2 leading-relaxed">
                  When adding <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> in Vercel, Vercel warns: 
                  <em> &quot;Public prefixes expose values to the browser. If that’s safe, change the variable to Config&quot;</em>.
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 space-y-1.5 text-amber-900">
                  <p className="font-semibold">Two simple ways to resolve this in Vercel:</p>
                  <p><strong>Option 1 (Recommended):</strong> Change the Vercel variable type dropdown from <strong>&quot;Sensitive&quot;</strong> to <strong>&quot;Config&quot;</strong> (or Plain text). This is 100% safe because Supabase anon keys are public client keys protected by database Row Level Security.</p>
                  <p><strong>Option 2:</strong> You can also name them <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">SUPABASE_URL</code> and <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">SUPABASE_ANON_KEY</code> (without the VITE_ prefix). The app now automatically detects both!</p>
                </div>
              </div>

              {statusMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {statusMessage}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Supabase Anon / Public Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showKey ? 'Hide Key' : 'Show Key'}
                    </button>
                  </div>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveRuntimeCredentials}
                  disabled={isTesting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save & Test Connection Now
                </button>
                <button
                  type="button"
                  onClick={handleCopyEnv}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {copiedEnv ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedEnv ? 'Copied .env' : 'Copy .env Format'}
                </button>
                <button
                  type="button"
                  onClick={handleClearRuntimeCredentials}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                >
                  Reset / Clear
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA HELPER */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Database Initialization Script</h4>
                  <p className="text-xs text-gray-500">
                    If tables are missing, copy this script and execute it in your Supabase SQL Editor.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied SQL!' : 'Copy Entire SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-gray-800">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              testResult?.connected 
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-amber-400'
            }`} />
            <span>
              {testResult?.connected ? 'Supabase Active' : 'Offline / Fallback Mode'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
