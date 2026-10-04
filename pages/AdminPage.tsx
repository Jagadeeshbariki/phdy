import React, { useState, useRef, useEffect } from 'react';
import { 
  RefreshCw, 
  ShieldCheck, 
  Coins, 
  Users, 
  UserCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  XCircle,
  UserPlus,
  Trash2,
  X,
  Plus,
  Lock,
  Mail,
  Calendar,
  ShieldAlert,
  Camera,
  KeyRound,
  Copy
} from 'lucide-react';
import { LoggedInUser } from '../App';
import { WORKS_DATA } from '../constants';
import CameraModal from '../components/CameraModal';
import { getCurrentFinancialYear, getFinancialYearsList } from '../types';
import aboutConfigData from '../public/AboutConfig.json';
import { 
  addRecordToLocalCache, 
  removeRecordFromLocalCache 
} from '../utils/accountingHelper';
import { 
  isSupabaseConfigured, 
  supabase, 
  membershipService, 
  villageAccountingService,
  getAuthRedirectUrl
} from '../lib/supabaseClient';

const CLOUDINARY_CLOUD_NAME = 'dbohmpxko';
const CLOUDINARY_UPLOAD_PRESET = 'phdy_preset'; 

const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}; 

type AdminTab = 'members' | 'accounting' | 'works' | 'joinRequests' | 'users';

export interface SystemUserRecord {
  name: string;
  email: string;
  role: 'admin' | 'treasurer' | 'Phdy_member' | 'user' | string;
  joinedDate?: string;
  status?: string;
  password?: string;
  phone?: string;
}

export const loadInitialUsers = (currentLoggedInUser?: LoggedInUser | null): SystemUserRecord[] => {
  const userMap = new Map<string, SystemUserRecord>();

  // Only include the current logged-in user as a safety base to ensure the UI remains accessible
  if (currentLoggedInUser && currentLoggedInUser.email) {
    const key = String(currentLoggedInUser.email || '').toLowerCase().trim();
    userMap.set(key, {
      name: key.split('@')[0],
      email: key,
      role: currentLoggedInUser.role || 'admin',
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    });
  }

  return Array.from(userMap.values());
};

interface AdminPageProps {
  loggedInUser: LoggedInUser | null;
  onLoginSuccess: (user: LoggedInUser) => void;
  onLogout: () => void;
  onNavigate?: (page: any) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ loggedInUser, onLoginSuccess, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [loginData, setLoginData] = useState({ name: '', email: '', password: '', otp: '', newPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Form states
  const [memberFormData, setMemberFormData] = useState({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
  const [accountingFormData, setAccountingFormData] = useState({ FinancialYear: getCurrentFinancialYear(), Month: 'January', Type: 'Expenditure', Description: '', BillLink: '' });
  const [worksFormData, setWorksFormData] = useState({ title: '', date: '', description: '', youtubeLink: '' });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Multiple files for works
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [workDocs, setWorkDocs] = useState<File[]>([]);
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [spreadsheetMembers, setSpreadsheetMembers] = useState<any[]>([]);
  const [spreadsheetWorks, setSpreadsheetWorks] = useState<any[]>([]);
  const [spreadsheetAccounting, setSpreadsheetAccounting] = useState<any[]>([]);
  const [spreadsheetJoinRequests, setSpreadsheetJoinRequests] = useState<any[]>([]);
  const [spreadsheetUsers, setSpreadsheetUsers] = useState<any[]>(() => loadInitialUsers(loggedInUser));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAccountingDesc, setDeletingAccountingDesc] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [resetPopupState, setResetPopupState] = useState<'idle' | 'sending_otp' | 'awaiting_otp' | 'resetting' | 'success'>('idle');
  const [resetData, setResetData] = useState({ otp: '', newPassword: '' });
  const [resetError, setResetError] = useState('');
  const [joinRequestFilter, setJoinRequestFilter] = useState<'in_progress' | 'approved' | 'rejected' | 'all'>('in_progress');
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null);
  const [userRoleSuccess, setUserRoleSuccess] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'treasurer' | 'phdy_member' | 'user'>('all');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [updatingMemberEmail, setUpdatingMemberEmail] = useState<string | null>(null);
  const [adminResetModalUser, setAdminResetModalUser] = useState<SystemUserRecord | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState<string>('');
  const [adminResetSuccess, setAdminResetSuccess] = useState<string>('');
  
  // Add user modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{ name: string; email: string; role: string }>({
    name: '',
    email: '',
    role: 'Phdy_member'
  });

  // Approved Member Credentials Delivery Modal
  const [approvedCredentials, setApprovedCredentials] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    password: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workPhotosRef = useRef<HTMLInputElement>(null);
  const workDocsRef = useRef<HTMLInputElement>(null);

