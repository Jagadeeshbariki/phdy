import React, { useState, useRef, useEffect } from 'react';
import { LoggedInUser } from '../App';
import { getCurrentFinancialYear, getFinancialYearsList } from '../types';

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

interface AdminPageProps {
  loggedInUser: LoggedInUser | null;
  onLoginSuccess: (user: LoggedInUser) => void;
  onLogout: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ loggedInUser, onLoginSuccess, onLogout }) => {
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
  const [spreadsheetUsers, setSpreadsheetUsers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAccountingDesc, setDeletingAccountingDesc] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [resetPopupState, setResetPopupState] = useState<'idle' | 'sending_otp' | 'awaiting_otp' | 'resetting' | 'success'>('idle');
  const [resetData, setResetData] = useState({ otp: '', newPassword: '' });
  const [resetError, setResetError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workPhotosRef = useRef<HTMLInputElement>(null);
  const workDocsRef = useRef<HTMLInputElement>(null);

  const fetchSpreadsheetMembers = async () => {
    if (!SPREADSHEET_API_URL || !loggedInUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=members&_t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      let data = [];
      if (text.trim().startsWith('<')) {
        console.warn("Spreadsheet API returned HTML instead of JSON. Check the Apps Script deployment.");
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse members data as JSON:", e);
        }
      }
      setSpreadsheetMembers(Array.isArray(data) ? data : []);
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
    if (!SPREADSHEET_API_URL || !loggedInUser || loggedInUser.role !== 'admin') return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=join_requests&_t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      let data = [];
      if (text.trim().startsWith('<')) {
        console.warn("Spreadsheet API returned HTML instead of JSON. Check the Apps Script deployment.");
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse join requests data as JSON:", e);
        }
      }
      setSpreadsheetJoinRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch join requests:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSpreadsheetUsers = async () => {
    if (!SPREADSHEET_API_URL || !loggedInUser || loggedInUser.role !== 'admin') return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=users&_t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      let data = [];
      if (!text.trim().startsWith('<')) {
        try { data = JSON.parse(text); } catch (e) {}
      }
      setSpreadsheetUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch users:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePromoteUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to promote ${email} to Admin?`)) return;
    setStatus('submitting');
    try {
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'promote_user',
          email: email
        })
      });
      alert(`Promoted ${email} to Admin!`);
      fetchSpreadsheetUsers();
    } catch (err) {
      alert("Failed to promote user.");
    } finally {
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (loggedInUser) {
      if (activeTab === 'members') fetchSpreadsheetMembers();
      if (activeTab === 'works') fetchSpreadsheetWorks();
      if (activeTab === 'accounting') fetchSpreadsheetAccounting();
      if (activeTab === 'joinRequests') fetchSpreadsheetJoinRequests();
      if (activeTab === 'users') fetchSpreadsheetUsers();
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
          onLoginSuccess({ email: data.user.email, role: data.user.role });
        } else if (authMode === 'register') {
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
    if (!window.confirm(`Are you sure you want to APPROVE ${req.fullName}? They will be added to the Members and Users lists.`)) return;
    setProcessingRequest(req.fullName);
    try {
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'approve_join_request',
          email: finalEmail,
          fullName: req.fullName,
          phone: req.phone,
          dob: req.dob,
          address: req.address,
          reason: req.reason,
          photoUrl: req.photoUrl || ''
        })
      });
      
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Server returned an invalid response. Ensure Apps Script is published as a New Version.");
      }

      if (data.status === 'success') {
        alert(`Approved ${req.fullName}! A temporary password has been emailed to them.`);
        fetchSpreadsheetJoinRequests();
        fetchSpreadsheetMembers();
        fetchSpreadsheetUsers();
      } else {
        throw new Error(data.message || "Failed to approve.");
      }
    } catch (err: any) {
      alert(`Failed to approve join request: ${err.message}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectJoinRequest = async (req: any) => {
    let finalEmail = req.email;
    if (!finalEmail) {
      finalEmail = window.prompt(`Missing email for ${req.fullName}. Please enter their email address to reject (required by server), or a placeholder like dummy@test.com:`);
      if (!finalEmail) return;
    }
    if (!window.confirm(`Are you sure you want to REJECT and delete the request from ${req.fullName}?`)) return;
    setProcessingRequest(req.fullName);
    try {
      const res = await fetch(SPREADSHEET_API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'reject_join_request',
          email: finalEmail
        })
      });
      
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Server returned an invalid response. Ensure Apps Script is published as a New Version.");
      }

      if (data.status === 'success') {
        alert(`Rejected ${req.fullName}'s request.`);
        fetchSpreadsheetJoinRequests();
      } else {
        throw new Error(data.message || "Failed to reject.");
      }
    } catch (err: any) {
      alert(`Failed to reject join request: ${err.message}`);
    } finally {
      setProcessingRequest(null);
    }
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

  return (
    <div className="animate-fadeIn py-16 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[32px] shadow-xl border border-orange-50 gap-4">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             </div>
             <div>
               <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Admin: {loggedInUser.email.split('@')[0]}</h1>
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">{loggedInUser.role === 'admin' ? 'System Administrator' : 'Group Member'}</p>
             </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowResetPopup(true)} className="px-6 py-3 bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Change Password</button>
            <button onClick={onLogout} className="px-6 py-3 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Sign Out</button>
          </div>
        </div>

        <div className="flex justify-center space-x-4 overflow-x-auto pb-4">
          <button onClick={() => setActiveTab('members')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Members</button>
          {loggedInUser.role === 'admin' && (
            <>
              <button onClick={() => setActiveTab('works')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'works' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Our Works</button>
              <button onClick={() => setActiveTab('accounting')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'accounting' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Accounting</button>
              <button onClick={() => setActiveTab('joinRequests')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'joinRequests' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Join Requests</button>
              <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Manage Users</button>
            </>
          )}
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
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Active Team Members</h2>
                  <button onClick={fetchSpreadsheetMembers} className="text-orange-600 font-bold">Sync Data</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">ID</th>
                        <th className="pb-4">Name</th>
                        <th className="pb-4">Qualification</th>
                        <th className="pb-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetMembers.map(m => (
                        <tr key={m["Id.No"]}>
                          <td className="py-4 font-bold text-orange-600">#{m["Id.No"]}</td>
                          <td className="py-4 font-bold">{m.Name}</td>
                          <td className="py-4 text-sm text-gray-500">{m.Qualification}</td>
                          <td className="py-4 text-right">
                            <button onClick={()=>handleDelete(m["Id.No"])} className="text-red-500 font-bold hover:underline">Delete</button>
                          </td>
                        </tr>
                      ))}
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
          {activeTab === 'joinRequests' && (
            <div className="space-y-12 animate-fadeIn">
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Membership Join Requests</h2>
                  <button onClick={fetchSpreadsheetJoinRequests} className="text-blue-600 font-bold">Sync Data</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">Photo</th>
                        <th className="pb-4">Details</th>
                        <th className="pb-4">Address</th>
                        <th className="pb-4">Reason</th>
                        <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetJoinRequests.map((req, idx) => (
                        <tr key={idx}>
                          <td className="py-4 pr-4">
                            {req.photoUrl ? (
                              <img src={req.photoUrl} alt="Photo" className="w-16 h-16 object-cover rounded-xl" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">N/A</div>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <p className="font-bold text-gray-900">{req.fullName}</p>
                            <p className="text-xs text-gray-500 font-medium">{req.email}</p>
                            <p className="text-xs text-gray-500">Phone: {req.phone}</p>
                            <p className="text-xs text-gray-500">DOB: {req.dob}</p>
                          </td>
                          <td className="py-4 pr-4 text-sm text-gray-600 max-w-[200px] break-words">
                            {req.address}
                          </td>
                          <td className="py-4 text-sm text-gray-600 max-w-[200px] break-words pr-4">
                            {req.reason}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              disabled={processingRequest === req.fullName}
                              onClick={() => handleApproveJoinRequest(req)}
                              className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                            >
                              {processingRequest === req.fullName ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              disabled={processingRequest === req.fullName}
                              onClick={() => handleRejectJoinRequest(req)}
                              className="mt-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors ml-2 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                      {spreadsheetJoinRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 italic">No join requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'users' && loggedInUser.role === 'admin' && (
            <div className="space-y-12 animate-fadeIn">
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">System Users</h2>
                  <button onClick={fetchSpreadsheetUsers} className="text-indigo-600 font-bold">Sync Data</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-4">Name</th>
                        <th className="pb-4">Email</th>
                        <th className="pb-4">Role</th>
                        <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spreadsheetUsers.map((u, idx) => (
                        <tr key={idx}>
                          <td className="py-4 font-bold text-gray-900">{u.name}</td>
                          <td className="py-4 text-sm text-gray-600">{u.email}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                              u.role === 'phdy_member' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {u.role === 'phdy_member' ? 'Member' : u.role}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handlePromoteUser(u.email)}
                                className="text-indigo-600 font-bold hover:underline text-xs"
                              >
                                Make Admin
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {spreadsheetUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400 italic">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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