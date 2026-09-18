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
  ShieldAlert
} from 'lucide-react';
import { LoggedInUser } from '../App';
import { getCurrentFinancialYear, getFinancialYearsList } from '../types';
import aboutConfigData from '../public/AboutConfig.json';

const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';
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
  role: 'admin' | 'treasurer' | 'phdy_member' | 'user' | string;
  joinedDate?: string;
  status?: string;
}

export const loadInitialUsers = (currentLoggedInUser?: LoggedInUser | null): SystemUserRecord[] => {
  const userMap = new Map<string, SystemUserRecord>();

  // Only include the current logged-in user as a safety base to ensure the UI remains accessible
  if (currentLoggedInUser && currentLoggedInUser.email) {
    const key = currentLoggedInUser.email.toLowerCase().trim();
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
  
  // Add user modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{ name: string; email: string; role: string }>({
    name: '',
    email: '',
    role: 'phdy_member'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workPhotosRef = useRef<HTMLInputElement>(null);
  const workDocsRef = useRef<HTMLInputElement>(null);

  const fetchSpreadsheetMembers = async () => {
    if (!loggedInUser) return;
    setIsRefreshing(true);
    try {
      // 1. Get legacy founding members from config
      const config = Array.isArray(aboutConfigData) ? aboutConfigData[0] : aboutConfigData;
      const legacy: any[] = config?.members || [];

      // 2. Fetch from spreadsheet if available
      let membersFromSheet: any[] = [];
      if (SPREADSHEET_API_URL) {
        try {
          const res = await fetch(`${SPREADSHEET_API_URL}?type=members&_t=${Date.now()}`, { cache: 'no-store' });
          const text = await res.text();
          if (!text.trim().startsWith('<')) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) membersFromSheet = parsed;
            else if (Array.isArray(parsed.data)) membersFromSheet = parsed.data;
          }
        } catch (e) {}
      }

      // 3. Collect from approved join requests in cache and state
      let cachedApprovedReqs: any[] = [];
      try {
        const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
        cachedApprovedReqs = cached.filter(r => {
          const st = String(r.status || r.Status || '').trim().toLowerCase();
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
        const key = (email || name).toLowerCase();
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
        const key = (email || name).toLowerCase();
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

      // D. Overlay direct spreadsheet entries if present
      membersFromSheet.forEach((m: any) => {
        const key = String(m.Name || m.name || '').trim().toLowerCase();
        if (key) {
          const existing = memberMap.get(key);
          memberMap.set(key, {
            ...existing,
            ...m,
            Status: 'Approved'
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
    if (!SPREADSHEET_API_URL || !loggedInUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=accounting&_t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      let data = [];
      if (text.trim().startsWith('<')) {
        console.warn("Spreadsheet API returned HTML instead of JSON. Check the Apps Script deployment.");
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse accounting data as JSON:", e);
        }
      }
      setSpreadsheetAccounting(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch accounting:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetWorks = async () => {
    if (!SPREADSHEET_API_URL || !loggedInUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=works&_t=${Date.now()}`);
      const text = await res.text();
      let data = [];
      if (text.trim().startsWith('<')) {
        console.warn("Spreadsheet API returned HTML instead of JSON. Check the Apps Script deployment.");
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse works data as JSON:", e);
        }
      }
      setSpreadsheetWorks(Array.isArray(data) ? data : []);
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
      const normalizeStatus = (raw?: string): 'In Progress' | 'Approved' | 'Rejected' => {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'approved' || s === 'accept' || s === 'accepted') return 'Approved';
        if (s === 'rejected' || s === 'reject' || s === 'declined') return 'Rejected';
        return 'In Progress';
      };

      const parseResponseArray = (text: string): any[] => {
        if (!text || text.trim().startsWith('<')) return [];
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
          if (Array.isArray(parsed.data)) return parsed.data;
          if (Array.isArray(parsed.requests)) return parsed.requests;
          if (Array.isArray(parsed.rows)) return parsed.rows;
          if (Array.isArray(parsed.records)) return parsed.records;
          return [];
        } catch (e) {
          return [];
        }
      };

      let data: any[] = [];
      if (SPREADSHEET_API_URL) {
        // 1. Try GET ?type=join_requests&sheet=JoinRequests
        try {
          const res = await fetch(`${SPREADSHEET_API_URL}?type=join_requests&sheet=JoinRequests&_t=${Date.now()}`, { cache: 'no-store' });
          const text = await res.text();
          data = parseResponseArray(text);
        } catch (e) {}

        // 2. Try GET ?type=JoinRequests
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const res = await fetch(`${SPREADSHEET_API_URL}?type=JoinRequests&_t=${Date.now()}`, { cache: 'no-store' });
            const text = await res.text();
            data = parseResponseArray(text);
          } catch (e) {}
        }

        // 3. Try GET ?type=joinRequests
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const res = await fetch(`${SPREADSHEET_API_URL}?type=joinRequests&_t=${Date.now()}`, { cache: 'no-store' });
            const text = await res.text();
            data = parseResponseArray(text);
          } catch (e) {}
        }

        // 4. Try POST with action 'get_join_requests'
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const postRes = await fetch(SPREADSHEET_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'get_join_requests', type: 'join_requests', sheet: 'JoinRequests' })
            });
            const postText = await postRes.text();
            data = parseResponseArray(postText);
          } catch (e) {}
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
              reqMap.set(key, {
                ...r,
                status: normalizeStatus(r.status || r.Status)
              });
            }
          }
        });
      }

      // Populate / merge spreadsheet records
      if (Array.isArray(data)) {
        data.forEach(r => {
          if (r) {
            const fullName = r.FullName || r.fullName || r['Full Name'] || r.Name || r.name || '';
            const email = r.Email || r.email || '';
            const phone = r.Phone || r.phone || r['Phone Number'] || r.PhoneNumber || '';
            const dob = r.DOB || r.dob || r['Date of Birth'] || r.DateOfBirth || '';
            const address = r.Address || r.address || '';
            const reason = r.Reason || r.reason || '';
            const photoUrl = r.PhotoUrl || r.photoUrl || r.Photo || r.photo || r.Image || r.image || r.ImageURL || '';
            const rawStatus = r.Status || r.status || r['Request Status'] || r.RequestStatus || '';
            const status = normalizeStatus(rawStatus);
            const date = r.Date || r.date || r.Timestamp || r.timestamp || '';

            const key = String(email || fullName).toLowerCase().trim();
            if (key) {
              const existing = reqMap.get(key);
              reqMap.set(key, {
                fullName: fullName || existing?.fullName || 'Applicant',
                email: email || existing?.email || '',
                phone: phone || existing?.phone || '',
                dob: dob || existing?.dob || '',
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
      let data: any[] = [];
      if (SPREADSHEET_API_URL) {
        // 1. Try GET ?type=users
        try {
          const res = await fetch(`${SPREADSHEET_API_URL}?type=users&_t=${Date.now()}`, { cache: 'no-store' });
          const text = await res.text();
          if (!text.trim().startsWith('<')) {
            data = JSON.parse(text);
          }
        } catch (e) {
          console.warn("Spreadsheet GET users failed:", e);
        }

        // 2. Try GET ?type=Users
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const res = await fetch(`${SPREADSHEET_API_URL}?type=Users&_t=${Date.now()}`, { cache: 'no-store' });
            const text = await res.text();
            if (!text.trim().startsWith('<')) {
              data = JSON.parse(text);
            }
          } catch (e) {}
        }

        // 3. Try POST with action 'get_users'
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const postRes = await fetch(SPREADSHEET_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'get_users' })
            });
            const postText = await postRes.text();
            if (!postText.trim().startsWith('<')) {
              const postJson = JSON.parse(postText);
              if (Array.isArray(postJson)) data = postJson;
              else if (Array.isArray(postJson.users)) data = postJson.users;
              else if (Array.isArray(postJson.data)) data = postJson.data;
            }
          } catch (e) {}
        }
      }

      // Base users: Only the current logged-in admin as a fallback to keep the session alive
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

      if (Array.isArray(data) && data.length > 0) {
        data.forEach(u => {
          if (u && (u.Email || u.email)) {
            const email = String(u.Email || u.email).toLowerCase().trim();
            const existing = userMap.get(email);
            userMap.set(email, {
              name: u.Name || u.name || u.FullName || u.fullName || existing?.name || email.split('@')[0],
              email: email,
              role: u.Role || u.role || existing?.role || 'user',
              joinedDate: u.JoinedDate || u.date || u.joinedDate || existing?.joinedDate || '2025-01-01',
              status: u.Status || u.status || existing?.status || 'Active'
            });
          }
        });
      }

      const mergedList: any[] = Array.from(userMap.values());
      setSpreadsheetUsers(mergedList);
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

    const emailLower = newUserData.email.trim().toLowerCase();
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

    // 2. Post to spreadsheet API
    try {
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'register',
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          password: 'TemporaryPassword123!'
        })
      });
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
    if (email.toLowerCase() === loggedInUser.email.toLowerCase()) {
      alert("You cannot delete your own logged-in administrator account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove user "${email}" from the system?`)) return;

    try {
      // 1. Update state
      setSpreadsheetUsers(prev => prev.filter(u => String(u.email).toLowerCase() !== email.toLowerCase()));

      // 2. Post delete to spreadsheet
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_user',
          email: email
        })
      });

      setUserRoleSuccess(`User ${email} was removed from the directory.`);
      setTimeout(() => setUserRoleSuccess(''), 5000);
    } catch (err) {
      console.warn("Could not delete user from server:", err);
    }
  };

  const handleUpdateUserRole = async (email: string, targetRole: string) => {
    if (!loggedInUser || loggedInUser.role !== 'admin') {
      alert("Permission denied: Only an Administrator can promote or change user roles.");
      return;
    }

    const targetUser = spreadsheetUsers.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    const currentRole = targetUser?.role || 'user';
    if (currentRole === targetRole) return;

    const roleNameMap: Record<string, string> = {
      admin: 'Administrator (Full Access)',
      treasurer: 'Treasurer (Funds & Internal Access)',
      phdy_member: 'PHDY Member (Internal Portal)',
      user: 'Standard Registered User'
    };
    const targetRoleLabel = roleNameMap[targetRole] || targetRole;

    if (email.toLowerCase() === loggedInUser.email.toLowerCase() && targetRole !== 'admin') {
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
      // Send role update request to Apps Script
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_user_role',
          email: email,
          role: targetRole,
          newRole: targetRole,
          updatedBy: loggedInUser.email
        })
      });

      // Also trigger promote_user if promoting to admin
      if (targetRole === 'admin') {
        try {
          await fetch(SPREADSHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'promote_user',
              email: email
            })
          });
        } catch (e) {}
      }

      // Immediately update local state
      setSpreadsheetUsers(prev => {
        const exists = prev.some(u => String(u.email).toLowerCase() === String(email).toLowerCase());
        if (exists) {
          return prev.map(u => String(u.email).toLowerCase() === String(email).toLowerCase() ? { ...u, role: targetRole } : u);
        }
        return [...prev, { name: email.split('@')[0], email, role: targetRole }];
      });

      // Update current session if the admin edited their own account
      if (email.toLowerCase() === loggedInUser.email.toLowerCase()) {
        const updatedSelf = { ...loggedInUser, role: targetRole };
        sessionStorage.setItem('phdy_admin_session', JSON.stringify(updatedSelf));
        onLoginSuccess(updatedSelf);
      }

      setUserRoleSuccess(`User role for ${email} has been updated to ${targetRoleLabel}.`);
      setTimeout(() => setUserRoleSuccess(''), 5000);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      alert(`Could not complete role update for ${email}. Please check your connection and try again.`);
    } finally {
      setUpdatingUserEmail(null);
    }
  };

  const handlePromoteUser = (email: string) => {
    handleUpdateUserRole(email, 'admin');
  };

  useEffect(() => {
    if (loggedInUser) {
      const roleLower = String(loggedInUser.role || '').toLowerCase();
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

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthenticating(true);
    try {
      let action = '';
      if (authMode === 'login') action = 'login';
      else if (authMode === 'register') action = 'register';
      else if (authMode === 'forgot') action = 'request_otp';
      else if (authMode === 'reset') action = 'reset_password';

      // Use text/plain to avoid CORS preflight while still sending JSON string
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: action,
          name: loginData.name || '',
          email: loginData.email,
          password: loginData.password,
          newPassword: loginData.newPassword,
          otp: loginData.otp
        })
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        if (responseText.includes("MailApp") || responseText.includes("permission")) {
          throw new Error("Apps Script requires Email permissions. Go to your script, run 'setupFirstAdmin' to trigger the authorization prompt, then Deploy as a NEW VERSION.");
        }
        throw new Error("Invalid response from server. Check deployment.");
      }
      
      if (data.status === 'success') {
        if (authMode === 'login') {
          const userRole = String(data.user.role || '').toLowerCase();
          onLoginSuccess({ email: data.user.email, role: data.user.role });
          if (userRole === 'admin') {
            // Stay in admin section
          } else if (userRole === 'phdy_member' || userRole === 'treasurer' || userRole === 'tressurer') {
            if (onNavigate) onNavigate('internal');
          } else {
            if (onNavigate) onNavigate('home');
          }
        } else if (authMode === 'register') {
          // Immediately record new registered user into system user directory
          const newRegUser = {
            name: (loginData.name || '').trim() || loginData.email.split('@')[0],
            email: loginData.email.trim().toLowerCase(),
            role: 'user',
            joinedDate: new Date().toISOString().split('T')[0],
            status: 'Pending Approval'
          };
          try {
            const existingList: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
            if (!existingList.some(u => String(u.email || '').toLowerCase() === newRegUser.email)) {
              existingList.unshift(newRegUser);
              localStorage.setItem('phdy_registered_users_list', JSON.stringify(existingList));
            }
          } catch (e) {}
          setSpreadsheetUsers(prev => {
            if (!prev.some(u => String(u.email || '').toLowerCase() === newRegUser.email)) {
              return [newRegUser, ...prev];
            }
            return prev;
          });
          setAuthSuccess('Registration successful. An admin must approve your access before logging in.');
          setAuthMode('login');
        } else if (authMode === 'forgot') {
          setAuthSuccess('An OTP has been sent to your email.');
          setAuthMode('reset');
        } else if (authMode === 'reset') {
          setAuthSuccess('Password reset successfully. You can now login.');
          setAuthMode('login');
        }
      } else {
        setAuthError(data.message || 'Authentication failed.');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(`Connection failed: ${err.message || 'Make sure you deployed the new Google Apps Script version.'}`);
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
    if (!selectedFile) return alert("Photo is required.");
    setStatus('uploading');
    try {
      const cloudinaryData = await uploadToCloudinary(selectedFile, 'image');
      setStatus('submitting');
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add', ...memberFormData, "Id.No": memberFormData.IdNo, ImageURL: cloudinaryData.secure_url }),
      });
      setStatus('success');
      setMemberFormData({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
      setSelectedFile(null); setPreviewUrl(null); fetchSpreadsheetMembers();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) { setStatus('error'); }
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
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_accounting', ...finalPayload }),
      });
      setStatus('success');
      alert("Submitted successfully!");
      setAccountingFormData({ ...accountingFormData, Description: '', BillLink: '' });
      fetchSpreadsheetAccounting();
      setTimeout(() => setStatus('idle'), 3000);
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

      // Upload Documents (use 'image' so Cloudinary can rasterize PDF pages for viewing without ACL restrictions)
      const docUrls = [];
      for (const file of workDocs) {
        const data = await uploadToCloudinary(file, 'image');
        docUrls.push({ name: file.name, url: data.secure_url });
      }

      setStatus('submitting');
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'add_work', 
          ...worksFormData,
          photos: JSON.stringify(photoUrls),
          documents: JSON.stringify(docUrls)
        }),
      });
      
      setStatus('success');
      setWorksFormData({ title: '', date: '', description: '', youtubeLink: '' });
      setWorkPhotos([]);
      setWorkDocs([]);
      fetchSpreadsheetWorks();
      setTimeout(() => setStatus('idle'), 3000);
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
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete_accounting', description: description }),
      });
      alert("Deleted successfully!");
      setTimeout(() => { 
        fetchSpreadsheetAccounting(); 
        setDeletingAccountingDesc(null);
        setStatus('idle'); 
      }, 1500);
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
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete_work', title: title }),
      });
      setTimeout(() => { fetchSpreadsheetWorks(); setStatus('idle'); }, 1500);
    } catch (err) { setStatus('error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete member ID ${id}?`)) return;
    setDeletingId(id);
    await fetch(SPREADSHEET_API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', id: id }),
    });
    setTimeout(() => { fetchSpreadsheetMembers(); setDeletingId(null); }, 1500);
  };

  const handleApproveJoinRequest = async (req: any) => {
    let finalEmail = req.email;
    if (!finalEmail) {
      finalEmail = window.prompt(`Missing email for ${req.fullName}. Please enter their email address to proceed:`);
      if (!finalEmail) return; // User cancelled
    }
    const finalEmailLower = finalEmail.toLowerCase().trim();
    if (!window.confirm(`Are you sure you want to APPROVE ${req.fullName}? Their request status will be marked "Approved" (removed from active Join Requests) and their details will be added to the "Users" list.`)) return;

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

      // 2. Add approved details to "Users" list!
      const newUserRecord: SystemUserRecord = {
        name: req.fullName || finalEmailLower.split('@')[0],
        email: finalEmailLower,
        role: 'phdy_member',
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

      // 3. Send approval and registration to Google Apps Script
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'approve_join_request',
            email: finalEmailLower,
            fullName: req.fullName,
            phone: req.phone || '',
            dob: req.dob || '',
            address: req.address || '',
            reason: req.reason || '',
            photoUrl: req.photoUrl || '',
            status: 'Approved'
          })
        });
      } catch (e) {}

      // Also send update_join_request_status so the sheet cell is updated
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'update_join_request_status',
            email: finalEmailLower,
            fullName: req.fullName,
            status: 'Approved'
          })
        });
      } catch (e) {}

      // Register/Add to Users sheet in Google Sheets
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            name: req.fullName,
            email: finalEmailLower,
            role: 'phdy_member',
            status: 'Active'
          })
        });
      } catch (e) {}

      // Also add to Members sheet
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add',
            Name: req.fullName,
            Phone: req.phone || '',
            Address: req.address || '',
            Role: 'phdy_member',
            ImageURL: req.photoUrl || ''
          })
        });
      } catch (e) {}

      alert(`✅ Approved ${req.fullName}! Request status marked "Approved" and user added to the Users directory.`);
      fetchSpreadsheetJoinRequests();
      fetchSpreadsheetUsers();
      fetchSpreadsheetMembers();
    } catch (err: any) {
      alert(`Processed locally: ${err.message || 'Complete'}`);
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
    const finalEmailLower = finalEmail.toLowerCase().trim();
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

      // 2. Post reject action to Apps Script
      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'reject_join_request',
            email: finalEmailLower,
            status: 'Rejected'
          })
        });
      } catch (e) {}

      try {
        await fetch(SPREADSHEET_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'update_join_request_status',
            email: finalEmailLower,
            fullName: req.fullName,
            status: 'Rejected'
          })
        });
      } catch (e) {}

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

    try {
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_join_request',
          email: req.email,
          fullName: req.fullName
        })
      });
    } catch (e) {}
  };

  const handlePopupRequestOtp = async () => {
    if (!loggedInUser) return;
    setResetPopupState('sending_otp');
    setResetError('');
    try {
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'request_otp', email: loggedInUser.email })
      });
      const data = JSON.parse(await res.text());
      if (data.status === 'success') {
        setResetPopupState('awaiting_otp');
      } else {
        setResetError(data.message || 'Failed to send OTP.');
        setResetPopupState('idle');
      }
    } catch (err) {
      setResetError('Connection failed.');
      setResetPopupState('idle');
    }
  };

  const handlePopupResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;
    setResetPopupState('resetting');
    setResetError('');
    try {
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'reset_password',
          email: loggedInUser.email,
          otp: resetData.otp,
          newPassword: resetData.newPassword
        })
      });
      const data = JSON.parse(await res.text());
      if (data.status === 'success') {
        setResetPopupState('success');
        setTimeout(() => {
          setShowResetPopup(false);
          setResetPopupState('idle');
          setResetData({ otp: '', newPassword: '' });
        }, 2000);
      } else {
        setResetError(data.message || 'Failed to reset password.');
        setResetPopupState('awaiting_otp');
      }
    } catch (err) {
      setResetError('Connection failed.');
      setResetPopupState('awaiting_otp');
    }
  };

  if (!loggedInUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">
              {authMode === 'login' ? 'Portal Login' : 
               authMode === 'forgot' ? 'Forgot Password' : 'Reset Password'}
            </h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Village Governance Access</p>
          </div>

          <form onSubmit={handleAuthAction} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                required
                type="email" 
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                placeholder="admin@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              />
            </div>

            {authMode === 'login' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <input 
                  required
                  type="password" 
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                />
              </div>
            )}

            {authMode === 'reset' && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">OTP (from email)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                    placeholder="123456"
                    value={loginData.otp}
                    onChange={(e) => setLoginData({...loginData, otp: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
                  <input 
                    required
                    type="password" 
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
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
              className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isAuthenticating ? 'Processing...' : 
               authMode === 'login' ? 'Secure Login' :
               authMode === 'forgot' ? 'Send OTP' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 flex flex-col space-y-2 text-center">
            {authMode === 'login' ? (
              <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }} className="text-xs font-bold text-orange-600 hover:underline">Forgot Password?</button>
            ) : (
              <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} className="text-xs font-bold text-orange-600 hover:underline">Back to Login</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const roleLower = String(loggedInUser.role || '').toLowerCase();
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

  return (
    <div className="animate-fadeIn py-16 px-4 bg-gray-50 min-h-screen">
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
                    <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-[2.5rem] border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer">
                      {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 font-bold uppercase">Upload Photo</span>}
                    </div>
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
                            <button 
                              onClick={()=>handleDelete(m["Id.No"])} 
                              className="text-red-500 hover:text-red-700 font-bold text-xs uppercase hover:underline"
                            >
                              Remove
                            </button>
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
            const rejectedCount = spreadsheetJoinRequests.filter(r => getNormalizedStatus(r.status) === 'Rejected').length;
            const approvedCount = spreadsheetJoinRequests.filter(r => getNormalizedStatus(r.status) === 'Approved').length;

            const visibleRequests = spreadsheetJoinRequests.filter(req => {
              const st = getNormalizedStatus(req.status);
              if (joinRequestFilter === 'in_progress') return st === 'In Progress';
              if (joinRequestFilter === 'approved') return st === 'Approved';
              if (joinRequestFilter === 'rejected') return st === 'Rejected';
              return true;
            });

            return (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                  {/* Header & Controls */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          Sheet: JoinRequests
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
                      {/* Filter Toggle */}
                      <div className="flex flex-wrap items-center bg-gray-100 p-1.5 rounded-2xl gap-1">
                        <button
                          type="button"
                          onClick={() => setJoinRequestFilter('in_progress')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            joinRequestFilter === 'in_progress'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress ({inProgressCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setJoinRequestFilter('approved')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            joinRequestFilter === 'approved'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved ({approvedCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setJoinRequestFilter('rejected')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            joinRequestFilter === 'rejected'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected ({rejectedCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setJoinRequestFilter('all')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            joinRequestFilter === 'all'
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          All ({spreadsheetJoinRequests.length})
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
                                    In Progress
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
          {activeTab === 'users' && loggedInUser.role === 'admin' && (() => {
            const roleCount = {
              total: spreadsheetUsers.length,
              admin: spreadsheetUsers.filter(u => String(u.role).toLowerCase() === 'admin').length,
              treasurer: spreadsheetUsers.filter(u => {
                const r = String(u.role).toLowerCase();
                return r === 'treasurer' || r === 'tressurer';
              }).length,
              member: spreadsheetUsers.filter(u => String(u.role).toLowerCase() === 'phdy_member').length,
              user: spreadsheetUsers.filter(u => {
                const r = String(u.role).toLowerCase();
                return r !== 'admin' && r !== 'treasurer' && r !== 'tressurer' && r !== 'phdy_member';
              }).length
            };

            const filteredUsers = spreadsheetUsers.filter(u => {
              const r = String(u.role || '').toLowerCase();
              const matchesSearch = 
                String(u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                String(u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
              
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
              if (r === 'phdy_member') {
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
                          const isCurrentUser = loggedInUser && String(loggedInUser.email).toLowerCase() === String(u.email).toLowerCase();
                          const currentNormRole = (String(u.role).toLowerCase() === 'tressurer') ? 'treasurer' : (u.role || 'user');

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
                            <option value="phdy_member">🛡️ PHDY Member (Internal Portal)</option>
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