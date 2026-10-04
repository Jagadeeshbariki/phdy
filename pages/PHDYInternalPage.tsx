import React, { useState, useEffect, useMemo } from 'react';
import { LoggedInUser, Page } from '../App';
import { PHDYFundTransaction } from '../types';
import { INITIAL_PHDY_FUNDS, PHDY_INTERNAL_RESOLUTIONS, PHDY_INTERNAL_ASSETS } from '../PHDYFundsData';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Plus, 
  FileText, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  HelpCircle, 
  X, 
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  User,
  Tag,
  Lock,
  ShieldCheck,
  KeyRound,
  LogOut,
  Copy,
  Trash2,
  Camera
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import CameraModal from '../components/CameraModal';
import { isSupabaseConfigured, phdyFundsService } from '../lib/supabaseClient';

const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';
const CLOUDINARY_CLOUD_NAME = 'dbohmpxko';
const CLOUDINARY_UPLOAD_PRESET = 'phdy_website';
const CACHE_KEY = 'phdy_internal_funds_cache_v2';

interface PHDYInternalPageProps {
  onNavigate: (page: Page) => void;
  loggedInUser: LoggedInUser | null;
  onLoginSuccess?: (user: LoggedInUser) => void;
  onLogout?: () => void;
}

type InternalSubsection = 'funds' | 'resolutions' | 'assets' | 'guidelines';

