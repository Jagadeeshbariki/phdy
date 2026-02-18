import React, { useState, useRef, useEffect } from 'react';
import { LoggedInUser } from '../App';

const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';
const CLOUDINARY_CLOUD_NAME = 'dbohmpxko';
const CLOUDINARY_UPLOAD_PRESET = 'phdy_preset'; 

type AdminTab = 'members' | 'accounting';

interface AdminPageProps {
  loggedInUser: LoggedInUser | null;
  onLoginSuccess: (user: LoggedInUser) => void;
  onLogout: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ loggedInUser, onLoginSuccess, onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form states
  const [memberFormData, setMemberFormData] = useState({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
  const [accountingFormData, setAccountingFormData] = useState({ FinancialYear: '2024-25', Month: 'January', Type: 'Expenditure', Description: '', BillLink: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [spreadsheetMembers, setSpreadsheetMembers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSpreadsheetMembers = async () => {
    if (!SPREADSHEET_API_URL || !loggedInUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(SPREADSHEET_API_URL);
      const data = await res.json();
      setSpreadsheetMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch members:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (loggedInUser && activeTab === 'members') fetchSpreadsheetMembers();
  }, [activeTab, loggedInUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${SPREADSHEET_API_URL}?type=users`);
      const users = await res.json();
      
      const user = users.find((u: any) => 
        u.username.toLowerCase() === loginData.username.toLowerCase() && 
        u.password === loginData.password
      );

      if (user) {
        onLoginSuccess({ username: user.username, role: user.role.toLowerCase() as any });
      } else {
        setLoginError('Invalid username or password.');
      }
    } catch (err) {
      setLoginError('Connection failed. Please check your internet.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Photo is required.");
    setStatus('uploading');
    try {
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', selectedFile);
      cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: cloudinaryFormData });
      const cloudinaryData = await cloudinaryRes.json();
      setStatus('submitting');
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
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
    try {
      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_accounting', ...accountingFormData }),
      });
      setStatus('success');
      setAccountingFormData({ ...accountingFormData, Description: '', BillLink: '' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) { setStatus('error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete member ID ${id}?`)) return;
    setDeletingId(id);
    await fetch(SPREADSHEET_API_URL, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: id }),
    });
    setTimeout(() => { fetchSpreadsheetMembers(); setDeletingId(null); }, 1500);
  };

  if (!loggedInUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Admin Login</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Village Governance Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                required
                type="text" 
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                placeholder="Admin Username"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              />
            </div>
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

            {loginError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100 animate-pulse">
                {loginError}
              </div>
            )}

            <button 
              disabled={isLoggingIn}
              type="submit" 
              className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
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
               <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Admin: {loggedInUser.username}</h1>
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">{loggedInUser.role === 'admin' ? 'System Administrator' : 'Group Member'}</p>
             </div>
          </div>
          <button onClick={onLogout} className="px-6 py-3 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Sign Out</button>
        </div>

        <div className="flex justify-center space-x-4">
          <button onClick={() => setActiveTab('members')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'members' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Members</button>
          {loggedInUser.role === 'admin' && <button onClick={() => setActiveTab('accounting')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'accounting' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Accounting</button>}
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'members' ? (
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
          ) : (
            <div className="max-w-3xl mx-auto animate-fadeIn bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-900">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Village Financial Entry</h2>
              <form onSubmit={handleAccountingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <select className="px-6 py-4 rounded-2xl bg-gray-50" value={accountingFormData.FinancialYear} onChange={(e)=>setAccountingFormData({...accountingFormData, FinancialYear: e.target.value})}><option>2024-25</option><option>2025-26</option></select>
                  <select className="px-6 py-4 rounded-2xl bg-gray-50" value={accountingFormData.Month} onChange={(e)=>setAccountingFormData({...accountingFormData, Month: e.target.value})}>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                </div>
                <div className="flex gap-4">
                  {['Income','Expenditure'].map(t=>(
                    <button type="button" key={t} onClick={()=>setAccountingFormData({...accountingFormData, Type: t})} className={`flex-1 py-4 rounded-2xl border-2 font-black uppercase ${accountingFormData.Type === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                  ))}
                </div>
                <input required type="text" placeholder="Description" className="w-full px-6 py-4 rounded-2xl bg-gray-50" value={accountingFormData.Description} onChange={(e)=>setAccountingFormData({...accountingFormData, Description: e.target.value})} />
                <input required type="url" placeholder="Official Link (Bill/Receipt)" className="w-full px-6 py-4 rounded-2xl bg-gray-50" value={accountingFormData.BillLink} onChange={(e)=>setAccountingFormData({...accountingFormData, BillLink: e.target.value})} />
                <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest">Log Financial Record</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;