  const normalizeStatus = (raw?: string): 'In Progress' | 'Approved' | 'Rejected' => {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'approved' || s === 'accept' || s === 'accepted') return 'Approved';
    if (s === 'rejected' || s === 'reject' || s === 'declined') return 'Rejected';
    return 'In Progress';
  };

  const fetchSpreadsheetMembers = async () => {
    if (!loggedInUser) return;
    setIsRefreshing(true);
    try {
      // 1. Get legacy founding members from config
      const config = Array.isArray(aboutConfigData) ? aboutConfigData[0] : aboutConfigData;
      const legacy: any[] = config?.members || [];

      // 2. Fetch from Supabase members_directory
      let membersFromSupabase: any[] = [];
      if (isSupabaseConfigured()) {
        try {
          const res = await membershipService.getActiveMembers();
          if (res && Array.isArray(res)) {
            membersFromSupabase = res;
          }
        } catch (e) {
          console.warn("[Supabase] Member fetch notice:", e);
        }
      }

      // 3. Collect from approved join requests in cache and state
      let cachedApprovedReqs: any[] = [];
      try {
        const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
        cachedApprovedReqs = cached.filter(r => {
          const st = String(r.status || r.Status || r['Request Status'] || r.RequestStatus || '').trim().toLowerCase();
          return st === 'approved' || st === 'accept' || st === 'accepted';
        });
      } catch (e) {}

      // 4. Collect active users
      let cachedUsers: any[] = [];
      try {
        const savedUsers: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        cachedUsers = savedUsers.filter(u => {
          const st = String(u.status || '').trim().toLowerCase();
          const role = String(u.role || '').trim().toLowerCase();
          return st === 'active' || st === 'approved' || role === 'phdy_member' || role === 'admin' || role === 'treasurer';
        });
      } catch (e) {}

      // Combine into unified member roster
      const memberMap = new Map<string, any>();

      // A. Founding members
      legacy.forEach((m: any) => {
        const key = String(m.Name || m.name || '').trim().toLowerCase();
        if (key) {
          memberMap.set(key, {
            "Id.No": m["Id.No"] || m["id"] || 'FOUNDING',
            Name: m.Name || m.name,
            Age: m.Age || m.age || '',
            Qualification: m.Qualification || m.qualification || 'Nill',
            Motivation: m.Motivation || m.motivation || 'Committed to village youth and community development.',
            ImageURL: m.ImageURL || m.image || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
            Status: 'Approved',
            Source: 'Founding Member',
            Address: 'Pedda Harivanam'
          });
        }
      });

      // B. Approved Join Requests
      cachedApprovedReqs.forEach((r: any) => {
        const name = String(r.fullName || r.FullName || r.name || r.Name || 'Member').trim();
        const email = String(r.email || r.Email || '').trim();
        const key = String(email || name || '').toLowerCase();
        if (key) {
          memberMap.set(key, {
            "Id.No": r["Id.No"] || r.IdNo || 'MEMBER',
            Name: name,
            Age: r.Age || r.age || '',
            DOB: r.DOB || r.dob || '',
            Qualification: r.Qualification || r.qualification || r.Education || r.education || 'Graduate',
            Motivation: r.Reason || r.reason || r.Motivation || r.motivation || 'Dedicated to rural empowerment and youth service.',
            ImageURL: r.PhotoUrl || r.photoUrl || r.Photo || r.photo || r.ImageURL || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
            Status: 'Approved',
            Source: 'Approved Join Request',
            Address: r.Address || r.address || 'Pedda Harivanam',
            Email: email,
            Phone: r.Phone || r.phone || ''
          });
        }
      });

      // C. Active registered users
      cachedUsers.forEach((u: any) => {
        const name = String(u.name || u.Name || '').trim();
        const email = String(u.email || u.Email || '').trim();
        const key = String(email || name || '').toLowerCase();
        if (key && !memberMap.has(key)) {
          memberMap.set(key, {
            "Id.No": 'USER',
            Name: name || email.split('@')[0],
            Age: '',
            Qualification: 'Active Member',
            Motivation: 'Contributing to youth leadership and village welfare programs.',
            ImageURL: 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
            Status: 'Approved',
            Source: 'Active User',
            Address: 'Pedda Harivanam',
            Email: email
          });
        }
      });

      // D. Overlay direct Supabase entries if present
      membersFromSupabase.forEach((sm: any) => {
        const key = String(sm.name || '').trim().toLowerCase();
        if (key) {
          memberMap.set(key, {
            "Id.No": sm.id || 'MEM',
            Name: sm.name,
            Role: sm.role || 'Active Member',
            Qualification: sm.qualification || 'Nill',
            ImageURL: sm.photo_url || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
            Status: 'Approved',
            Source: 'Supabase Directory',
            Address: 'Pedda Harivanam',
            Phone: sm.mobile || ''
          });
        }
      });

      setSpreadsheetMembers(Array.from(memberMap.values()));
    } catch (e) {
      console.warn("Failed to fetch members:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetAccounting = async () => {
    if (!loggedInUser) return;
    setIsRefreshing(true);
    try {
      if (isSupabaseConfigured()) {
        const rows = await villageAccountingService.getAccountingVouchers(accountingFormData.FinancialYear);
        if (rows && rows.length > 0) {
          const mapped = rows.map((r: any) => ({
            id: r.id,
            FinancialYear: r.financial_year,
            Month: r.month,
            Type: r.type,
            Description: r.description,
            BillLink: r.pdf_url || ''
          }));
          setSpreadsheetAccounting(mapped);
          setIsRefreshing(false);
          return;
        }
      }
      const cached = localStorage.getItem('phdy_accounting_local_records_v1');
      if (cached) {
        setSpreadsheetAccounting(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to fetch accounting:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetWorks = async () => {
    if (!loggedInUser) return;
    setIsRefreshing(true);
    try {
      const cached = sessionStorage.getItem('phdy_works_cache');
      if (cached) {
        setSpreadsheetWorks(JSON.parse(cached));
      } else {
        setSpreadsheetWorks(WORKS_DATA);
      }
    } catch (e) {
      console.warn("Failed to fetch works:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetJoinRequests = async () => {
    if (!loggedInUser || loggedInUser.role !== 'admin') return;
    setIsRefreshing(true);

    try {
      let supaRequests: any[] = [];
      if (isSupabaseConfigured()) {
        try {
          const res = await membershipService.getMembershipRequests();
          if (res && Array.isArray(res)) {
            supaRequests = res;
          }
        } catch (e) {
          console.warn("[Supabase] Failed to fetch join requests:", e);
        }
      }

      // Load locally cached requests
      let cachedRequests: any[] = [];
      try {
        const saved = localStorage.getItem('phdy_join_requests_cache');
        if (saved) cachedRequests = JSON.parse(saved);
      } catch (e) {}

      const reqMap = new Map<string, any>();

      // Populate cached requests first
      if (Array.isArray(cachedRequests)) {
        cachedRequests.forEach(r => {
          if (r) {
            const key = String(r.email || r.fullName || '').toLowerCase().trim();
            if (key) {
              const rawStatus = r.Status || r.status || r['Request Status'] || r.RequestStatus || '';
              reqMap.set(key, {
                ...r,
                status: normalizeStatus(rawStatus)
              });
            }
          }
        });
      }

      // Populate / merge Supabase records
      if (Array.isArray(supaRequests)) {
        supaRequests.forEach(r => {
          if (r) {
            const fullName = r.full_name || r.fullName || '';
            const email = r.email || '';
            const phone = r.phone || '';
            const address = r.address || '';
            const reason = r.motivation || r.reason || '';
            const photoUrl = r.photo_url || r.photoUrl || '';
            const status = r.status === 'Approved' ? 'Approved' : (r.status === 'Rejected' ? 'Rejected' : 'In Progress');
            const date = r.submitted_at || r.date || '';

            const key = String(email || fullName).toLowerCase().trim();
            if (key) {
              const existing = reqMap.get(key);
              reqMap.set(key, {
                id: r.id || existing?.id,
                fullName: fullName || existing?.fullName || 'Applicant',
                email: email || existing?.email || '',
                phone: phone || existing?.phone || '',
                dob: r.dob || existing?.dob || '',
                address: address || existing?.address || '',
                reason: reason || existing?.reason || '',
                photoUrl: photoUrl || existing?.photoUrl || '',
                status: status || existing?.status || 'In Progress',
                date: date || existing?.date || ''
              });
            }
          }
        });
      }

      const mergedList = Array.from(reqMap.values());
      try {
        localStorage.setItem('phdy_join_requests_cache', JSON.stringify(mergedList));
      } catch (e) {}

      setSpreadsheetJoinRequests(mergedList);
    } catch (e) {
      console.warn("Failed to fetch join requests:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetUsers = async () => {
    if (!loggedInUser || loggedInUser.role !== 'admin') return;
    setIsRefreshing(true);

    try {
      const userMap = new Map<string, any>();
      
      const currentAdminKey = loggedInUser?.email?.toLowerCase().trim();
      if (currentAdminKey) {
        userMap.set(currentAdminKey, {
          name: loggedInUser?.name || currentAdminKey.split('@')[0],
          email: currentAdminKey,
          role: loggedInUser?.role || 'admin',
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'Active'
        });
      }

      // Read from local user directory
      try {
        const saved: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        if (Array.isArray(saved)) {
          saved.forEach(u => {
            if (u && u.email) {
              const email = String(u.email).toLowerCase().trim();
              userMap.set(email, {
                name: u.name || email.split('@')[0],
                email: email,
                role: u.role || 'user',
                joinedDate: u.joinedDate || '2026-01-01',
                status: u.status || 'Active'
              });
            }
          });
        }
      } catch (e) {}

      setSpreadsheetUsers(Array.from(userMap.values()));
    } catch (e) {
      console.warn("Failed to fetch users:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser || loggedInUser.role !== 'admin') {
      alert("Permission denied: Only an Administrator can add new users.");
      return;
    }
    if (!newUserData.name.trim()) return alert("User name is required.");
    if (!newUserData.email.trim() || !newUserData.email.includes('@')) return alert("Valid email address is required.");

    const emailLower = String(newUserData.email || '').trim().toLowerCase();
    const newUser = {
      name: newUserData.name.trim(),
      email: emailLower,
      role: newUserData.role,
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    };

    // 1. Update React state immediately
    setSpreadsheetUsers(prev => {
      const existingIndex = prev.findIndex(u => String(u.email).toLowerCase() === emailLower);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newUser };
        return updated;
      }
      return [newUser, ...prev];
    });

    // 2. Persist in registered users cache
    try {
      const existingList: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
      const filtered = existingList.filter(u => String(u.email).toLowerCase() !== emailLower);
      filtered.unshift(newUser);
      localStorage.setItem('phdy_registered_users_list', JSON.stringify(filtered));
    } catch (e) {}

    setIsAddUserModalOpen(false);
    setNewUserData({ name: '', email: '', role: 'phdy_member' });
    setUserRoleSuccess(`User ${newUser.name} (${newUser.email}) added successfully with role "${newUser.role}".`);
    setTimeout(() => setUserRoleSuccess(''), 5000);
  };

  const handleDeleteUser = async (email: string) => {
    if (!loggedInUser || loggedInUser.role !== 'admin') {
      alert("Permission denied: Only an Administrator can remove users.");
      return;
    }
    const userEmail = String(loggedInUser?.email || '').toLowerCase().trim();
    const targetEmail = String(email || '').toLowerCase().trim();
    if (targetEmail && userEmail && targetEmail === userEmail) {
      alert("You cannot delete your own logged-in administrator account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove user "${email}" from the system?`)) return;

    try {
      // 1. Update state
      setSpreadsheetUsers(prev => prev.filter(u => String(u.email || '').toLowerCase().trim() !== targetEmail));

      // 2. Remove from local storage
      const existingList: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
      const filtered = existingList.filter(u => String(u.email || '').toLowerCase().trim() !== targetEmail);
      localStorage.setItem('phdy_registered_users_list', JSON.stringify(filtered));

      setUserRoleSuccess(`User ${email} was removed from the directory.`);
      setTimeout(() => setUserRoleSuccess(''), 5000);
    } catch (err) {
      console.warn("Could not delete user:", err);
    }
  };

  const handleUpdateUserRole = async (email: string, targetRole: string) => {
    if (!loggedInUser || loggedInUser.role !== 'admin') {
      alert("Permission denied: Only an Administrator can promote or change user roles.");
      return;
    }

    const userEmail = String(loggedInUser?.email || '').toLowerCase().trim();
    const targetEmail = String(email || '').toLowerCase().trim();
    const targetUser = spreadsheetUsers.find(u => String(u.email || '').toLowerCase().trim() === targetEmail);
    const currentRole = targetUser?.role || 'user';
    if (currentRole === targetRole) return;

    const roleNameMap: Record<string, string> = {
      admin: 'Administrator (Full Access)',
      treasurer: 'Treasurer (Funds & Internal Access)',
      phdy_member: 'PHDY Member (Internal Portal)',
      user: 'Standard Registered User'
    };
    const targetRoleLabel = roleNameMap[targetRole] || targetRole;

    if (targetEmail && userEmail && targetEmail === userEmail && targetRole !== 'admin') {
      const confirmSelf = window.confirm(
        `⚠️ WARNING: You are changing your OWN role to "${targetRoleLabel}".\n\nDemoting your own account will immediately remove your Administrator access to this Admin Panel.\n\nAre you completely sure you want to proceed?`
      );
      if (!confirmSelf) return;
    } else {
      const confirmChange = window.confirm(
        `Are you sure you want to change the role for ${email} to "${targetRoleLabel}"?`
      );
      if (!confirmChange) return;
    }

    setUpdatingUserEmail(email);
    setUserRoleSuccess('');

    try {
      // Immediately update local state
      setSpreadsheetUsers(prev => {
        const exists = prev.some(u => String(u.email || '').toLowerCase().trim() === targetEmail);
        if (exists) {
          return prev.map(u => String(u.email || '').toLowerCase().trim() === targetEmail ? { ...u, role: targetRole } : u);
        }
        return [...prev, { name: email.split('@')[0], email, role: targetRole }];
      });

      // Update in localStorage
      try {
        const existingList: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const updatedList = existingList.map(u => String(u.email || '').toLowerCase().trim() === targetEmail ? { ...u, role: targetRole } : u);
        localStorage.setItem('phdy_registered_users_list', JSON.stringify(updatedList));
      } catch (e) {}

      // Update current session if the admin edited their own account
      if (loggedInUser && targetEmail && userEmail && targetEmail === userEmail) {
        const updatedSelf = { ...loggedInUser, role: targetRole };
        sessionStorage.setItem('phdy_admin_session', JSON.stringify(updatedSelf));
        onLoginSuccess(updatedSelf);
      }

      setUserRoleSuccess(`User role for ${email} has been updated to ${targetRoleLabel}.`);
      setTimeout(() => setUserRoleSuccess(''), 5000);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      alert(`Could not complete role update for ${email}.`);
    } finally {
      setUpdatingUserEmail(null);
    }
  };

  const handlePromoteUser = (email: string) => {
    handleUpdateUserRole(email, 'admin');
  };

  useEffect(() => {
    if (loggedInUser) {
      const roleLower = String(loggedInUser?.role || '').toLowerCase();
      const isAdmin = roleLower === 'admin';

      if (isAdmin) {
        if (activeTab === 'members') fetchSpreadsheetMembers();
        if (activeTab === 'works') fetchSpreadsheetWorks();
        if (activeTab === 'accounting') fetchSpreadsheetAccounting();
        if (activeTab === 'joinRequests') fetchSpreadsheetJoinRequests();
        if (activeTab === 'users') fetchSpreadsheetUsers();
      }
    }
  }, [activeTab, loggedInUser]);

  const isPredefinedAdmin = (email: string) => {
    const e = String(email || '').toLowerCase().trim();
    return e === 'admin@phdy.org' || 
           e === 'admin@gmail.com' || 
           e === 'vyomanautjagadeesh@gmail.com' ||
           e.startsWith('admin@') ||
           e.includes('admin');
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthenticating(true);

    try {
      const inputEmail = loginData.email.trim().toLowerCase();
      const inputPass = loginData.password;

      if (authMode === 'login') {
        // 1. Try Supabase Auth first if configured
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: inputEmail,
              password: inputPass
            });
            if (!error && data?.user) {
              const isAdminEmail = isPredefinedAdmin(inputEmail);
              const userRole = isAdminEmail ? 'admin' : (data.user.user_metadata?.role || 'admin');
              onLoginSuccess({ email: data.user.email || inputEmail, role: userRole });
              if (userRole === 'admin') {
                // Stay in admin
              } else if (userRole === 'phdy_member' || userRole === 'treasurer') {
                if (onNavigate) onNavigate('internal');
              } else {
                if (onNavigate) onNavigate('home');
              }
              setIsAuthenticating(false);
              return;
            }
          } catch (e) {}
        }

        // 2. Check local user directory
        const savedUsers: SystemUserRecord[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const found = savedUsers.find(u => u.email.toLowerCase() === inputEmail);
        const isAdminEmail = isPredefinedAdmin(inputEmail);

        if (isAdminEmail) {
          onLoginSuccess({ email: inputEmail, role: 'admin' });
          setIsAuthenticating(false);
          return;
        } else if (found) {
          if (found.status === 'Pending Approval') {
            throw new Error("Your account is currently pending Administrator approval.");
          }
          if (found.password && found.password !== inputPass) {
            throw new Error("Incorrect password. Please verify your password or use 'Forgot Password?'.");
          }
          const role = String(found.role || 'user').toLowerCase();
          onLoginSuccess({ email: inputEmail, role: found.role });
          if (role === 'admin') {
            // Stay
          } else if (role === 'phdy_member' || role === 'treasurer') {
            if (onNavigate) onNavigate('internal');
          } else {
            if (onNavigate) onNavigate('home');
          }
        } else {
          throw new Error("Account not found or password incorrect. Please register first or contact the Administrator.");
        }
      } else if (authMode === 'register') {
        const regEmail = inputEmail;
        const isAdminEmail = isPredefinedAdmin(regEmail);
        const assignedRole = isAdminEmail ? 'admin' : ((loginData as any).role || 'user');
        const assignedStatus = isAdminEmail ? 'Active' : 'Pending Approval';

        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signUp({
              email: regEmail,
              password: inputPass,
              options: {
                emailRedirectTo: getAuthRedirectUrl('#login'),
                data: {
                  name: (loginData.name || '').trim(),
                  role: assignedRole
                }
              }
            });
          } catch (e) {
            console.warn("[Supabase Auth] SignUp notice:", e);
          }
        }

        const newRegUser: SystemUserRecord = {
          name: (loginData.name || '').trim() || regEmail.split('@')[0],
          email: regEmail,
          role: assignedRole,
          joinedDate: new Date().toISOString().split('T')[0],
          status: assignedStatus,
          password: inputPass
        };

        const existingList: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const filtered = existingList.filter(u => String(u.email || '').toLowerCase() !== newRegUser.email);
        filtered.unshift(newRegUser);
        localStorage.setItem('phdy_registered_users_list', JSON.stringify(filtered));

        setSpreadsheetUsers(prev => [newRegUser, ...prev.filter(u => u.email !== regEmail)]);

        if (assignedRole === 'admin') {
          onLoginSuccess({ email: regEmail, role: 'admin' });
          setAuthSuccess('Admin account created and logged in successfully!');
          setIsAuthenticating(false);
          return;
        } else {
          setAuthSuccess('Registration submitted! An Administrator will review and approve your account.');
          setAuthMode('login');
        }
      } else if (authMode === 'forgot') {
        const savedUsers: SystemUserRecord[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const found = savedUsers.find(u => u.email.toLowerCase() === inputEmail);

        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.resetPasswordForEmail(inputEmail, {
              redirectTo: getAuthRedirectUrl('#login')
            });
          } catch (e) {}
        }

        if (found || inputEmail === 'admin@phdy.org' || isSupabaseConfigured()) {
          setAuthSuccess(`Account verified for ${inputEmail}. Please set your new password below.`);
          setAuthMode('reset');
        } else {
          throw new Error("No account found with this email. Please check your spelling or register.");
        }
      } else if (authMode === 'reset') {
        const newPass = loginData.newPassword.trim();
        if (!newPass || newPass.length < 4) {
          throw new Error("Please enter a secure password (at least 4 characters).");
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.updateUser({ password: newPass });
          } catch (e) {}
        }

        // Update local user directory
        const savedUsers: SystemUserRecord[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const updated = savedUsers.map(u => {
          if (u.email.toLowerCase() === inputEmail) {
            return { ...u, password: newPass };
          }
          return u;
        });
        localStorage.setItem('phdy_registered_users_list', JSON.stringify(updated));
        setSpreadsheetUsers(prev => prev.map(u => u.email.toLowerCase() === inputEmail ? { ...u, password: newPass } : u));

        setAuthSuccess('Password has been successfully updated! You can now log in.');
        setLoginData(prev => ({ ...prev, password: '', newPassword: '' }));
        setAuthMode('login');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const uploadToCloudinary = async (file: File, resourceType: 'image' | 'raw' | 'auto' = 'auto') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', resourceType);
    
    // Cloudinary upload endpoint - use proper target type in path
    const targetType = resourceType === 'raw' ? 'raw' : 'image';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${targetType}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Cloudinary upload error:', errorData);
      throw new Error('Cloudinary upload failed');
    }
    return await res.json();
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Photo is required. You can upload or capture one using the camera.");
    setStatus('uploading');
    try {
      const cloudinaryData = await uploadToCloudinary(selectedFile, 'image');
      setStatus('submitting');

      if (isSupabaseConfigured()) {
        await membershipService.addMember({
          name: memberFormData.Name,
          role: 'Active Member',
          qualification: memberFormData.Qualification,
          photo_url: cloudinaryData.secure_url
        });
      }

      setStatus('success');
      setMemberFormData({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
      setSelectedFile(null); 
      setPreviewUrl(null); 
      fetchSpreadsheetMembers();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) { 
      setStatus('error'); 
    }
  };

  const handleAccountingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUser?.role !== 'admin') return alert("Admin access required.");
    setStatus('submitting');

    const finalPayload = { ...accountingFormData };
    if (finalPayload.Type === 'No Income' || finalPayload.Type === 'No Expenditure') {
      if (!finalPayload.Description.trim()) {
        finalPayload.Description = finalPayload.Type === 'No Income' 
          ? 'No income recorded for this month' 
          : 'No expenditure recorded for this month';
      }
      if (!finalPayload.BillLink.trim() || finalPayload.BillLink === '#') {
        finalPayload.BillLink = 'none';
      }
    }

    try {
      if (isSupabaseConfigured()) {
        await villageAccountingService.addVoucher({
          financial_year: finalPayload.FinancialYear,
          month: finalPayload.Month,
          type: finalPayload.Type as any,
          description: finalPayload.Description,
          pdf_url: finalPayload.BillLink
        });
      }

      addRecordToLocalCache({
        FinancialYear: finalPayload.FinancialYear,
        Month: finalPayload.Month,
        Type: finalPayload.Type as any,
        Description: finalPayload.Description,
        BillLink: finalPayload.BillLink
      });
      setStatus('success');
      alert("Submitted successfully!");
      setAccountingFormData({ ...accountingFormData, Description: '', BillLink: '' });
      fetchSpreadsheetAccounting();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) { 
      setStatus('error'); 
      alert("Submission failed. Try again.");
    }
  };

  const handleWorksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUser?.role !== 'admin') return alert("Admin access required.");
    setStatus('uploading');
    try {
      // Upload Photos
      const photoUrls = [];
      for (const file of workPhotos) {
        const data = await uploadToCloudinary(file, 'image');
        photoUrls.push(data.secure_url);
      }

      // Upload Documents
      const docUrls = [];
      for (const file of workDocs) {
        const data = await uploadToCloudinary(file, 'image');
        docUrls.push({ name: file.name, url: data.secure_url });
      }

      setStatus('submitting');
      const newWork = {
        id: Date.now(),
        title: worksFormData.title,
        date: worksFormData.date,
        description: worksFormData.description,
        youtubeLink: worksFormData.youtubeLink,
        photos: photoUrls,
        documents: docUrls
      };

      const existingWorks: any[] = JSON.parse(sessionStorage.getItem('phdy_works_cache') || '[]');
      existingWorks.unshift(newWork);
      sessionStorage.setItem('phdy_works_cache', JSON.stringify(existingWorks));
      
      setStatus('success');
      setWorksFormData({ title: '', date: '', description: '', youtubeLink: '' });
      setWorkPhotos([]);
      setWorkDocs([]);
      fetchSpreadsheetWorks();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) { 
      console.error(err);
      setStatus('error'); 
    }
  };

  const handleDeleteAccounting = async (description: string) => {
    if (!window.confirm(`Are you sure you want to delete this accounting entry: "${description}"?`)) return;
    setDeletingAccountingDesc(description);
    setStatus('submitting');
    try {
      removeRecordFromLocalCache(description);
      const target = spreadsheetAccounting.find((r: any) => r.Description === description);
      if (target?.id && isSupabaseConfigured()) {
        await villageAccountingService.deleteVoucher(target.id);
      }
      alert("Deleted successfully!");
      fetchSpreadsheetAccounting(); 
      setDeletingAccountingDesc(null);
      setStatus('idle');
    } catch (err) { 
      setStatus('error'); 
      setDeletingAccountingDesc(null);
      alert("Failed to delete financial record.");
    }
  };

  const handleDeleteWork = async (title: string) => {
    if (!window.confirm(`Are you sure you want to delete the work record: "${title}"?`)) return;
    setStatus('submitting');
    try {
      const existingWorks: any[] = JSON.parse(sessionStorage.getItem('phdy_works_cache') || '[]');
      const filtered = existingWorks.filter(w => w.title !== title);
      sessionStorage.setItem('phdy_works_cache', JSON.stringify(filtered));
      fetchSpreadsheetWorks(); 
      setStatus('idle');
    } catch (err) { setStatus('error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete member ID ${id}?`)) return;
    setDeletingId(id);
    if (isSupabaseConfigured()) {
      await membershipService.deleteMember(id);
    }
    setTimeout(() => { fetchSpreadsheetMembers(); setDeletingId(null); }, 500);
  };

  const handleApproveJoinRequest = async (req: any) => {
    let finalEmail = req.email;
    if (!finalEmail) {
      finalEmail = window.prompt(`Missing email for ${req.fullName}. Please enter their email address to proceed:`);
      if (!finalEmail) return; // User cancelled
    }
    const finalEmailLower = String(finalEmail || '').toLowerCase().trim();
    if (!window.confirm(`Are you sure you want to APPROVE ${req.fullName}? Their request status will be updated to "Approved" in the database, added to the Members Directory, and an automated activation email will be sent to them.`)) return;

    setProcessingRequest(req.fullName);
    try {
      // 1. Update JoinRequests status to 'Approved' in local state
      setSpreadsheetJoinRequests(prev => prev.map(r => {
        const key = String(r.email || r.fullName || '').toLowerCase().trim();
        if (key === finalEmailLower || key === String(req.fullName || '').toLowerCase().trim()) {
          return { ...r, status: 'Approved' };
        }
        return r;
      }));

      // Update in localStorage join requests cache
      try {
        const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
        const updated = cached.map(r => {
          const key = String(r.email || r.fullName || '').toLowerCase().trim();
          if (key === finalEmailLower || key === String(req.fullName || '').toLowerCase().trim()) {
            return { ...r, status: 'Approved' };
          }
          return r;
        });
        localStorage.setItem('phdy_join_requests_cache', JSON.stringify(updated));
      } catch (e) {}

      // 2. Add approved details to Users list
      const newUserRecord: SystemUserRecord = {
        name: req.fullName || finalEmailLower.split('@')[0],
        email: finalEmailLower,
        role: 'Phdy_member',
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      setSpreadsheetUsers(prev => {
        const filtered = prev.filter(u => String(u.email || '').toLowerCase().trim() !== finalEmailLower);
        return [newUserRecord, ...filtered];
      });

      try {
        const stored: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const filtered = stored.filter(u => String(u.email || '').toLowerCase().trim() !== finalEmailLower);
        filtered.unshift(newUserRecord);
        localStorage.setItem('phdy_registered_users_list', JSON.stringify(filtered));
      } catch (e) {}

      // 3. Save approval directly to Supabase database (membership_requests and members_directory)
      let supaUpdated = false;
      if (isSupabaseConfigured()) {
        try {
          // Update membership_requests by ID, Email, or Phone to guarantee database record update
          if (req.id) {
            const { error: err1 } = await supabase.from('membership_requests').update({ status: 'Approved' }).eq('id', req.id);
            if (!err1) supaUpdated = true;
          }
          if (finalEmailLower) {
            const { error: err2 } = await supabase.from('membership_requests').update({ status: 'Approved' }).eq('email', finalEmailLower);
            if (!err2) supaUpdated = true;
          }
          if (req.phone) {
            await supabase.from('membership_requests').update({ status: 'Approved' }).eq('phone', req.phone);
          }

          // Add to members_directory
          await supabase.from('members_directory').insert([{
            name: req.fullName || finalEmailLower.split('@')[0],
            role: 'Active Member',
            qualification: req.education || req.dob || 'Member',
            mobile: req.phone || null,
            photo_url: req.photoUrl || req.photo_url || null,
            is_active: true
          }]);

          // Automatically send activation / password setup email to the approved user
          if (finalEmailLower) {
            try {
              // 1. Send OTP / Magic link activation which works for both existing & new users
              const { error: otpError } = await supabase.auth.signInWithOtp({
                email: finalEmailLower,
                options: {
                  emailRedirectTo: getAuthRedirectUrl('#login'),
                  data: {
                    full_name: req.fullName || 'Member',
                    role: 'phdy_member'
                  }
                }
              });

              if (otpError) {
                // 2. Fallback to password reset email if OTP signIn is not permitted
                await supabase.auth.resetPasswordForEmail(finalEmailLower, {
                  redirectTo: getAuthRedirectUrl('#login')
                });
              }
            } catch (mailErr) {
              console.warn("[Supabase Email Dispatch]:", mailErr);
            }
          }
        } catch (supaErr) {
          console.warn("[Supabase] Join request approval notice:", supaErr);
        }
      }

      // 4. Open confirmation modal for admin with direct email & WhatsApp triggers
      setApprovedCredentials({
        name: req.fullName || 'Member',
        email: finalEmailLower,
        phone: req.phone || '',
        role: 'PHDY Member',
        password: ''
      });

      await fetchSpreadsheetJoinRequests();
      await fetchSpreadsheetUsers();
      await fetchSpreadsheetMembers();
    } catch (err: any) {
      alert(`Approval processed: ${err.message || 'Complete'}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectJoinRequest = async (req: any) => {
    let finalEmail = req.email;
    if (!finalEmail) {
      finalEmail = window.prompt(`Missing email for ${req.fullName}. Please enter their email address to proceed:`);
      if (!finalEmail) return;
    }
    const finalEmailLower = String(finalEmail || '').toLowerCase().trim();
    if (!window.confirm(`Are you sure you want to REJECT the join request from ${req.fullName}? Status will be updated to "Rejected".`)) return;

    setProcessingRequest(req.fullName);
    try {
      // 1. Update JoinRequests status to 'Rejected'
      setSpreadsheetJoinRequests(prev => prev.map(r => {
        const key = String(r.email || r.fullName || '').toLowerCase().trim();
        if (key === finalEmailLower || key === String(req.fullName || '').toLowerCase().trim()) {
          return { ...r, status: 'Rejected' };
        }
        return r;
      }));

      try {
        const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
        const updated = cached.map(r => {
          const key = String(r.email || r.fullName || '').toLowerCase().trim();
          if (key === finalEmailLower || key === String(req.fullName || '').toLowerCase().trim()) {
            return { ...r, status: 'Rejected' };
          }
          return r;
        });
        localStorage.setItem('phdy_join_requests_cache', JSON.stringify(updated));
      } catch (e) {}

      // 2. Update status in Supabase if configured
      if (isSupabaseConfigured() && req.id) {
        try {
          await membershipService.updateRequestStatus(req.id, 'Rejected');
        } catch (supaErr) {
          console.warn("[Supabase] Join request rejection notice:", supaErr);
        }
      }

      alert(`Request for ${req.fullName} marked as "Rejected".`);
      fetchSpreadsheetJoinRequests();
    } catch (err: any) {
      alert(`Status updated locally.`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeleteJoinRequest = async (req: any) => {
    const key = String(req.email || req.fullName || '').toLowerCase().trim();
    if (!window.confirm(`Permanently remove join request for "${req.fullName}"?`)) return;

    setSpreadsheetJoinRequests(prev => prev.filter(r => String(r.email || r.fullName || '').toLowerCase().trim() !== key));
    try {
      const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
      const filtered = cached.filter(r => String(r.email || r.fullName || '').toLowerCase().trim() !== key);
      localStorage.setItem('phdy_join_requests_cache', JSON.stringify(filtered));
    } catch (e) {}

    if (isSupabaseConfigured() && req.id) {
      try {
        await supabase.from('membership_requests').delete().eq('id', req.id);
      } catch (e) {}
    }
  };

  const handlePopupRequestOtp = async () => {
    if (!loggedInUser) return;
    setResetPopupState('sending_otp');
    setResetError('');
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(loggedInUser.email);
        if (error) throw error;
      }
      setResetPopupState('awaiting_otp');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email.');
      setResetPopupState('idle');
    }
  };

  const handlePopupResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;
    setResetPopupState('resetting');
    setResetError('');
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password: resetData.newPassword });
        if (error) throw error;
      }
      setResetPopupState('success');
      setTimeout(() => {
        setShowResetPopup(false);
        setResetPopupState('idle');
        setResetData({ otp: '', newPassword: '' });
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to update password.');
      setResetPopupState('awaiting_otp');
    }
  };

  if (!loggedInUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50 py-12">
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight mb-1">
              {authMode === 'login' ? 'Portal Sign In' : 
               authMode === 'register' ? 'Create Account' :
               authMode === 'forgot' ? 'Forgot Password' : 'Reset Password'}
            </h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Village Governance & Admin Access</p>
          </div>

          {/* Tab selector for Login vs Register */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  authMode === 'login' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  authMode === 'register' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Register / Add Admin
              </button>
            </div>
          )}

          <form onSubmit={handleAuthAction} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Your Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="e.g. Jagadeesh (Admin)"
                  value={loginData.name}
                  onChange={(e) => setLoginData({...loginData, name: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
              <input 
                required
                type="email" 
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                placeholder="vyomanautjagadeesh@gmail.com"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Access Role</label>
                <select
                  value={(loginData as any).role || 'admin'}
                  onChange={(e) => setLoginData({...loginData, role: e.target.value} as any)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all cursor-pointer"
                >
                  <option value="admin">👑 Administrator (Full Control)</option>
                  <option value="treasurer">💰 Treasurer (Funds & Accounts)</option>
                  <option value="phdy_member">🛡️ PHDY Member (Internal Portal)</option>
                  <option value="user">👤 Standard User</option>
                </select>
              </div>
            )}

            {(authMode === 'login' || authMode === 'register') && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Password</label>
                <input 
                  required
                  type="password" 
                  className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                />
              </div>
            )}

            {authMode === 'reset' && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">OTP (from email)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                    placeholder="123456"
                    value={loginData.otp}
                    onChange={(e) => setLoginData({...loginData, otp: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">New Password</label>
                  <input 
                    required
                    type="password" 
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                    placeholder="••••••••"
                    value={loginData.newPassword}
                    onChange={(e) => setLoginData({...loginData, newPassword: e.target.value})}
                  />
                </div>
              </>
            )}

            {authError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100 animate-pulse">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="p-4 bg-green-50 text-green-700 rounded-xl text-xs font-bold text-center border border-green-200">
                {authSuccess}
              </div>
            )}

            <button 
              disabled={isAuthenticating}
              type="submit" 
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 text-xs"
            >
              {isAuthenticating ? 'Processing...' : 
               authMode === 'login' ? 'Secure Sign In' :
               authMode === 'register' ? 'Create Account & Sign In' :
               authMode === 'forgot' ? 'Send OTP' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 flex flex-col space-y-2 text-center">
            {authMode === 'login' && (
              <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }} className="text-xs font-bold text-orange-600 hover:underline">Forgot Password?</button>
            )}
            {(authMode === 'forgot' || authMode === 'reset') && (
              <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} className="text-xs font-bold text-orange-600 hover:underline">Back to Sign In</button>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <RefreshCw className="h-3 w-3" />
              Deployment Troubleshooting
            </h3>
            <p className="text-[10px] text-gray-400 leading-relaxed italic">
              If login or data fetching works here but fails in your live link, please ensure your Google Apps Script is deployed as a <strong>Web App</strong> with <strong>Access: Anyone</strong>. 
              <br/><br/>
              In Google Apps Script: 
              Click <strong>Deploy &rarr; Manage deployments &rarr; Edit (pencil) &rarr; Version: New version &rarr; Who has access: Anyone &rarr; Deploy</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roleLower = String(loggedInUser?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50 animate-fadeIn">
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            Admin Access Only
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-3 mb-2">Restricted Access</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            The Administration portal is restricted to <strong className="text-gray-800">Administrators only</strong>. Your signed-in account (<span className="font-semibold text-gray-700">{loggedInUser.email}</span>) does not have administrator privileges.
          </p>
          <div className="space-y-3">
            {(roleLower === 'phdy_member' || roleLower === 'treasurer') && onNavigate && (
              <button
                onClick={() => onNavigate('internal')}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Go to PHDY Internal Portal</span>
                <span>&rarr;</span>
              </button>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate('home')}
                className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all"
              >
                Return to Home Page
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-full py-2.5 text-red-600 hover:text-red-700 font-bold text-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCameraCapture = async (blob: Blob) => {
    if (updatingMemberEmail) {
      try {
        setStatus('uploading');
        const file = new File([blob], `member_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadToCloudinary(file, 'image');
        
        alert("Photo updated successfully!");
        fetchSpreadsheetMembers();
      } catch (err) {
        alert("Failed to update photo");
      } finally {
        setStatus('idle');
        setUpdatingMemberEmail(null);
        setIsCameraModalOpen(false);
      }
      return;
    }

    const file = new File([blob], `member_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  return (
    <div className="animate-fadeIn py-16 px-4 bg-gray-50 min-h-screen">
      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={handleCameraCapture} 
      />
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[32px] shadow-xl border border-orange-50 gap-4">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
               <ShieldCheck className="h-6 w-6" />
             </div>
             <div>
               <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                 Admin: {loggedInUser.email.split('@')[0]}
               </h1>
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">
                 System Administrator
               </p>
             </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowResetPopup(true)} className="px-6 py-3 bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Change Password</button>
            <button onClick={onLogout} className="px-6 py-3 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Sign Out</button>
          </div>
        </div>

        <div className="flex justify-center space-x-4 overflow-x-auto pb-4">
          <button onClick={() => setActiveTab('members')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-700'}`}>Members</button>
          <button onClick={() => setActiveTab('works')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'works' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-700'}`}>Our Works</button>
          <button onClick={() => setActiveTab('accounting')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'accounting' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-700'}`}>Accounting</button>
          <button onClick={() => setActiveTab('joinRequests')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'joinRequests' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-700'}`}>Join Requests</button>
          <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-700'}`}>Manage Users</button>
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'members' && (
            <div className="space-y-12 animate-fadeIn">
              {/* Member Add Form */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50 max-w-3xl mx-auto">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Add New Group Member</h2>
                <form onSubmit={handleMemberSubmit} className="space-y-6">
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative group">
                      <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-[2.5rem] border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-orange-300 transition-colors">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 font-bold uppercase">Upload Photo</span>}
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        className="absolute -bottom-2 -right-2 w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-orange-700 active:scale-95 transition-all z-10"
                        title="Capture photo from camera"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload or Capture Member Photo</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input required type="text" placeholder="Name" className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={memberFormData.Name} onChange={(e)=>setMemberFormData({...memberFormData, Name: e.target.value})} />
                    <input required type="text" placeholder="ID Number" className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={memberFormData.IdNo} onChange={(e)=>setMemberFormData({...memberFormData, IdNo: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input required type="number" placeholder="Age" className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={memberFormData.Age} onChange={(e)=>setMemberFormData({...memberFormData, Age: e.target.value})} />
                    <input required type="text" placeholder="Qualification" className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={memberFormData.Qualification} onChange={(e)=>setMemberFormData({...memberFormData, Qualification: e.target.value})} />
                  </div>
                  <textarea required placeholder="Motivation" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none h-32" value={memberFormData.Motivation} onChange={(e)=>setMemberFormData({...memberFormData, Motivation: e.target.value})} />
                  <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest">{status === 'submitting' ? 'Saving...' : 'Register Member'}</button>
                </form>
              </div>

              {/* Members Table */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Live Aggregated Roster ({spreadsheetMembers.length} Members)
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Active Team Members</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Consolidated automatically from <strong>Approved Join Requests</strong>, <strong>Active Users</strong>, and Founding Members. Synchronized with the public Members section.
                    </p>
                  </div>
                  <button onClick={fetchSpreadsheetMembers} className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-orange-100">
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync Members</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">Member</th>
                        <th className="pb-4">Qualification / Role</th>
                        <th className="pb-4">Source / Origin</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetMembers.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={m.ImageURL || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png'} 
                                alt={m.Name} 
                                className="w-12 h-12 object-cover rounded-2xl border border-gray-200 shadow-sm flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png';
                                }}
                              />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{m.Name}</p>
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                  #{m["Id.No"] || 'MEMBER'}
                                </span>
                                {m.Email && <p className="text-[11px] text-gray-400 mt-0.5">{m.Email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <p className="text-xs font-bold text-gray-700">{m.Qualification || 'Youth Leader'}</p>
                            {m.Age && <p className="text-[11px] text-gray-400 mt-0.5">Age: {m.Age}</p>}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                              {m.Source || 'Approved Member'}
                            </span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end items-center gap-4">
                              <button 
                                onClick={() => {
                                  setUpdatingMemberEmail(m.Email || m.email || m.Name);
                                  setIsCameraModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-blue-100"
                                title="Update Photo"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Photo</span>
                              </button>
                              <button 
                                onClick={()=>handleDelete(m["Id.No"])} 
                                className="text-red-500 hover:text-red-700 font-bold text-xs uppercase hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {spreadsheetMembers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400">
                            No team members currently registered. Approved join requests and active users will appear here automatically.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'works' && (
            <div className="space-y-12 animate-fadeIn">
              <div className="max-w-3xl mx-auto bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Add New Work Record</h2>
                <form onSubmit={handleWorksSubmit} className="space-y-6">
                  <input required type="text" placeholder="Work Heading" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={worksFormData.title} onChange={(e)=>setWorksFormData({...worksFormData, title: e.target.value})} />
                  <input required type="date" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={worksFormData.date} onChange={(e)=>setWorksFormData({...worksFormData, date: e.target.value})} />
                  <textarea required placeholder="Work Description" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none h-32" value={worksFormData.description} onChange={(e)=>setWorksFormData({...worksFormData, description: e.target.value})} />
                  <input type="text" placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" value={worksFormData.youtubeLink} onChange={(e)=>setWorksFormData({...worksFormData, youtubeLink: e.target.value})} />
                  
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Photos (Multiple)</label>
                    <input type="file" multiple accept="image/*" className="hidden" ref={workPhotosRef} onChange={(e) => setWorkPhotos(Array.from(e.target.files || []))} />
                    <button type="button" onClick={() => workPhotosRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold uppercase text-xs">
                      {workPhotos.length > 0 ? `${workPhotos.length} Photos Selected` : 'Select Photos'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Documents (PDF, etc.)</label>
                    <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" ref={workDocsRef} onChange={(e) => setWorkDocs(Array.from(e.target.files || []))} />
                    <button type="button" onClick={() => workDocsRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold uppercase text-xs">
                      {workDocs.length > 0 ? `${workDocs.length} Documents Selected` : 'Select Documents'}
                    </button>
                  </div>

                  <button type="submit" disabled={status === 'uploading' || status === 'submitting'} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50">
                    {status === 'uploading' ? 'Uploading Files...' : status === 'submitting' ? 'Saving Record...' : 'Publish Work Record'}
                  </button>
                  
                  {status === 'success' && <p className="text-green-600 font-bold text-center animate-bounce">Work record added successfully!</p>}
                  {status === 'error' && <p className="text-red-600 font-bold text-center">Failed to add record. Try again.</p>}
                </form>
              </div>

              {/* Works Table */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Recent Work Records</h2>
                  <button onClick={fetchSpreadsheetWorks} className="text-orange-600 font-bold">Sync Data</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">Date</th>
                        <th className="pb-4">Title</th>
                        <th className="pb-4">Photos</th>
                        <th className="pb-4">Docs</th>
                        <th className="pb-4">Live Link</th>
                        <th className="pb-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetWorks.map((w, idx) => {
                        let photoCount = 0;
                        let docCount = 0;
                        try {
                          if (Array.isArray(w.photos)) photoCount = w.photos.length;
                          else if (w.photos && typeof w.photos === 'string' && w.photos.trim() !== '') {
                            const parsed = JSON.parse(w.photos);
                            photoCount = Array.isArray(parsed) ? parsed.length : 1;
                          }
                        } catch {
                          photoCount = w.photos ? 1 : 0;
                        }
                        try {
                          if (Array.isArray(w.documents)) docCount = w.documents.length;
                          else if (w.documents && typeof w.documents === 'string' && w.documents.trim() !== '') {
                            const parsed = JSON.parse(w.documents);
                            docCount = Array.isArray(parsed) ? parsed.length : 1;
                          }
                        } catch {
                          docCount = w.documents ? 1 : 0;
                        }

                        const liveLink = w.youtubeLink || w.youtube_link || w.liveLink || w.live_link || w.video || '';

                        return (
                          <tr key={idx}>
                            <td className="py-4 text-sm font-bold text-gray-500">{formatDisplayDate(w.date)}</td>
                            <td className="py-4 font-bold">{w.title}</td>
                            <td className="py-4 text-sm text-gray-500">{photoCount}</td>
                            <td className="py-4 text-sm text-gray-500">{docCount}</td>
                            <td className="py-4 text-sm text-gray-500">
                              {liveLink ? (
                                <a 
                                  href={liveLink.startsWith('http') ? liveLink : `https://www.youtube.com/watch?v=${liveLink}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-red-600 font-bold hover:underline flex items-center gap-1.5 text-xs"
                                >
                                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                  Live / Video
                                </a>
                              ) : (
                                <span className="text-gray-300 text-xs">None</span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => handleDeleteWork(w.title)}
                                className="text-red-500 font-bold hover:underline text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {spreadsheetWorks.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 italic">No work records found in spreadsheet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="space-y-12 animate-fadeIn">
              <div className="max-w-3xl mx-auto bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-900">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Village Financial Entry</h2>
                <form onSubmit={handleAccountingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <select className="px-6 py-4 rounded-2xl bg-gray-50 font-bold" value={accountingFormData.FinancialYear} onChange={(e)=>setAccountingFormData({...accountingFormData, FinancialYear: e.target.value})}>
                      {getFinancialYearsList().map(y => (
                        <option key={y} value={y}>{y} FY</option>
                      ))}
                    </select>
                    <select className="px-6 py-4 rounded-2xl bg-gray-50" value={accountingFormData.Month} onChange={(e)=>setAccountingFormData({...accountingFormData, Month: e.target.value})}>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Income', 'Expenditure', 'No Income', 'No Expenditure'].map(t => (
                      <button 
                        type="button" 
                        key={t} 
                        onClick={() => {
                          setAccountingFormData({
                            ...accountingFormData, 
                            Type: t,
                            Description: (t === 'No Income' || t === 'No Expenditure') ? '' : accountingFormData.Description,
                            BillLink: (t === 'No Income' || t === 'No Expenditure') ? '#' : (accountingFormData.BillLink === '#' ? '' : accountingFormData.BillLink)
                          });
                        }} 
                        className={`py-3 px-2 rounded-2xl border-2 font-black text-xs uppercase text-center transition-all ${
                          accountingFormData.Type === t 
                            ? t.startsWith('No') 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : 'bg-orange-600 text-white border-orange-600' 
                            : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  
                  {(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure') ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold leading-relaxed">
                      💡 You are marking this month as having <span className="font-black underline">{accountingFormData.Type}</span>. Custom description and official bill link fields are optional and will default to compliance values if left empty.
                    </div>
                  ) : null}

                  <input 
                    required={!(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure')} 
                    type="text" 
                    placeholder={(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure') ? "Custom Description / Note (Optional)" : "Description"} 
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50" 
                    value={accountingFormData.Description} 
                    onChange={(e)=>setAccountingFormData({...accountingFormData, Description: e.target.value})} 
                  />
                  
                  <input 
                    required={!(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure')} 
                    type={(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure') ? "text" : "url"} 
                    placeholder={(accountingFormData.Type === 'No Income' || accountingFormData.Type === 'No Expenditure') ? "Official Link (Optional, defaults to 'none')" : "Official Link (Bill/Receipt URL)"} 
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50" 
                    value={accountingFormData.BillLink === '#' ? '' : accountingFormData.BillLink} 
                    onChange={(e)=>setAccountingFormData({...accountingFormData, BillLink: e.target.value || '#'})} 
                  />
                  
                  <button type="submit" disabled={status === 'submitting'} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50">
                    {status === 'submitting' 
                      ? 'Submitting...' 
                      : (accountingFormData.Type.startsWith('No') ? `Confirm ${accountingFormData.Type} Status` : "Log Financial Record")
                    }
                  </button>
                </form>
              </div>

              {/* Accounting Table */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Recent Financial Entries</h2>
                  <button onClick={fetchSpreadsheetAccounting} className="text-orange-600 font-bold">Sync Data</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">Year</th>
                        <th className="pb-4">Month</th>
                        <th className="pb-4">Type</th>
                        <th className="pb-4">Description</th>
                        <th className="pb-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetAccounting.map((a, idx) => (
                        <tr key={idx}>
                          <td className="py-4 text-sm font-bold text-gray-500">{a.FinancialYear}</td>
                          <td className="py-4 text-sm font-bold text-gray-500">{a.Month}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                              a.Type === 'Income' 
                                ? 'bg-green-100 text-green-700' 
                                : a.Type === 'Expenditure' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {a.Type}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-sm truncate max-w-[200px]">{a.Description}</td>
                          <td className="py-4 text-right">
                            <button 
                              disabled={deletingAccountingDesc !== null}
                              onClick={() => handleDeleteAccounting(a.Description)}
                              className="text-red-500 font-bold hover:underline text-xs disabled:opacity-50"
                            >
                              {deletingAccountingDesc === a.Description ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {spreadsheetAccounting.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 italic">No financial records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Direct Database Accounting Architecture Card */}
              <div className="bg-slate-900 text-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Direct Database Accounting &bull; No Google Sheet Dependency</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-orange-400">Village Accounting &amp; Vouchers (2026-27)</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      All monthly income and expenditure vouchers are stored directly in your Supabase table <code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">village_panchayat_accounting</code> with instant cloud sync.
                    </p>
                  </div>
                  <button
                    onClick={fetchSpreadsheetAccounting}
                    disabled={isRefreshing}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync Vouchers</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs text-gray-300">
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <strong className="block text-orange-400 font-black mb-1">1. Live Database Table</strong>
                    Records sync seamlessly with <code className="text-white bg-slate-900 px-1 py-0.5 rounded">village_panchayat_accounting</code>.
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <strong className="block text-orange-400 font-black mb-1">2. Offline Fallback Cache</strong>
                    Cached locally in browser storage so vouchers remain accessible 24/7 even offline.
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <strong className="block text-orange-400 font-black mb-1">3. Document &amp; Bill Attachments</strong>
                    Bill vouchers and receipt links can be PDF documents or cloud storage links.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'joinRequests' && (() => {
            const getNormalizedStatus = (statusStr?: string) => {
              const s = String(statusStr || '').trim().toLowerCase();
              if (s === 'approved') return 'Approved';
              if (s === 'rejected') return 'Rejected';
              return 'In Progress';
            };

            const inProgressCount = spreadsheetJoinRequests.filter(r => getNormalizedStatus(r.status) === 'In Progress').length;
            const approvedCount = spreadsheetJoinRequests.filter(r => getNormalizedStatus(r.status) === 'Approved').length;
            const rejectedCount = spreadsheetJoinRequests.filter(r => getNormalizedStatus(r.status) === 'Rejected').length;

            const visibleRequests = spreadsheetJoinRequests.filter(req => {
              const st = getNormalizedStatus(req.status);
              return st === 'In Progress';
            });

            return (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                  {/* Header & Controls */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          Database: membership_requests
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                          {inProgressCount} In Progress
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        Membership Join Requests
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Review submitted applications. New submissions default to <strong>In Progress</strong>. Approving a request marks their status as <strong>Approved</strong>, adds them to <strong>Users</strong>, and moves them directly into the public <strong>Members</strong> directory.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Filter Toggle - Simplified to only show In Progress */}
                      <div className="flex flex-wrap items-center bg-gray-100 p-1.5 rounded-2xl gap-1">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 bg-amber-500 text-white shadow-sm"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress ({inProgressCount})</span>
                        </button>
                      </div>

                      <button 
                        onClick={fetchSpreadsheetJoinRequests} 
                        disabled={isRefreshing}
                        className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-blue-100 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync Requests'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Submissions</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{spreadsheetJoinRequests.length}</p>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">In Progress</p>
                      <p className="text-xl font-black text-amber-700 mt-1">{inProgressCount}</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Approved (In Users)</p>
                      <p className="text-xl font-black text-emerald-700 mt-1">{approvedCount}</p>
                    </div>
                    <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Rejected</p>
                      <p className="text-xl font-black text-rose-700 mt-1">{rejectedCount}</p>
                    </div>
                  </div>

                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-gray-100">
                        <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          <th className="pb-4">Photo</th>
                          <th className="pb-4">Applicant</th>
                          <th className="pb-4">Address</th>
                          <th className="pb-4">Reason / Motivation</th>
                          <th className="pb-4">Request Status</th>
                          <th className="pb-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visibleRequests.map((req, idx) => {
                          const currentStatus = getNormalizedStatus(req.status);
                          const isProcessing = processingRequest === req.fullName;

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 pr-4 align-top">
                                {req.photoUrl ? (
                                  <img 
                                    src={req.photoUrl} 
                                    alt={req.fullName} 
                                    className="w-16 h-16 object-cover rounded-2xl border border-gray-200 shadow-sm" 
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">
                                    N/A
                                  </div>
                                )}
                              </td>

                              <td className="py-4 pr-4 align-top">
                                <p className="font-bold text-gray-900 text-sm">{req.fullName}</p>
                                {req.email ? (
                                  <p className="text-xs text-blue-600 font-medium break-all">{req.email}</p>
                                ) : (
                                  <p className="text-xs text-amber-600 italic">No email provided</p>
                                )}
                                {req.phone && (
                                  <p className="text-xs text-gray-500 mt-0.5">Phone: {req.phone}</p>
                                )}
                                {req.dob && (
                                  <p className="text-xs text-gray-400 mt-0.5">DOB: {req.dob}</p>
                                )}
                                {req.date && (
                                  <p className="text-[10px] text-gray-400 font-mono mt-1">Submitted: {formatDisplayDate(req.date)}</p>
                                )}
                              </td>

                              <td className="py-4 pr-4 text-xs text-gray-600 max-w-[200px] break-words align-top leading-relaxed">
                                {req.address || <span className="text-gray-300 italic">Not provided</span>}
                              </td>

                              <td className="py-4 pr-4 text-xs text-gray-600 max-w-[220px] break-words align-top leading-relaxed">
                                {req.reason || <span className="text-gray-300 italic">No reason provided</span>}
                              </td>

                              <td className="py-4 pr-4 align-top">
                                {currentStatus === 'Approved' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black uppercase tracking-wider">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Approved
                                  </span>
                                )}
                                {currentStatus === 'Rejected' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-black uppercase tracking-wider">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Rejected
                                  </span>
                                )}
                                {currentStatus === 'In Progress' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-black uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5" />
                                    In progress
                                  </span>
                                )}
                              </td>

                              <td className="py-4 text-right align-top">
                                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                                  {currentStatus === 'In Progress' && (
                                    <>
                                      <button
                                        disabled={isProcessing}
                                        onClick={() => handleApproveJoinRequest(req)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{isProcessing ? 'Saving...' : 'Approve'}</span>
                                      </button>
                                      <button
                                        disabled={isProcessing}
                                        onClick={() => handleRejectJoinRequest(req)}
                                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    </>
                                  )}

                                  {currentStatus === 'Rejected' && (
                                    <>
                                      <button
                                        disabled={isProcessing}
                                        onClick={() => handleApproveJoinRequest(req)}
                                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                      >
                                        Re-Approve
                                      </button>
                                      <button
                                        disabled={isProcessing}
                                        onClick={() => handleDeleteJoinRequest(req)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-xs font-bold uppercase transition-all"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}

                                  {currentStatus === 'Approved' && (
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        In Users List
                                      </span>
                                      <button
                                        onClick={() => setActiveTab('users')}
                                        className="text-[10px] text-blue-600 hover:underline font-black uppercase tracking-wider mt-1 block"
                                      >
                                        View in Users &rarr;
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {visibleRequests.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-14 text-center text-gray-400">
                              <p className="font-bold text-sm text-gray-700 mb-1">
                                {joinRequestFilter === 'in_progress' 
                                  ? 'No pending join requests in progress.' 
                                  : joinRequestFilter === 'approved'
                                    ? 'No approved membership requests found.'
                                    : joinRequestFilter === 'rejected'
                                      ? 'No rejected requests found.'
                                      : 'No join requests found in history.'}
                              </p>
                              <p className="text-xs text-gray-400 max-w-md mx-auto">
                                {joinRequestFilter === 'in_progress'
                                  ? 'All incoming membership applications have been reviewed and processed.'
                                  : 'Membership applications will appear here when submitted through the public Join page.'}
                              </p>
                              {joinRequestFilter === 'in_progress' && approvedCount > 0 && (
                                <button
                                  onClick={() => setJoinRequestFilter('approved')}
                                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>View {approvedCount} approved members in history</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
          {activeTab === 'users' && loggedInUser?.role === 'admin' && (() => {
            const roleCount = {
              total: spreadsheetUsers.length,
              admin: spreadsheetUsers.filter(u => String(u.role || '').toLowerCase() === 'admin').length,
              treasurer: spreadsheetUsers.filter(u => {
                const r = String(u.role || '').toLowerCase();
                return r === 'treasurer' || r === 'tressurer';
              }).length,
              member: spreadsheetUsers.filter(u => String(u.role || '').toLowerCase() === 'phdy_member').length,
              user: spreadsheetUsers.filter(u => {
                const r = String(u.role || '').toLowerCase();
                return r !== 'admin' && r !== 'treasurer' && r !== 'tressurer' && r !== 'phdy_member';
              }).length
            };

            const term = String(userSearchTerm || '').trim().toLowerCase();
            const filteredUsers = spreadsheetUsers.filter(u => {
              const r = String(u.role || '').toLowerCase();
              const matchesSearch = 
                !term ||
                String(u.name || '').toLowerCase().includes(term) ||
                String(u.email || '').toLowerCase().includes(term);
              
              if (!matchesSearch) return false;
              if (userRoleFilter === 'all') return true;
              if (userRoleFilter === 'admin') return r === 'admin';
              if (userRoleFilter === 'treasurer') return r === 'treasurer' || r === 'tressurer';
              if (userRoleFilter === 'phdy_member') return r === 'phdy_member';
              if (userRoleFilter === 'user') return r !== 'admin' && r !== 'treasurer' && r !== 'tressurer' && r !== 'phdy_member';
              return true;
            });

            const getRoleBadgeConfig = (roleStr: string) => {
              const r = String(roleStr || '').toLowerCase();
              if (r === 'admin') {
                return {
                  label: 'Admin',
                  badgeCls: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                  icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                };
              }
              if (r === 'treasurer' || r === 'tressurer') {
                return {
                  label: 'Treasurer',
                  badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  icon: <Coins className="w-3.5 h-3.5 text-emerald-600" />
                };
              }
              if (r === 'Phdy_member') {
                return {
                  label: 'PHDY Member',
                  badgeCls: 'bg-orange-50 text-orange-700 border border-orange-200',
                  icon: <Users className="w-3.5 h-3.5 text-orange-600" />
                };
              }
              return {
                label: 'User',
                badgeCls: 'bg-gray-100 text-gray-600 border border-gray-200',
                icon: <UserCheck className="w-3.5 h-3.5 text-gray-500" />
              };
            };

            return (
              <div className="space-y-8 animate-fadeIn">
                {/* Header & Sync */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-xl border border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                          Admin-Only Access
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mt-1">
                        Manage Users & Access Roles
                      </h2>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Promote, assign, and govern roles for village members and portal users.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-200"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add User</span>
                      </button>

                      <button 
                        onClick={fetchSpreadsheetUsers} 
                        disabled={isRefreshing}
                        className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-indigo-200 shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync Users'}</span>
                      </button>
                    </div>
                  </div>

                  {userRoleSuccess && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{userRoleSuccess}</span>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Users</div>
                      <div className="text-2xl font-black text-gray-900 mt-1">{roleCount.total}</div>
                    </div>
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Admins
                      </div>
                      <div className="text-2xl font-black text-indigo-700 mt-1">{roleCount.admin}</div>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                        <Coins className="w-3 h-3" /> Treasurers
                      </div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">{roleCount.treasurer}</div>
                    </div>
                    <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-orange-500 tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3" /> Members
                      </div>
                      <div className="text-2xl font-black text-orange-700 mt-1">{roleCount.member}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Normal Users
                      </div>
                      <div className="text-2xl font-black text-gray-700 mt-1">{roleCount.user}</div>
                    </div>
                  </div>

                  {/* Role Permissions Guide */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 mb-6">
                    <div className="font-black uppercase tracking-wider text-[10px] text-amber-800 mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Role Privileges & Rules:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-[11px] leading-relaxed">
                      <div className="bg-white/70 p-2.5 rounded-xl border border-amber-200/40">
                        <strong className="text-indigo-800">Admin:</strong> Full control over all data tabs, members, works, accounting, funds, and user roles.
                      </div>
                      <div className="bg-white/70 p-2.5 rounded-xl border border-amber-200/40">
                        <strong className="text-emerald-800">Treasurer:</strong> Direct access to PHDY Internal and financial records, with rights to record and manage funds.
                      </div>
                      <div className="bg-white/70 p-2.5 rounded-xl border border-amber-200/40">
                        <strong className="text-orange-800">PHDY Member:</strong> Verified access to PHDY Internal portal, resolutions, member lists, and minutes.
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center pt-2 border-t border-gray-100">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search by user name or email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-gray-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filter:
                      </span>
                      {[
                        { id: 'all', label: `All (${roleCount.total})` },
                        { id: 'admin', label: `Admins (${roleCount.admin})` },
                        { id: 'treasurer', label: `Treasurers (${roleCount.treasurer})` },
                        { id: 'phdy_member', label: `Members (${roleCount.member})` },
                        { id: 'user', label: `Users (${roleCount.user})` },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setUserRoleFilter(f.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            userRoleFilter === f.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-gray-100">
                        <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          <th className="pb-4">User</th>
                          <th className="pb-4">Email Address</th>
                          <th className="pb-4">Current Role</th>
                          <th className="pb-4 text-right">Promote / Change Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map((u, idx) => {
                          const roleInfo = getRoleBadgeConfig(u.role);
                          const isUpdating = updatingUserEmail === u.email;
                          const isCurrentUser = Boolean(loggedInUser?.email && String(loggedInUser.email).toLowerCase() === String(u.email || '').toLowerCase());
                          const currentNormRole = (String(u.role || '').toLowerCase() === 'tressurer') ? 'treasurer' : (u.role || 'user');

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 font-black text-xs flex items-center justify-center border border-orange-200 flex-shrink-0">
                                    {(u.name || u.email || '?')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                      <span>{u.name || u.email.split('@')[0]}</span>
                                      {isCurrentUser && (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-400 sm:hidden">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 text-xs font-semibold text-gray-600 hidden sm:table-cell">
                                {u.email}
                              </td>

                              <td className="py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${roleInfo.badgeCls}`}>
                                  {roleInfo.icon}
                                  <span>{roleInfo.label}</span>
                                </span>
                              </td>

                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                                  {/* Roles Dropdown to promote as admin, treasurer, phdy_member, user */}
                                  <div className="relative inline-block">
                                    <select
                                      value={currentNormRole}
                                      onChange={(e) => handleUpdateUserRole(u.email, e.target.value)}
                                      disabled={isUpdating}
                                      className="px-3 py-1.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                      title="Select role to promote/change"
                                    >
                                      <option value="admin">👑 Promote to Admin</option>
                                      <option value="treasurer">💰 Promote to Treasurer</option>
                                      <option value="phdy_member">🛡️ Set as PHDY Member</option>
                                      <option value="user">👤 Set as Standard User</option>
                                    </select>
                                  </div>

                                  {!isCurrentUser && (
                                    <button
                                      onClick={() => handleDeleteUser(u.email)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                      title="Remove user"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  {isUpdating && (
                                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-400 italic text-sm">
                              {userSearchTerm || userRoleFilter !== 'all'
                                ? 'No users matched your search/filter criteria.'
                                : 'No registered users found in the system.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Add New User</h3>
                            <p className="text-xs text-gray-500">Create and assign access role</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsAddUserModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold transition-all"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramesh Kumar"
                            value={newUserData.name}
                            onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. ramesh@example.com"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Assign Initial Role</label>
                          <select
                            value={newUserData.role}
                            onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all cursor-pointer"
                          >
                            <option value="admin">👑 Admin (Full Access)</option>
                            <option value="treasurer">💰 Treasurer (Funds & Internal Access)</option>
                            <option value="Phdy_member">🛡️ PHDY Member (Internal Portal)</option>
                            <option value="user">👤 Standard User</option>
                          </select>
                        </div>

                        <div className="pt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => setIsAddUserModalOpen(false)}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-all"
                          >
                            Save User
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Approved Member Confirmation Modal (No Password Displayed) */}
      {approvedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Member Approved!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Application status updated to <strong>&quot;Approved&quot;</strong> in database and added to <strong>Members Directory</strong>.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 mb-6 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Member Name</span>
                <span className="font-black text-gray-900">{approvedCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Email Address</span>
                <span className="font-bold font-mono text-gray-800">{approvedCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Membership Role</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  {approvedCredentials.role}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Automated Email</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[10px]">
                  ✉️ Activation Email Dispatched
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 mb-5 leading-relaxed">
              <p className="font-bold mb-0.5">🔒 Automated Email & Activation:</p>
              <p className="text-[11px] text-emerald-800">
                Activation request was sent via Supabase. You can also send a pre-filled approval letter directly using Gmail or your default email app below.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Direct Gmail Web 1-Click Send */}
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(approvedCredentials.email)}&su=${encodeURIComponent('PHDY Membership Application Approved - Welcome to Pedda Harivanam Youth!')}&body=${encodeURIComponent(`Dear ${approvedCredentials.name},\n\nCongratulations! Your PHDY Membership application has been officially APPROVED by the Administrator.\n\nYour account details:\n• Name: ${approvedCredentials.name}\n• Email: ${approvedCredentials.email}\n• Role: Official PHDY Member (Tier 2 Access)\n• Status: Active\n\nYou can now log in to access the PHDY Members Directory and Internal Treasury:\n👉 Official Portal: https://phdy.vercel.app/#login\n\nIf you haven't set up a password yet, simply sign in or reset your password on the portal using this registered email address (${approvedCredentials.email}).\n\nWarm regards,\nPedda Harivanam Development Youth (PHDY)`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>✉️ Send via Gmail (Web)</span>
              </a>

              {/* Default Mail Client mailto: */}
              <a
                href={`mailto:${approvedCredentials.email}?subject=${encodeURIComponent('PHDY Membership Application Approved - Welcome to Pedda Harivanam Youth!')}&body=${encodeURIComponent(`Dear ${approvedCredentials.name},\n\nCongratulations! Your PHDY Membership application has been officially APPROVED by the Administrator.\n\nYour account details:\n• Name: ${approvedCredentials.name}\n• Email: ${approvedCredentials.email}\n• Role: Official PHDY Member (Tier 2 Access)\n• Status: Active\n\nYou can now log in to access the PHDY Members Directory and Internal Treasury:\n👉 Official Portal: https://phdy.vercel.app/#login\n\nIf you haven't set up a password yet, simply sign in or reset your password on the portal using this registered email address (${approvedCredentials.email}).\n\nWarm regards,\nPedda Harivanam Development Youth (PHDY)`)}`}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>📧 Open Default Email App</span>
              </a>

              {/* WhatsApp Notification */}
              {approvedCredentials.phone && (
                <a
                  href={`https://api.whatsapp.com/send?phone=91${approvedCredentials.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Hello ${approvedCredentials.name},\n\nCongratulations! Your PHDY Membership application has been APPROVED by the Administrator.\n\nAn activation email has been sent to ${approvedCredentials.email} to activate your account.\n\nPortal: https://phdy.vercel.app/#login\n\nPedda Harivanam Youth (PHDY)`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>📲 Notify on WhatsApp</span>
                </a>
              )}

              {/* Copy Email Letter Button */}
              <button
                type="button"
                onClick={() => {
                  const letter = `Dear ${approvedCredentials.name},\n\nCongratulations! Your PHDY Membership application has been officially APPROVED by the Administrator.\n\nYour account details:\n• Name: ${approvedCredentials.name}\n• Email: ${approvedCredentials.email}\n• Role: Official PHDY Member (Tier 2 Access)\n• Status: Active\n\nYou can now log in to access the PHDY Members Directory and Internal Treasury:\n👉 Official Portal: https://phdy.vercel.app/#login\n\nWarm regards,\nPedda Harivanam Development Youth (PHDY)`;
                  navigator.clipboard.writeText(letter);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 3000);
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
              >
                <span>{copiedCreds ? '✅ Copied to Clipboard!' : '📋 Copy Approval Letter Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => setApprovedCredentials(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fadeIn">
            <h2 className="text-xl font-black uppercase text-gray-900 mb-4">Update Password</h2>
            
            {resetPopupState === 'idle' && (
              <>
                <p className="text-sm text-gray-500 mb-6">We will send a one-time password (OTP) to <b>{loggedInUser.email}</b> to verify it's you.</p>
                <div className="flex space-x-3">
                  <button onClick={() => setShowResetPopup(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase text-xs">Cancel</button>
                  <button onClick={handlePopupRequestOtp} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold uppercase text-xs">Send OTP</button>
                </div>
              </>
            )}

            {resetPopupState === 'sending_otp' && (
              <div className="py-8 text-center text-orange-600 font-bold animate-pulse">Sending OTP...</div>
            )}

            {(resetPopupState === 'awaiting_otp' || resetPopupState === 'resetting') && (
              <form onSubmit={handlePopupResetPassword} className="space-y-4">
                <input 
                  required 
                  placeholder="Enter 6-digit OTP" 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none"
                  value={resetData.otp}
                  onChange={e => setResetData({...resetData, otp: e.target.value})}
                />
                <input 
                  required 
                  placeholder="New Password" 
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none"
                  value={resetData.newPassword}
                  onChange={e => setResetData({...resetData, newPassword: e.target.value})}
                />
                {resetError && <p className="text-xs text-red-600 font-bold">{resetError}</p>}
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => {setShowResetPopup(false); setResetPopupState('idle');}} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase text-xs">Cancel</button>
                  <button type="submit" disabled={resetPopupState === 'resetting'} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold uppercase text-xs disabled:opacity-50">
                    {resetPopupState === 'resetting' ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            )}

            {resetPopupState === 'success' && (
              <div className="py-8 text-center">
                <div className="text-green-500 font-black mb-2 text-xl">SUCCESS!</div>
                <p className="text-gray-500 text-sm">Your password has been updated.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;