const PHDYInternalPage: React.FC<PHDYInternalPageProps> = ({ 
  onNavigate, 
  loggedInUser, 
  onLoginSuccess, 
  onLogout 
}) => {
  const [activeSubsection, setActiveSubsection] = useState<InternalSubsection>('funds');
  const [funds, setFunds] = useState<PHDYFundTransaction[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load cached funds:', e);
      }
    }
    return INITIAL_PHDY_FUNDS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Credit' | 'Debit'>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterAmountStatus, setFilterAmountStatus] = useState<'paid_only' | 'all' | 'zero_only'>('paid_only');
  const [fundViewTab, setFundViewTab] = useState<'transactions' | 'member_summary'>('transactions');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScriptGuideOpen, setIsScriptGuideOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Add Transaction Form State
  const [formState, setFormState] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: 'Credit',
    amount: '',
    purpose: '',
    category: 'General Contribution',
    mode: 'UPI',
    billLink: ''
  });
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Member Login Gate States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const roleLower = String(loggedInUser?.role || '').toLowerCase();
  const isAuthorized = Boolean(loggedInUser && (roleLower === 'phdy_member' || roleLower === 'admin' || roleLower === 'treasurer' || roleLower === 'tressurer'));
  const canManageFunds = Boolean(loggedInUser && (roleLower === 'admin' || roleLower === 'treasurer' || roleLower === 'tressurer'));

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail.trim(),
          password: loginPassword
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error("Unable to parse server response. Check Google Apps Script deployment.");
      }

      if (data.status === 'success' && data.user) {
        const uRole = String(data.user.role || '').toLowerCase();
        if (uRole === 'admin' || uRole === 'phdy_member' || uRole === 'treasurer' || uRole === 'tressurer') {
          if (onLoginSuccess) {
            onLoginSuccess({ email: data.user.email, role: data.user.role });
          }
        } else {
          setLoginError("Access denied. Your account is registered, but not yet verified as an approved PHDY Member or Treasurer by the Admin.");
        }
      } else {
        setLoginError(data.message || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error while attempting to sign in. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Fetch from Supabase or Google Apps Script fallback
  const fetchFundsFromSheet = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncing(true);
    else setIsLoading(true);

    // 1. Try Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        const supabaseData = await phdyFundsService.getTransactions();
        if (supabaseData && supabaseData.length > 0) {
          const mappedFunds: PHDYFundTransaction[] = supabaseData.map((row: any) => ({
            id: row.id,
            date: row.transaction_date,
            name: row.contributor_or_payee,
            type: row.type,
            amount: Number(row.amount),
            purpose: row.purpose,
            category: row.category,
            mode: row.payment_mode,
            receiptUrl: row.receipt_voucher_url,
            balanceAfter: row.balance_after ? Number(row.balance_after) : undefined
          }));
          setFunds(mappedFunds);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(mappedFunds));
          } catch {}
          setIsLoading(false);
          setIsSyncing(false);
          return;
        }
      } catch (err) {
        console.warn("[Supabase] Failed to fetch funds, falling back:", err);
      }
    }

    const timeoutMs = 8000;
    try {
      const robustFetch = async () => {
        // 1. Try multiple GET variations
        const getVariations = [
          { type: 'phdy_funds' },
          { sheet: 'Phdy_funds' },
          { sheet: '2026-27' },
          { sheet: 'PHDY_Funds' },
          { sheet: 'PHDY Funds' },
          { type: 'accounting', sheet: 'Phdy_funds' },
          { type: 'accounting', sheet: '2026-27' }
        ];

        for (const variant of getVariations) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const params = new URLSearchParams({ ...variant, _t: Date.now().toString() });
            const res = await fetch(`${SPREADSHEET_API_URL}?${params.toString()}`, { 
              signal: controller.signal,
              cache: 'no-store'
            });
            clearTimeout(timer);
            const text = await res.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              const parsed = JSON.parse(text);
              const data = Array.isArray(parsed) ? parsed : (parsed.data || []);
              if (data.length > 0) return data;
            }
          } catch (e) {}
        }

        // 2. Try POST fallbacks
        const postVariations = [
          { action: 'get_phdy_funds', type: 'phdy_funds' },
          { action: 'get_accounting', sheet: 'Phdy_funds' },
          { action: 'get_accounting', sheet: '2026-27' },
          { action: 'get_sheet', sheet: 'Phdy_funds' },
          { action: 'get_sheet', sheet: '2026-27' },
          { action: 'get_data', sheet: 'Phdy_funds' }
        ];

        for (const variant of postVariations) {
          try {
            const res = await fetch(SPREADSHEET_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(variant)
            });
            const text = await res.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              const parsed = JSON.parse(text);
              const data = Array.isArray(parsed) ? parsed : (parsed.data || []);
              if (data.length > 0) return data;
            }
          } catch (e) {}
        }
        return [];
      };

      const data = await robustFetch();

      // Check if data is valid Phdy_funds records
      if (Array.isArray(data) && data.length > 0) {
        const parsedFunds: PHDYFundTransaction[] = data.map((item, idx) => {
          const rawAmount = item.Amount ?? item.amount ?? item.Rupees ?? item.rupees ?? item.Contribution ?? item.Donation ?? item.Total ?? item['Amount (Rs)'] ?? item['Amount(Rs)'] ?? item.Paid ?? item['Paid Amount'] ?? item.Amt ?? item['Rs.'] ?? 0;
          const cleanAmount = typeof rawAmount === 'number' 
            ? rawAmount 
            : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0;

          const rawType = item.Type ?? item.type ?? item['Transaction Type'] ?? item['Credit/Debit'] ?? item.Category ?? (cleanAmount < 0 ? 'Debit' : 'Credit');
          const normalizedType = String(rawType).toLowerCase().includes('deb') || String(rawType).toLowerCase().includes('exp') || String(rawType).toLowerCase().includes('out')
            ? 'Debit' 
            : 'Credit';

          const rawDate = String(item.Date ?? item.date ?? item.Timestamp ?? item.timestamp ?? item.Day ?? '').trim();
          let formattedDate = rawDate;
          if (rawDate && rawDate.includes('-') && !isNaN(new Date(rawDate).getTime())) {
            try {
              formattedDate = new Date(rawDate).toISOString().split('T')[0];
            } catch {}
          }

          const rawName = String(item.Name ?? item.name ?? item.Contributor ?? item.contributor ?? item.Donor ?? item.donor ?? item.Person ?? item.Member ?? item['Member Name'] ?? item.MemberName ?? '').trim();

          return {
            id: item.Id ?? item.id ?? item.TxnID ?? `FND-${1001 + idx}`,
            date: formattedDate || 'General',
            name: rawName || 'General Youth Fund',
            type: normalizedType,
            amount: Math.abs(cleanAmount),
            purpose: item.Purpose ?? item.purpose ?? item.Description ?? item.description ?? item.Reason ?? item.Details ?? item.Particulars ?? 'PHDY Donation',
            category: item.Category ?? item.category ?? 'General Category',
            mode: item.Mode ?? item.mode ?? item['Payment Mode'] ?? item.PaymentMode ?? 'UPI',
            receiptUrl: item.BillLink ?? item.billLink ?? item.Receipt ?? item.receipt ?? item.Proof ?? item.Bill ?? '',
            raw: item
          };
        });

        setFunds(parsedFunds);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsedFunds));
        } catch {}
      }
    } catch (err) {
      console.warn("Failed to fetch Phdy_funds from spreadsheet:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchFundsFromSheet();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (!loggedInUser?.email) return;
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=members&_t=${Date.now()}`);
      const data = await res.json();
      const members = Array.isArray(data) ? data : (data.data || []);
      const current = members.find((m: any) => 
        String(m.Email || m.email || '').toLowerCase() === loggedInUser.email.toLowerCase()
      );
      if (current) setUserProfile(current);
    } catch (e) {}
  };

  // Filter calculations: Extract unique months/periods
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    funds.forEach(f => {
      if (f.date && f.date.trim()) {
        months.add(f.date.trim());
      }
    });
    const standardMonthOrder = ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'];
    return Array.from(months).sort((a, b) => {
      const idxA = standardMonthOrder.indexOf(a);
      const idxB = standardMonthOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [funds]);

  // Filtered transactions
  const filteredFunds = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    const typeFilter = String(filterType || 'All').toLowerCase();
    const monthFilter = String(filterMonth || 'All').toLowerCase();

    return funds.filter(f => {
      if (!f) return false;
      const name = String(f.name || '').toLowerCase();
      const purpose = String(f.purpose || '').toLowerCase();
      const category = String(f.category || '').toLowerCase();
      const mode = String(f.mode || '').toLowerCase();
      const date = String(f.date || '').toLowerCase();
      const id = String(f.id || '').toLowerCase();
      const fType = String(f.type || '').toLowerCase();

      // Search across name, purpose, category, mode, id, date
      const matchesSearch = 
        !q ||
        name.includes(q) ||
        purpose.includes(q) ||
        category.includes(q) ||
        mode.includes(q) ||
        date.includes(q) ||
        id.includes(q);

      // Type Filter
      const matchesType = 
        typeFilter === 'all' || 
        fType === typeFilter;

      // Month / Period Filter
      const matchesMonth = 
        monthFilter === 'all' || 
        date === monthFilter;

      // Amount Status Filter
      const matchesAmountStatus =
        filterAmountStatus === 'all' ||
        (filterAmountStatus === 'paid_only' && f.amount > 0) ||
        (filterAmountStatus === 'zero_only' && f.amount === 0);

      return matchesSearch && matchesType && matchesMonth && matchesAmountStatus;
    });
  }, [funds, searchQuery, filterType, filterMonth, filterAmountStatus]);

  // Member Contribution Ledger calculation
  const memberLedger = useMemo(() => {
    const memberMap = new Map<string, {
      name: string;
      totalContributed: number;
      paidRecords: { month: string; amount: number; mode: string }[];
      zeroMonthsCount: number;
      totalEntries: number;
    }>();

    funds.forEach(f => {
      if (!f) return;
      const memberName = String(f.name || 'General Youth Fund').trim();
      if (!memberMap.has(memberName)) {
        memberMap.set(memberName, {
          name: memberName,
          totalContributed: 0,
          paidRecords: [],
          zeroMonthsCount: 0,
          totalEntries: 0
        });
      }
      const rec = memberMap.get(memberName)!;
      rec.totalEntries += 1;
      if (f.amount > 0) {
        rec.totalContributed += f.amount;
        rec.paidRecords.push({ month: String(f.date || ''), amount: f.amount, mode: f.mode || 'UPI' });
      } else {
        rec.zeroMonthsCount += 1;
      }
    });

    const list = Array.from(memberMap.values());
    const q = String(searchQuery || '').trim().toLowerCase();
    if (!q) {
      return list.sort((a, b) => b.totalContributed - a.totalContributed);
    }
    return list
      .filter(m => String(m.name || '').toLowerCase().includes(q))
      .sort((a, b) => b.totalContributed - a.totalContributed);
  }, [funds, searchQuery]);

  // Totals calculations
  const { totalInflow, totalOutflow, netBalance, paidRecordsCount, totalRecordsCount, membersCount } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let paidCount = 0;
    const uniqueMembers = new Set<string>();

    funds.forEach(f => {
      if (!f) return;
      if (f.name && String(f.name).trim()) uniqueMembers.add(String(f.name).trim());
      if (f.amount > 0) {
        paidCount++;
      }
      const t = String(f.type || '').toLowerCase();
      if (t === 'credit' || t === 'income') {
        inflow += Number(f.amount) || 0;
      } else {
        outflow += Number(f.amount) || 0;
      }
    });

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netBalance: inflow - outflow,
      paidRecordsCount: paidCount,
      totalRecordsCount: funds.length,
      membersCount: uniqueMembers.size
    };
  }, [funds]);

  // Chart Data Calculation
  const chartData = useMemo(() => {
    const months = ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'];
    const dataMap = new Map<string, { month: string, inflow: number, outflow: number, activities: number }>();
    
    // Initialize with standard months
    months.forEach(m => {
      dataMap.set(m, { month: m, inflow: 0, outflow: 0, activities: 0 });
    });

    funds.forEach(f => {
      if (!f || !f.date) return;
      const monthKey = f.date.trim();
      if (!dataMap.has(monthKey)) {
        // If it's a date string, extract month or just use it
        if (monthKey.includes('-')) {
          try {
            const dateObj = new Date(monthKey);
            const mName = dateObj.toLocaleString('default', { month: 'long' });
            if (dataMap.has(mName)) {
              const d = dataMap.get(mName)!;
              const type = String(f.type || '').toLowerCase();
              if (type === 'credit' || type === 'income') d.inflow += f.amount;
              else {
                d.outflow += f.amount;
                d.activities += 1;
              }
            }
            return;
          } catch {}
        }
        return;
      }

      const d = dataMap.get(monthKey)!;
      const type = String(f.type || '').toLowerCase();
      if (type === 'credit' || type === 'income') d.inflow += f.amount;
      else {
        d.outflow += f.amount;
        d.activities += 1;
      }
    });

    return Array.from(dataMap.values());
  }, [funds]);

  // Upload file to Cloudinary
  const uploadReceipt = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error("Receipt upload to Cloudinary failed");
    const json = await res.json();
    return json.secure_url;
  };

  // Handle Add Transaction Submit
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFunds) {
      return setFormError("Unauthorized: Funds details can be updated by Admin and Treasurer only.");
    }
    if (!formState.name.trim()) return setFormError("Contributor / Payee name is required.");
    if (!formState.amount || isNaN(Number(formState.amount)) || Number(formState.amount) <= 0) {
      return setFormError("Please enter a valid positive amount.");
    }
    if (!formState.purpose.trim()) return setFormError("Purpose or description is required.");

    setFormSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      let receiptUrl = formState.billLink.trim();

      // If Supabase is configured, upload receipt to Supabase Storage
      if (formFile && isSupabaseConfigured()) {
        try {
          const supabaseReceipt = await phdyFundsService.uploadReceipt(formFile);
          if (supabaseReceipt) {
            receiptUrl = supabaseReceipt;
          }
        } catch (e) {
          console.warn("Supabase receipt upload failed, attempting fallback:", e);
        }
      }

      // Fallback to Cloudinary if Supabase upload didn't run or failed
      if (formFile && !receiptUrl) {
        receiptUrl = await uploadReceipt(formFile);
      }

      const newTxn: PHDYFundTransaction = {
        id: `FND-${Date.now().toString().slice(-4)}`,
        date: formState.date,
        name: formState.name.trim(),
        type: formState.type,
        amount: Number(formState.amount),
        purpose: formState.purpose.trim(),
        category: formState.category,
        mode: formState.mode,
        receiptUrl: receiptUrl
      };

      // 1. Save to Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          await phdyFundsService.addTransaction({
            id: newTxn.id,
            transaction_date: newTxn.date,
            contributor_or_payee: newTxn.name,
            type: newTxn.type === 'Debit' ? 'Debit' : 'Credit',
            amount: newTxn.amount,
            purpose: newTxn.purpose,
            category: newTxn.category || 'General Contribution',
            payment_mode: newTxn.mode || 'UPI',
            receipt_voucher_url: newTxn.receiptUrl
          });
        } catch (err: any) {
          console.warn("[Supabase] Direct transaction insert error:", err.message);
        }
      }

      // 2. Save to Google Apps Script POST fallback
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add_phdy_fund',
            sheet: 'Phdy_funds',
            Date: newTxn.date,
            Name: newTxn.name,
            Type: newTxn.type,
            Amount: newTxn.amount,
            Purpose: newTxn.purpose,
            Category: newTxn.category,
            Mode: newTxn.mode,
            BillLink: newTxn.receiptUrl
          })
        });
      } catch (err) {
        console.warn("Could not post to Apps Script directly, adding locally:", err);
      }

      // 2. Add to local state immediately
      const updated = [newTxn, ...funds];
      setFunds(updated);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {}

      setFormSuccess("Fund transaction recorded successfully!");
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess('');
        setFormState({
          date: new Date().toISOString().split('T')[0],
          name: '',
          type: 'Credit',
          amount: '',
          purpose: '',
          category: 'General Contribution',
          mode: 'UPI',
          billLink: ''
        });
        setFormFile(null);
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || "Failed to record transaction.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Transaction (Admin & Treasurer only)
  const handleDeleteFund = async (txn: PHDYFundTransaction) => {
    if (!canManageFunds) {
      alert("Unauthorized: Funds details can be deleted by Admin and Treasurer only.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete fund entry for "${txn.name}" (₹${txn.amount})?`)) return;

    try {
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_phdy_fund',
          Id: txn.id,
          Name: txn.name,
          Purpose: txn.purpose,
          Date: txn.date
        })
      });
    } catch (err) {
      console.warn("Spreadsheet delete request failed:", err);
    }

    const updated = funds.filter(f => f.id !== txn.id);
    setFunds(updated);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch {}
    alert("Fund entry deleted successfully.");
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Name/Contributor', 'Type', 'Amount (INR)', 'Purpose', 'Category', 'Payment Mode', 'Receipt Link'];
    const rows = filteredFunds.map(f => [
      `"${f.id}"`,
      `"${f.date}"`,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.type}"`,
      f.amount,
      `"${f.purpose.replace(/"/g, '""')}"`,
      `"${(f.category || '').replace(/"/g, '""')}"`,
      `"${(f.mode || '').replace(/"/g, '""')}"`,
      `"${f.receiptUrl || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PHDY_Funds_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Camera Capture for Profile Update
  const handleCameraCapture = async (blob: Blob) => {
    try {
      setIsUploadingPhoto(true);
      const file = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const photoUrl = await uploadReceipt(file);
      
      // Update in Spreadsheet
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_member_photo',
          email: loggedInUser?.email,
          ImageURL: photoUrl
        })
      });
      
      setUserProfile((prev: any) => ({ ...prev, ImageURL: photoUrl }));
      alert("Profile photo updated successfully!");
    } catch (err) {
      alert("Failed to update profile photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // If the user is not a verified PHDY Member or Admin, show the access barrier
  if (!isAuthorized) {
    return (
      <div className="animate-fadeIn min-h-screen bg-slate-50 pb-20">
        {/* Top Banner Header */}
        <div className="bg-gradient-to-r from-orange-700 via-orange-600 to-amber-600 text-white pt-10 pb-24 px-4 shadow-xl border-b border-orange-500/30">
          <div className="max-w-7xl mx-auto text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-wider mb-3 border border-white/20">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>PHDY Internal Portal &bull; Restricted Section</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pedda Harivanam Youth Internal
            </h1>
            <p className="mt-2 text-orange-100 text-sm md:text-base max-w-2xl leading-relaxed">
              Confidential treasury balances, Phdy_funds transaction ledger, executive resolutions, and community asset records.
            </p>
          </div>
        </div>

        {/* Members Only Barrier Container */}
        <div className="max-w-md mx-auto px-4 -mt-12">
          <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-2xl border border-orange-100 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6 mx-auto shadow-inner">
              <Lock className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="text-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Members Only Access
              </span>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mt-3">
                PHDY Member Login
              </h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                This internal portal is reserved exclusively for registered members and administrators of <strong className="text-gray-700">Pedda Harivanam Development Youth</strong>. Please sign in to continue.
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-bold">Authentication Failed</p>
                  <p className="mt-0.5 text-[11px] text-red-600">{loginError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Member Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    placeholder="member@phdy.org"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="password"
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Sign In as PHDY Member</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="text-orange-600 hover:underline font-bold text-[11px]"
              >
                Forgot Password / Reset OTP &rarr;
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="text-gray-500 hover:text-orange-600 font-bold text-[11px]"
              >
                Apply for Membership &rarr;
              </button>
            </div>

            <div className="mt-8 p-4 bg-amber-50/70 rounded-2xl border border-amber-100">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Protected Content in This Section:
              </h4>
              <ul className="text-[11px] text-amber-800 space-y-1 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>PHDY Funds:</strong> Inflows, outflows, dues & reserves
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>Resolutions:</strong> General body meeting minutes
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>Asset Inventory:</strong> Sound systems, lighting & sports kits
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn min-h-screen bg-slate-50/50 pb-20">
      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={handleCameraCapture} 
      />
      {/* Top Banner Header for Authenticated Members */}
      <div className="bg-gradient-to-r from-orange-700 via-orange-600 to-amber-600 text-white pt-10 pb-16 px-4 shadow-xl border-b border-orange-500/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-wider mb-3 border border-white/20">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                <span>PHDY Internal Portal</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Pedda Harivanam Youth Internal
              </h1>
              <p className="mt-2 text-orange-100 text-sm md:text-base max-w-2xl leading-relaxed">
                Centralized internal administrative records, organization treasury funds, youth resolutions, and asset registers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Member Profile/Status Badge */}
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl p-1.5 border border-white/20 shadow-lg">
                <div 
                  onClick={() => setIsCameraModalOpen(true)}
                  className="relative group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border-2 border-white/30 flex items-center justify-center">
                    {userProfile?.ImageURL ? (
                      <img src={userProfile.ImageURL} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white/50" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="pr-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                      {roleLower === 'admin' ? 'Admin' : (roleLower === 'treasurer' || roleLower === 'tressurer') ? 'Treasurer' : 'Verified Member'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[150px] block" title={loggedInUser?.email}>
                    {loggedInUser?.email}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-3 py-2 bg-white/10 hover:bg-red-500/80 active:scale-95 text-white text-xs font-bold rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5"
                  title="Sign Out of PHDY Internal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}

              <button
                onClick={() => fetchFundsFromSheet(true)}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 shadow-sm"
                title="Sync directly with Google Sheet 'Phdy_funds'"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
              </button>

              <button
                onClick={() => setIsScriptGuideOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-gray-900 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Apps Script Guide</span>
              </button>

              {canManageFunds && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 active:scale-95 text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-orange-600 stroke-[3]" />
                  <span>Record Entry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Sidebar Subsection Layout */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Subsection Sidebar */}
          <aside className="lg:col-span-3 bg-white rounded-3xl p-5 shadow-xl border border-gray-100 sticky top-24 z-10">
            <div className="pb-4 mb-4 border-b border-gray-100">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Internal Subsections
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Select an operational module</p>
            </div>

            <nav className="space-y-2">
              {/* Subsection 1: PHDY Funds */}
              <button
                onClick={() => setActiveSubsection('funds')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeSubsection === 'funds'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeSubsection === 'funds' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span>PHDY Funds</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeSubsection === 'funds' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  Live
                </span>
              </button>

              {/* Subsection 2: Resolutions */}
              <button
                onClick={() => setActiveSubsection('resolutions')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeSubsection === 'resolutions'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeSubsection === 'resolutions' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Resolutions</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeSubsection === 'resolutions' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  3
                </span>
              </button>

              {/* Subsection 3: Asset Inventory */}
              <button
                onClick={() => setActiveSubsection('assets')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeSubsection === 'assets'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeSubsection === 'assets' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <span>Assets & Kits</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeSubsection === 'assets' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  3
                </span>
              </button>

              {/* Subsection 4: Guidelines */}
              <button
                onClick={() => setActiveSubsection('guidelines')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeSubsection === 'guidelines'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeSubsection === 'guidelines' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span>Rules & Roles</span>
                </div>
              </button>
            </nav>

            {/* Quick Treasury Summary Widget in Sidebar */}
            <div className="mt-8 pt-5 border-t border-gray-100 bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50">
              <div className="flex items-center justify-between text-xs font-bold text-orange-950 mb-1">
                <span>Net Treasury Balance</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-xl font-black text-emerald-600 tracking-tight">
                ₹{netBalance.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-[11px] text-gray-500 flex justify-between">
                <span>Total Inflow:</span>
                <span className="font-bold text-gray-700">₹{totalInflow.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-gray-500 flex justify-between">
                <span>Total Outflow:</span>
                <span className="font-bold text-gray-700">₹{totalOutflow.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Admin Portal Shortcut */}
            <div className="mt-4 text-center">
              <button
                onClick={() => onNavigate('admin')}
                className="text-xs text-orange-600 font-bold hover:underline"
              >
                Manage in Admin Panel &rarr;
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9 space-y-8">
            
            {/* SUBSECTION: PHDY FUNDS */}
            {activeSubsection === 'funds' && (
              <div className="space-y-8">
                
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Total Inflow */}
                  <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl transition-all">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-4 relative">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-400">Total Funds Inflow</span>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                        <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-3xl font-black text-emerald-600 tracking-tight">
                        ₹{totalInflow.toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Member dues, gifts, & donations
                      </p>
                    </div>
                  </div>

                  {/* Total Outflow */}
                  <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl transition-all">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-4 relative">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-400">Total Funds Outflow</span>
                      <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-3xl font-black text-rose-600 tracking-tight">
                        ₹{totalOutflow.toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Welfare works, kits, & village repairs
                      </p>
                    </div>
                  </div>

                  {/* Net Available Balance */}
                  <div className="bg-gradient-to-br from-orange-600 via-orange-600 to-amber-600 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl transition-all">
                    <div className="flex items-center justify-between mb-4 relative">
                      <span className="text-xs font-black uppercase tracking-wider text-orange-100">Net Reserve Balance</span>
                      <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm">
                        <Wallet className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-3xl font-black text-white tracking-tight">
                        ₹{netBalance.toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-orange-100 mt-1 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Group Solvency</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Summary Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Group Contributions & Expenditure Over Time */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Growth & Expenditure</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Monthly Financial Trends</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-bold text-gray-600">Inflow</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                          <span className="text-[10px] font-bold text-gray-600">Outflow</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                            tickFormatter={(val) => val.substring(0, 3)}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            tickFormatter={(val) => `₹${val}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="inflow" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorInflow)" 
                            name="Monthly Inflow"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="outflow" 
                            stroke="#f43f5e" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorOutflow)" 
                            name="Monthly Outflow"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Development Activity Volume */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Development Velocity</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Work Activities Volume</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                            tickFormatter={(val) => val.substring(0, 3)}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          />
                          <Bar 
                            dataKey="activities" 
                            fill="#f97316" 
                            radius={[6, 6, 0, 0]} 
                            name="Work Entries"
                            barSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Live Google Sheet Status & Transparency Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                          Original Google Sheet Connected
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-800 text-[10px] font-bold rounded-full">
                          Tab: Phdy_funds
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                        Live synced: <strong>{totalRecordsCount} records</strong> across <strong>{membersCount} registered youth members</strong> • <strong>₹{totalInflow.toLocaleString('en-IN')}</strong> total collected.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <span className="text-emerald-700 text-[11px] font-medium hidden md:inline">
                      Synced: {lastSyncTime}
                    </span>
                    <button
                      onClick={() => fetchFundsFromSheet(true)}
                      disabled={isSyncing}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Refreshing...' : 'Sync Sheet'}</span>
                    </button>
                  </div>
                </div>

                {/* Ledger Container */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                          PHDY Funds Ledger
                        </h2>
                        {/* View Switcher Tabs */}
                        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
                          <button
                            onClick={() => setFundViewTab('transactions')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              fundViewTab === 'transactions'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            Transactions ({filteredFunds.length})
                          </button>
                          <button
                            onClick={() => setFundViewTab('member_summary')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              fundViewTab === 'member_summary'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            Member Summary ({membersCount})
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {fundViewTab === 'transactions' 
                          ? 'Detailed transaction ledger synced directly from Google Sheet "Phdy_funds".'
                          : 'Aggregated contribution summary for each youth member across all 12 monthly cycles.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>

                      {canManageFunds ? (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Entry</span>
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>Funds Updates: Admin &amp; Treasurer Only</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TRANSACTIONS VIEW */}
                  {fundViewTab === 'transactions' && (
                    <div className="space-y-6 pt-6">
                      {/* Amount Status Filter Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mr-1">
                          Records Filter:
                        </span>
                        <button
                          onClick={() => setFilterAmountStatus('paid_only')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterAmountStatus === 'paid_only'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <span>Paid Contributions Only</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            filterAmountStatus === 'paid_only' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
                          }`}>
                            {paidRecordsCount} records • ₹{totalInflow.toLocaleString('en-IN')}
                          </span>
                        </button>

                        <button
                          onClick={() => setFilterAmountStatus('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterAmountStatus === 'all'
                              ? 'bg-orange-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>All Tracking Records</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            filterAmountStatus === 'all' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-800'
                          }`}>
                            {totalRecordsCount} records
                          </span>
                        </button>

                        <button
                          onClick={() => setFilterAmountStatus('zero_only')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterAmountStatus === 'zero_only'
                              ? 'bg-gray-800 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span>Pending / ₹0 Dues</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            filterAmountStatus === 'zero_only' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-800'
                          }`}>
                            {totalRecordsCount - paidRecordsCount}
                          </span>
                        </button>
                      </div>

                      {/* Search & Month Filter Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Search Bar */}
                        <div className="sm:col-span-6 relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by member name, purpose, or payment mode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                          />
                        </div>

                        {/* Month / Period Filter */}
                        <div className="sm:col-span-3">
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="All">All Months / Periods</option>
                            {availableMonths.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        {/* Type Filter */}
                        <div className="sm:col-span-3">
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="All">All Types (Credit & Debit)</option>
                            <option value="Credit">Credits Only (Inflow)</option>
                            <option value="Debit">Debits Only (Outflow)</option>
                          </select>
                        </div>
                      </div>

                      {/* Transactions Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              <th className="pb-3 px-2">Date / Month</th>
                              <th className="pb-3 px-2">Member / Contributor</th>
                              <th className="pb-3 px-2">Purpose / Category</th>
                              <th className="pb-3 px-2">Type</th>
                              <th className="pb-3 px-2">Mode</th>
                              <th className="pb-3 px-2 text-right">Amount</th>
                              <th className="pb-3 px-2 text-center">Receipt</th>
                              {canManageFunds && (
                                <th className="pb-3 px-2 text-right">Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredFunds.map((txn, idx) => {
                              const t = String(txn?.type || '').toLowerCase();
                              const isCredit = t === 'credit' || t === 'income';
                              const isZero = txn.amount === 0;

                              return (
                                <tr key={txn.id || idx} className={`hover:bg-orange-50/30 transition-colors ${isZero ? 'opacity-60 bg-gray-50/40' : ''}`}>
                                  {/* Date / Month */}
                                  <td className="py-3 px-2 font-mono font-bold text-gray-700 whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[11px] font-semibold text-gray-700">
                                      {txn.date}
                                    </span>
                                  </td>

                                  {/* Contributor / Payee */}
                                  <td className="py-3 px-2 font-bold text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                                        isZero ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {txn.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate max-w-[170px] sm:max-w-xs">{txn.name}</span>
                                    </div>
                                  </td>

                                  {/* Purpose & Category */}
                                  <td className="py-3 px-2">
                                    <div className="font-semibold text-gray-800 line-clamp-2 max-w-sm">
                                      {txn.purpose}
                                    </div>
                                    {txn.category && (
                                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                                        {txn.category}
                                      </span>
                                    )}
                                  </td>

                                  {/* Type */}
                                  <td className="py-3 px-2 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-max ${
                                      isZero
                                        ? 'bg-gray-100 text-gray-500'
                                        : isCredit 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {isZero ? (
                                        <span>Tracking (₹0)</span>
                                      ) : isCredit ? (
                                        <>
                                          <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                                          <span>Credit</span>
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                                          <span>Debit</span>
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  {/* Payment Mode */}
                                  <td className="py-3 px-2 whitespace-nowrap font-medium text-gray-600">
                                    <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-700">
                                      {txn.mode || 'UPI'}
                                    </span>
                                  </td>

                                  {/* Amount */}
                                  <td className="py-3 px-2 text-right whitespace-nowrap font-mono font-black text-sm">
                                    {isZero ? (
                                      <span className="text-gray-400 font-normal text-xs">₹0</span>
                                    ) : (
                                      <span className={isCredit ? 'text-emerald-600' : 'text-rose-600'}>
                                        {isCredit ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                                      </span>
                                    )}
                                  </td>

                                  {/* Receipt Proof */}
                                  <td className="py-3 px-2 text-center whitespace-nowrap">
                                    {txn.receiptUrl ? (
                                      <a
                                        href={txn.receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg transition-colors text-[10px]"
                                        title="View attached bill or proof"
                                      >
                                        <span>Proof</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-300 font-mono text-[11px]">—</span>
                                    )}
                                  </td>

                                  {/* Action for Admin/Treasurer */}
                                  {canManageFunds && (
                                    <td className="py-3 px-2 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => handleDeleteFund(txn)}
                                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                                        title="Delete this fund transaction (Admin/Treasurer only)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}

                            {filteredFunds.length === 0 && (
                              <tr>
                                <td colSpan={canManageFunds ? 8 : 7} className="py-12 text-center text-gray-400">
                                  <p className="font-bold text-sm">No fund transactions match your filter.</p>
                                  <p className="text-xs mt-1">Try changing month or status filters to view records.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MEMBER SUMMARY LEDGER VIEW */}
                  {fundViewTab === 'member_summary' && (
                    <div className="space-y-6 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search member by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div className="text-xs text-gray-500 font-medium">
                          Showing <strong>{memberLedger.length}</strong> members • Total Collected: <strong className="text-emerald-600">₹{totalInflow.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              <th className="pb-3 px-3">#</th>
                              <th className="pb-3 px-3">Member Name</th>
                              <th className="pb-3 px-3 text-right">Total Contributed</th>
                              <th className="pb-3 px-3">Paid Months Breakdown</th>
                              <th className="pb-3 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {memberLedger.map((m, idx) => {
                              const hasPaid = m.totalContributed > 0;

                              return (
                                <tr key={m.name} className="hover:bg-orange-50/20 transition-colors">
                                  <td className="py-3 px-3 font-mono text-gray-400 text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                                        hasPaid ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {m.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span>{m.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-black text-sm whitespace-nowrap">
                                    <span className={hasPaid ? 'text-emerald-600' : 'text-gray-400'}>
                                      ₹{m.totalContributed.toLocaleString('en-IN')}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    {m.paidRecords.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 max-w-md">
                                        {m.paidRecords.map((r, rIdx) => (
                                          <span
                                            key={rIdx}
                                            className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold"
                                            title={`${r.month}: ₹${r.amount} (${r.mode})`}
                                          >
                                            {r.month}: ₹{r.amount}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic text-[11px]">
                                        No contributions recorded yet
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {hasPaid ? (
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                                        Active Contributor
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">
                                        Pending Dues
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {memberLedger.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-400">
                                  No members match your search.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECTION: RESOLUTIONS & MINUTES */}
            {activeSubsection === 'resolutions' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 space-y-6">
                <div className="pb-4 border-b border-gray-100">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    PHDY Internal Resolutions & Minutes Archive
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Formal decisions passed by the General Body and Executive Committee of Pedda Harivanam Development Youth.
                  </p>
                </div>

                <div className="space-y-4">
                  {PHDY_INTERNAL_RESOLUTIONS.map((res) => (
                    <div key={res.id} className="p-5 bg-orange-50/40 rounded-2xl border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 bg-orange-600 text-white font-mono font-bold text-[10px] rounded">
                            {res.id}
                          </span>
                          <span className="text-xs font-bold text-gray-500">{res.date}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded uppercase">
                            {res.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">{res.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">{res.summary}</p>
                        <p className="text-[11px] font-bold text-orange-800 mt-2">Authority: {res.passedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBSECTION: ASSETS & EQUIPMENT INVENTORY */}
            {activeSubsection === 'assets' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 space-y-6">
                <div className="pb-4 border-b border-gray-100">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    Youth Asset & Equipment Inventory
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Physical equipment, sports materials, and sound machinery owned by PHDY for public community usage.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {PHDY_INTERNAL_ASSETS.map((asset) => (
                    <div key={asset.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            {asset.id}
                          </span>
                          <span className="font-bold text-xs text-gray-700">{asset.cost}</span>
                        </div>
                        <h3 className="font-bold text-sm text-gray-900 mb-2">{asset.name}</h3>
                        <p className="text-[11px] text-gray-500">Condition: <span className="font-semibold text-gray-700">{asset.condition}</span></p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200/60 text-[10px] text-gray-500 font-medium">
                        Custodian: <span className="font-bold text-gray-800">{asset.custodian}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBSECTION: RULES & ROLES */}
            {activeSubsection === 'guidelines' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 space-y-6">
                <div className="pb-4 border-b border-gray-100">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    PHDY Internal Constitution & Roles
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Core operational standards and duties for enrolled Pedda Harivanam Development Youth members.
                  </p>
                </div>

                <div className="prose text-xs text-gray-700 space-y-4 max-w-none">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <h4 className="font-bold text-orange-900 mb-1">1. Fund Collection Integrity</h4>
                    <p>All contributions collected from youth or donors must be recorded within 24 hours into the Phdy_funds register with a digital receipt or voucher. Cash entries must be verified by the Treasurer.</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <h4 className="font-bold text-orange-900 mb-1">2. Non-Partisan Village Development</h4>
                    <p>PHDY operates strictly as a non-partisan youth welfare coalition dedicated purely to education, infrastructure accountability, healthcare access, and youth empowerment in Pedda Harivanam.</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <h4 className="font-bold text-orange-900 mb-1">3. RTI & Grama Sabha Transparency</h4>
                    <p>Youth representatives have a duty to attend every village Grama Sabha, query panchayat expenditure vouchers, and assist villagers with public interest grievances.</p>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* MODAL: ADD TRANSACTION */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-1">Record PHDY Fund Transaction</h3>
            <p className="text-xs text-gray-500 mb-6">
              Saves to Google Sheet <span className="font-bold text-orange-600">"Phdy_funds"</span> and updates live balance.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={formState.date}
                    onChange={e => setFormState({ ...formState, date: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Transaction Type</label>
                  <select
                    value={formState.type}
                    onChange={e => setFormState({ ...formState, type: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Credit">Credit (Inflow / Contribution)</option>
                    <option value="Debit">Debit (Outflow / Expense)</option>
                  </select>
                </div>
              </div>

              {/* Contributor / Payee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {formState.type === 'Credit' ? 'Contributor / Member / Donor Name' : 'Payee / Vendor / Recipient Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ravi Kumar, Youth Committee, Adoni Hardware"
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 5000"
                    value={formState.amount}
                    onChange={e => setFormState({ ...formState, amount: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
                  <select
                    value={formState.mode}
                    onChange={e => setFormState({ ...formState, mode: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Purpose / Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Reason for payment or collection..."
                  value={formState.purpose}
                  onChange={e => setFormState({ ...formState, purpose: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={formState.category}
                  onChange={e => setFormState({ ...formState, category: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Monthly Dues">Monthly Dues</option>
                  <option value="Village Welfare">Village Welfare</option>
                  <option value="Streetlights & Power">Streetlights & Power</option>
                  <option value="Youth Sports">Youth Sports</option>
                  <option value="Festival & Celebrations">Festival & Celebrations</option>
                  <option value="Education & Library">Education & Library</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Emergency Medical">Emergency Medical</option>
                  <option value="General Contribution">General Contribution</option>
                </select>
              </div>

              {/* Proof / Bill Upload */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Receipt / Proof (Image or PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setFormFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer"
                />
                <p className="text-[10px] text-gray-400 mt-1">Or paste direct proof URL below</p>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formState.billLink}
                  onChange={e => setFormState({ ...formState, billLink: e.target.value })}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {formSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Transaction</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE APPS SCRIPT SETUP GUIDE */}
      {isScriptGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsScriptGuideOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <span>Google Sheet "Phdy_funds" &amp; New .gs File Guide</span>
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              You can organize your Google Apps Script by creating a separate <span className="font-bold text-orange-600 font-mono">PhdyFunds.gs</span> file in the same project, or add the code into your existing <span className="font-bold font-mono text-gray-700">Code.gs</span>.
            </p>

            <div className="space-y-6 text-xs text-gray-700">
              {/* Answer to user question */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Can I create a new .gs file to operate this? Yes! (Recommended)</span>
                </div>
                <p className="text-emerald-900 text-[11px] leading-relaxed">
                  In Google Apps Script, all <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">.gs</code> files in the project share the same global scope. Creating a new file called <strong className="font-mono text-emerald-950">PhdyFunds.gs</strong> keeps your main <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">Code.gs</code> clean and makes managing funds easy.
                </p>
              </div>

              {/* Step 1: Sheet Setup */}
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <h4 className="font-bold text-orange-950 mb-1">Step 1: Check Sheet Tab in Google Sheets</h4>
                <p className="mb-2 text-gray-600">In your spreadsheet, confirm the tab name is exactly <span className="font-mono font-bold text-orange-700 bg-white px-1.5 py-0.5 rounded">Phdy_funds</span> with Row 1 headers:</p>
                <div className="font-mono bg-white p-3 rounded-xl border border-orange-200 overflow-x-auto text-[11px] font-bold text-gray-800">
                  Date | Name | Type | Amount | Purpose | Category | Mode | BillLink
                </div>
              </div>

              {/* Step 2: New PhdyFunds.gs file */}
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-amber-400">Step 2: Create "PhdyFunds.gs"</h4>
                    <p className="text-[11px] text-slate-400">In Apps Script, click <strong className="text-white">+ &gt; Script</strong>, name it <strong className="text-amber-300">PhdyFunds.gs</strong> and paste:</p>
                  </div>
                  <button
                    onClick={() => {
                      const code = `/**
 * PhdyFunds.gs
 * Dedicated module for handling "Phdy_funds" spreadsheet operations.
 * Pedda Harivanam Development Youth (PHDY)
 */

function handlePhdyFundsGet(e, ss) {
  var sheet = ss.getSheetByName("Phdy_funds");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handlePhdyFundsPost(data, ss) {
  var sheet = ss.getSheetByName("Phdy_funds");
  if (!sheet) {
    sheet = ss.insertSheet("Phdy_funds");
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Name", "Type", "Amount", "Purpose", "Category", "Mode", "BillLink"]);
  }
  
  if (data.action === 'add_phdy_fund') {
    sheet.appendRow([
      data.Date || new Date().toISOString().split('T')[0],
      data.Name || '',
      data.Type || 'Credit',
      data.Amount || 0,
      data.Purpose || '',
      data.Category || 'General Contribution',
      data.Mode || 'UPI',
      data.BillLink || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Fund recorded successfully' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (data.action === 'delete_phdy_fund') {
    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      var rowName = String(values[i][1]);
      var rowAmount = String(values[i][3]);
      if (rowName === String(data.Name) && rowAmount === String(data.Amount)) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Fund deleted' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Fund row not found' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return null;
}`;
                      navigator.clipboard.writeText(code);
                      alert("PhdyFunds.gs code copied to clipboard!");
                    }}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-gray-950 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy PhdyFunds.gs</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto p-3 bg-slate-950 rounded-xl text-slate-300 max-h-48 border border-slate-800">
{`function handlePhdyFundsGet(e, ss) {
  var sheet = ss.getSheetByName("Phdy_funds");
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j];
    result.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}`}
                </pre>
              </div>

              {/* Step 3: Link in Code.gs */}
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-orange-400">Step 3: Connect in Code.gs</h4>
                    <p className="text-[11px] text-slate-400">In your existing <strong className="text-white">Code.gs</strong>, add these lines:</p>
                  </div>
                  <button
                    onClick={() => {
                      const code = `// Inside doGet(e):
if (e.parameter.type === 'phdy_funds' || e.parameter.type === 'funds') {
  return handlePhdyFundsGet(e, SpreadsheetApp.getActiveSpreadsheet());
}

// Inside doPost(e):
if (data.action === 'add_phdy_fund' || data.action === 'delete_phdy_fund') {
  var fundResult = handlePhdyFundsPost(data, SpreadsheetApp.getActiveSpreadsheet());
  if (fundResult) return fundResult;
}`;
                      navigator.clipboard.writeText(code);
                      alert("Code.gs snippet copied to clipboard!");
                    }}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Snippet</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto p-3 bg-slate-950 rounded-xl text-slate-300 border border-slate-800">
{`// 1. In doGet(e):
if (e.parameter.type === 'phdy_funds' || e.parameter.type === 'funds') {
  return handlePhdyFundsGet(e, SpreadsheetApp.getActiveSpreadsheet());
}

// 2. In doPost(e):
if (data.action === 'add_phdy_fund' || data.action === 'delete_phdy_fund') {
  var fundResult = handlePhdyFundsPost(data, SpreadsheetApp.getActiveSpreadsheet());
  if (fundResult) return fundResult;
}`}
                </pre>
              </div>

              {/* Step 4: Deploy */}
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <h4 className="font-bold text-orange-950 mb-1">Step 4: Deploy New Version</h4>
                <p className="text-gray-600">In Google Apps Script, click <strong className="text-gray-900">Deploy &rarr; Manage deployments &rarr; Edit (pencil icon) &rarr; Version: New version &rarr; Deploy</strong>. Your live app will instantly start fetching and recording funds!</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsScriptGuideOpen(false)}
                className="px-6 py-2.5 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PHDYInternalPage;
