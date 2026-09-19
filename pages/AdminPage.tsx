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
  LogOut,
  ChevronRight,
  ExternalLink,
  Phone,
  MapPin,
  FileText,
  Youtube
} from 'lucide-react';
import { Page } from '../App';
import { getCurrentFinancialYear, getFinancialYearsList } from '../types';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  setDoc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { useFirebase } from '../src/context/FirebaseContext';
import { ACCOUNT_DATA } from '../AccountData';
import { INITIAL_PHDY_FUNDS } from '../PHDYFundsData';

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

type AdminTab = 'members' | 'works' | 'accounting' | 'joinRequests' | 'users' | 'migration';

interface AdminPageProps {
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onLogout, onNavigate }) => {
  const { user: firebaseUser, role: firebaseRole, isAdmin, isTreasurer, loading: firebaseLoading } = useFirebase();
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  
  // Data states
  const [members, setMembers] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [accounting, setAccounting] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [joinRequestFilter, setJoinRequestFilter] = useState<'In Progress' | 'Approved' | 'Rejected' | 'All'>('In Progress');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'treasurer' | 'phdy_member' | 'user'>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  
  // Form states
  const [memberFormData, setMemberFormData] = useState({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
  const [accountingFormData, setAccountingFormData] = useState({ FinancialYear: getCurrentFinancialYear(), Month: 'January', Type: 'Expenditure', Description: '', Amount: '', BillLink: '' });
  const [worksFormData, setWorksFormData] = useState({ title: '', date: '', description: '', youtubeLink: '' });
  const [newUserData, setNewUserData] = useState({ name: '', email: '', role: 'phdy_member' });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [workDocs, setWorkDocs] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workPhotosRef = useRef<HTMLInputElement>(null);
  const workDocsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribers: (() => void)[] = [];

    // Real-time Listeners
    try {
      const qMembers = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
      unsubscribers.push(onSnapshot(qMembers, (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'members')));

      const qWorks = query(collection(db, 'works'), orderBy('date', 'desc'));
      unsubscribers.push(onSnapshot(qWorks, (snap) => {
        setWorks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'works')));

      const qAccounting = query(collection(db, 'accounting'), orderBy('createdAt', 'desc'));
      unsubscribers.push(onSnapshot(qAccounting, (snap) => {
        setAccounting(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'accounting')));

      if (isAdmin) {
        const qRequests = query(collection(db, 'join_requests'), orderBy('date', 'desc'));
        unsubscribers.push(onSnapshot(qRequests, (snap) => {
          setJoinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'join_requests')));

        const qUsers = query(collection(db, 'users'), orderBy('joinedDate', 'desc'));
        unsubscribers.push(onSnapshot(qUsers, (snap) => {
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'users')));
      }
    } catch (e) {
      console.error("Listener setup failed:", e);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firebaseUser, isAdmin]);

  // Cloudinary Helper
  const uploadToCloudinary = async (file: File, resourceType: 'image' | 'raw' | 'auto' = 'auto') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', resourceType);
    
    const targetType = resourceType === 'raw' ? 'raw' : 'image';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${targetType}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return await res.json();
  };

  // Handlers
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatus('uploading');
    try {
      let imageUrl = 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png';
      if (selectedFile) {
        const data = await uploadToCloudinary(selectedFile, 'image');
        imageUrl = data.secure_url;
      }
      
      const memberId = memberFormData.IdNo || `M${Date.now()}`;
      await setDoc(doc(db, 'members', memberId), {
        name: memberFormData.Name,
        age: memberFormData.Age,
        qualification: memberFormData.Qualification,
        motivation: memberFormData.Motivation,
        idNo: memberId,
        imageUrl,
        status: 'Approved',
        source: 'Admin Add',
        createdAt: serverTimestamp()
      });
      
      setStatus('success');
      setMemberFormData({ Name: '', Age: '', Qualification: '', Motivation: '', IdNo: '' });
      setSelectedFile(null); setPreviewUrl(null);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      handleFirestoreError(err, OperationType.CREATE, 'members');
    }
  };

  const handleAccountingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !isTreasurer) return;
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'accounting'), {
        ...accountingFormData,
        amount: Number(accountingFormData.Amount) || 0,
        createdAt: serverTimestamp()
      });
      setStatus('success');
      setAccountingFormData({ ...accountingFormData, Description: '', Amount: '', BillLink: '' });
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      handleFirestoreError(err, OperationType.CREATE, 'accounting');
    }
  };

  const handleWorksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatus('uploading');
    try {
      const photoUrls = [];
      for (const file of workPhotos) {
        const data = await uploadToCloudinary(file, 'image');
        photoUrls.push(data.secure_url);
      }

      const docUrls = [];
      for (const file of workDocs) {
        const data = await uploadToCloudinary(file, 'raw');
        docUrls.push({ name: file.name, url: data.secure_url });
      }

      await addDoc(collection(db, 'works'), {
        ...worksFormData,
        imageUrls: photoUrls,
        docUrls,
        createdAt: serverTimestamp()
      });

      setStatus('success');
      setWorksFormData({ title: '', date: '', description: '', youtubeLink: '' });
      setWorkPhotos([]); setWorkDocs([]);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      handleFirestoreError(err, OperationType.CREATE, 'works');
    }
  };

  const handleApproveRequest = async (req: any) => {
    if (!isAdmin) return;
    if (!window.confirm(`Approve ${req.fullName}? This will add them as a member and grant portal access.`)) return;
    setProcessingRequest(req.id);
    try {
      // 1. Mark request as Approved
      await updateDoc(doc(db, 'join_requests', req.id), { status: 'Approved', updatedAt: serverTimestamp() });
      
      // 2. Add to Members list
      await addDoc(collection(db, 'members'), {
        name: req.fullName,
        email: req.email,
        phone: req.phone || '',
        address: req.address || '',
        imageUrl: req.photoUrl || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
        motivation: req.reason || 'Approved applicant',
        qualification: 'Member',
        idNo: `M${Date.now().toString().slice(-4)}`,
        status: 'Approved',
        source: 'Approved Request',
        createdAt: serverTimestamp()
      });

      // 3. Add to Users for portal access
      await setDoc(doc(db, 'users', req.email.toLowerCase()), {
        name: req.fullName,
        email: req.email.toLowerCase(),
        role: 'phdy_member',
        status: 'Active',
        joinedDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      alert("Approved successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `join_requests/${req.id}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (req: any) => {
    if (!isAdmin) return;
    if (!window.confirm(`Reject ${req.fullName}'s request?`)) return;
    setProcessingRequest(req.id);
    try {
      await updateDoc(doc(db, 'join_requests', req.id), { status: 'Rejected', updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `join_requests/${req.id}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeleteDoc = async (coll: string, id: string) => {
    if (!isAdmin && coll !== 'accounting') return;
    if (coll === 'accounting' && !isAdmin && !isTreasurer) return;
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  const handleUpdateRole = async (email: string, role: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', email.toLowerCase()), { role, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${email}`);
    }
  };

  const handleMigrateData = async () => {
    if (!isAdmin) return;
    if (!window.confirm("This will migrate legacy data from local files to Firestore. Existing records with same IDs might be overwritten. Are you sure?")) return;
    
    setIsLoading(true);
    setStatus('submitting');
    try {
      let migratedCount = 0;

      // 1. Migrate Members from AboutConfig.json
      try {
        const aboutRes = await fetch('/AboutConfig.json');
        const aboutData = await aboutRes.json();
        const membersList = aboutData[0]?.members || [];
        
        for (const m of membersList) {
          const memberId = m["Id.No"] || `M${Math.random().toString(36).substr(2, 9)}`;
          await setDoc(doc(db, 'members', memberId), {
            name: m.Name,
            age: m.Age,
            qualification: m.Qualification,
            motivation: m.Motivation,
            idNo: memberId,
            imageUrl: m.ImageURL,
            status: 'Approved',
            source: 'Migration',
            createdAt: serverTimestamp()
          });
          migratedCount++;
        }
      } catch (e) {
        console.warn("Member migration skipped or failed:", e);
      }

      // 2. Migrate Financials from AccountData.ts
      for (const yearObj of ACCOUNT_DATA) {
        for (const monthObj of yearObj.Months) {
          const { Income, Expenditure } = monthObj.details;
          
          for (const item of Income) {
            await addDoc(collection(db, 'accounting'), {
              FinancialYear: yearObj.year,
              Month: monthObj.month,
              Type: 'Income',
              Description: item.description,
              Amount: 0, 
              BillLink: item.pdfUrl,
              source: 'Migration',
              createdAt: serverTimestamp()
            });
            migratedCount++;
          }
          
          for (const item of Expenditure) {
            await addDoc(collection(db, 'accounting'), {
              FinancialYear: yearObj.year,
              Month: monthObj.month,
              Type: 'Expenditure',
              Description: item.description,
              Amount: 0,
              BillLink: item.pdfUrl,
              source: 'Migration',
              createdAt: serverTimestamp()
            });
            migratedCount++;
          }
        }
      }

      // 3. Migrate Funds from PHDYFundsData.ts
      for (const f of INITIAL_PHDY_FUNDS) {
         await setDoc(doc(db, 'phdy_funds', f.id), {
           ...f,
           source: 'Migration',
           createdAt: serverTimestamp()
         });
         migratedCount++;
      }

      setStatus('success');
      alert(`Migration successful! Migrated ${migratedCount} records to Firestore.`);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error("Migration failed:", err);
      setStatus('error');
      alert("Migration failed. Check browser console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (firebaseLoading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-orange-600" /></div>;
  if (!firebaseUser || (!isAdmin && !isTreasurer)) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
         <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-red-50">
           <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
           <p className="text-gray-500 text-sm mb-6">This area is reserved for PHDY Administrators and Treasurers only.</p>
           <div className="space-y-3">
             <button onClick={() => onNavigate('home')} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold">Return Home</button>
             <button onClick={onLogout} className="w-full py-3 text-gray-400 font-bold hover:text-red-500">Sign Out</button>
           </div>
         </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Admin Portal</h1>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{isAdmin ? 'Super Admin' : 'Treasurer'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <p className="text-xs font-bold text-gray-900">{firebaseUser.displayName || firebaseUser.email}</p>
              <p className="text-[10px] text-gray-400 font-medium">Logged in</p>
            </div>
            <button onClick={onLogout} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
          {[
            { id: 'members', label: 'Members', icon: Users, color: 'orange' },
            { id: 'works', label: 'Works', icon: Youtube, color: 'blue' },
            { id: 'accounting', label: 'Finance', icon: Coins, color: 'green' },
            { id: 'joinRequests', label: 'Requests', icon: UserPlus, color: 'amber' },
            { id: 'users', label: 'Users', icon: UserCheck, color: 'indigo' },
            { id: 'migration', label: 'Migration', icon: RefreshCw, color: 'purple' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border ${
                activeTab === tab.id 
                  ? `bg-${tab.color}-600 text-white border-${tab.color}-600 shadow-${tab.color}-200` 
                  : 'bg-white text-gray-400 border-gray-100 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6">Add Member</h2>
                  <form onSubmit={handleMemberSubmit} className="space-y-4">
                    <div className="flex flex-col items-center gap-4 mb-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()} 
                        className="w-28 h-28 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-orange-300 transition-colors"
                      >
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <Plus className="w-8 h-8 text-gray-300" />}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Member Photo</p>
                    </div>
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Full Name" value={memberFormData.Name} onChange={e => setMemberFormData({...memberFormData, Name: e.target.value})} />
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Age" type="number" value={memberFormData.Age} onChange={e => setMemberFormData({...memberFormData, Age: e.target.value})} />
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="ID Number" value={memberFormData.IdNo} onChange={e => setMemberFormData({...memberFormData, IdNo: e.target.value})} />
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Qualification" value={memberFormData.Qualification} onChange={e => setMemberFormData({...memberFormData, Qualification: e.target.value})} />
                    <textarea required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm h-24" placeholder="Motivation" value={memberFormData.Motivation} onChange={e => setMemberFormData({...memberFormData, Motivation: e.target.value})} />
                    <button disabled={status === 'uploading'} type="submit" className="w-full py-4 bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-200 active:scale-95 transition-all">
                      {status === 'uploading' ? 'Uploading...' : 'Save Member'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-8">
                <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Active Roster</h2>
                    <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase tracking-wider">{members.length} Total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/50">
                        <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          <th className="px-8 py-4 text-left">Member</th>
                          <th className="px-8 py-4 text-left">Qualification</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {members.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <img src={m.imageUrl} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{m.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ID: {m.idNo}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-xs font-bold text-gray-600">{m.qualification}</p>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button onClick={() => handleDeleteDoc('members', m.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'works' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6">Add New Work</h2>
                  <form onSubmit={handleWorksSubmit} className="space-y-5">
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Work Title" value={worksFormData.title} onChange={e => setWorksFormData({...worksFormData, title: e.target.value})} />
                    <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" type="date" value={worksFormData.date} onChange={e => setWorksFormData({...worksFormData, date: e.target.value})} />
                    <textarea required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm h-32" placeholder="Description" value={worksFormData.description} onChange={e => setWorksFormData({...worksFormData, description: e.target.value})} />
                    <input className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="YouTube Link / ID" value={worksFormData.youtubeLink} onChange={e => setWorksFormData({...worksFormData, youtubeLink: e.target.value})} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Photos</label>
                        <button type="button" onClick={() => workPhotosRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 font-bold text-xs hover:border-blue-200 transition-all">
                          {workPhotos.length > 0 ? `${workPhotos.length} Selected` : 'Select'}
                        </button>
                        <input type="file" multiple ref={workPhotosRef} className="hidden" accept="image/*" onChange={e => setWorkPhotos(Array.from(e.target.files || []))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Docs</label>
                        <button type="button" onClick={() => workDocsRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 font-bold text-xs hover:border-blue-200 transition-all">
                          {workDocs.length > 0 ? `${workDocs.length} Selected` : 'Select'}
                        </button>
                        <input type="file" multiple ref={workDocsRef} className="hidden" accept=".pdf,.doc,.docx" onChange={e => setWorkDocs(Array.from(e.target.files || []))} />
                      </div>
                    </div>

                    <button disabled={status === 'uploading'} type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200">
                      {status === 'uploading' ? 'Uploading Files...' : 'Publish Work Record'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-7">
                 <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50">
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recent Projects</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 gap-4">
                      {works.map(w => (
                        <div key={w.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between group">
                          <div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">{formatDisplayDate(w.date)}</p>
                            <h3 className="font-bold text-gray-900 mb-1">{w.title}</h3>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                                <Plus className="w-3 h-3" /> {w.imageUrls?.length || 0} Photos
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                                <FileText className="w-3 h-3" /> {w.docUrls?.length || 0} Docs
                              </span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteDoc('works', w.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
                   <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6">Financial Log</h2>
                   <form onSubmit={handleAccountingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <select className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold" value={accountingFormData.FinancialYear} onChange={e => setAccountingFormData({...accountingFormData, FinancialYear: e.target.value})}>
                          {getFinancialYearsList().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold" value={accountingFormData.Month} onChange={e => setAccountingFormData({...accountingFormData, Month: e.target.value})}>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         {['Income', 'Expenditure'].map(t => (
                           <button key={t} type="button" onClick={() => setAccountingFormData({...accountingFormData, Type: t})} className={`py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${accountingFormData.Type === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                         ))}
                      </div>
                      <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Description" value={accountingFormData.Description} onChange={e => setAccountingFormData({...accountingFormData, Description: e.target.value})} />
                      <input required className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Amount (₹)" type="number" value={accountingFormData.Amount} onChange={e => setAccountingFormData({...accountingFormData, Amount: e.target.value})} />
                      <input className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm" placeholder="Receipt Link (Optional)" value={accountingFormData.BillLink} onChange={e => setAccountingFormData({...accountingFormData, BillLink: e.target.value})} />
                      <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-200">Log Transaction</button>
                   </form>
                </div>
              </div>
              <div className="lg:col-span-8">
                <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                   <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Financial Records</h2>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                          <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            <th className="px-8 py-4">Period</th>
                            <th className="px-8 py-4">Type</th>
                            <th className="px-8 py-4">Amount</th>
                            <th className="px-8 py-4">Description</th>
                            <th className="px-8 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {accounting.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-8 py-4">
                                <p className="text-xs font-bold text-gray-900">{a.Month}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{a.FinancialYear}</p>
                              </td>
                              <td className="px-8 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${a.Type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.Type}</span>
                              </td>
                              <td className="px-8 py-4">
                                <p className="text-sm font-black text-gray-900">₹{(a.amount || a.Amount || 0).toLocaleString()}</p>
                              </td>
                              <td className="px-8 py-4 text-xs font-medium text-gray-600 max-w-[200px] truncate">{a.description || a.Description}</td>
                              <td className="px-8 py-4 text-right">
                                <button onClick={() => handleDeleteDoc('accounting', a.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'joinRequests' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Membership Requests</h2>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                   {(['In Progress', 'Approved', 'Rejected', 'All'] as const).map(f => (
                     <button
                      key={f}
                      onClick={() => setJoinRequestFilter(f)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${joinRequestFilter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       {f}
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinRequests
                  .filter(r => joinRequestFilter === 'All' ? true : r.status === joinRequestFilter)
                  .map(req => (
                  <div key={req.id} className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 flex flex-col group relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img src={req.photoUrl || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png'} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                        <div>
                          <h3 className="font-black text-gray-900 leading-tight">{req.fullName}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{formatDisplayDate(req.date)}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                       <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                         <Mail className="w-3.5 h-3.5" /> {req.email}
                       </div>
                       <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                         <Phone className="w-3.5 h-3.5" /> {req.phone}
                       </div>
                       <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                         <MapPin className="w-3.5 h-3.5" /> {req.address}
                       </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason for joining:</p>
                       <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{req.reason}"</p>
                    </div>

                    {req.status === 'In Progress' && (
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          disabled={processingRequest === req.id}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                          {processingRequest === req.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req)}
                          disabled={processingRequest === req.id}
                          className="flex-1 py-3 bg-white border border-red-100 text-red-600 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => handleDeleteDoc('join_requests', req.id)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                     <ShieldCheck className="w-5 h-5" />
                   </div>
                   <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Users & RBAC</h2>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input 
                        className="pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-xs font-bold w-full md:w-64" 
                        placeholder="Search users..." 
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add User
                    </button>
                 </div>
              </div>

              <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="px-8 py-5">Full Name</th>
                        <th className="px-8 py-5">Email Address</th>
                        <th className="px-8 py-5">System Role</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users
                        .filter(u => u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
                        .map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-8 py-5 font-bold text-gray-900 text-sm">{u.name}</td>
                          <td className="px-8 py-5 text-xs text-gray-500 font-medium">{u.email}</td>
                          <td className="px-8 py-5">
                            <select 
                              value={u.role}
                              disabled={u.email === firebaseUser?.email}
                              onChange={e => handleUpdateRole(u.id, e.target.value)}
                              className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="user">User</option>
                              <option value="phdy_member">Member</option>
                              <option value="treasurer">Treasurer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider">Active</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             {u.email !== firebaseUser?.email && (
                               <button onClick={() => handleDeleteDoc('users', u.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="max-w-3xl mx-auto py-12">
              <div className="bg-white rounded-[40px] p-10 md:p-16 shadow-2xl border border-purple-50 text-center">
                <div className="w-24 h-24 bg-purple-600 rounded-[32px] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-purple-200">
                  <RefreshCw className={`w-12 h-12 ${isLoading ? 'animate-spin' : ''}`} />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4">Data Migration Hub</h2>
                <p className="text-gray-500 text-sm mb-12 leading-relaxed max-w-lg mx-auto">
                  Move your legacy data from static files (spreadsheet exports) directly into your live Firebase Database. This covers Members, Financial Records, and PHDY Internal Funds.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
                  <div className="p-6 rounded-3xl bg-purple-50/50 border border-purple-100">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Source: Local Files</h4>
                    <ul className="text-xs text-gray-600 space-y-2 font-bold">
                      <li className="flex items-center gap-2">✓ AboutConfig.json (Members)</li>
                      <li className="flex items-center gap-2">✓ AccountData.ts (Accounting)</li>
                      <li className="flex items-center gap-2">✓ PHDYFundsData.ts (Funds)</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Target: Firestore</h4>
                    <ul className="text-xs text-gray-600 space-y-2 font-bold">
                      <li className="flex items-center gap-2">✓ Members Collection</li>
                      <li className="flex items-center gap-2">✓ Accounting Collection</li>
                      <li className="flex items-center gap-2">✓ Internal Funds Collection</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleMigrateData}
                  disabled={isLoading}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-3 ${
                    isLoading 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200 active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Migrating Data...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Start Migration to Firebase</span>
                    </>
                  )}
                </button>

                <div className="mt-12 p-6 bg-amber-50 rounded-3xl border border-amber-100 text-left">
                  <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Important Note</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    This process will populate your Firestore database with the data currently hardcoded in the app. Once migrated, you can delete the local files or keep them as backup. The app will prioritize Firestore data automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl border border-gray-100 relative">
            <button onClick={() => setIsAddUserModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Add System User</h2>
              <p className="text-xs text-gray-500 mt-2">Provision direct access to PHDY portals.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await setDoc(doc(db, 'users', newUserData.email.toLowerCase()), {
                  name: newUserData.name,
                  email: newUserData.email.toLowerCase(),
                  role: newUserData.role,
                  status: 'Active',
                  joinedDate: new Date().toISOString().split('T')[0],
                  createdAt: serverTimestamp()
                });
                setIsAddUserModalOpen(false);
                setNewUserData({ name: '', email: '', role: 'phdy_member' });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, 'users');
              }
            }} className="space-y-4">
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" placeholder="Full Name" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} />
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none" placeholder="Email Address" type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
              <select className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none font-bold" value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})}>
                <option value="user">Standard User</option>
                <option value="phdy_member">PHDY Member</option>
                <option value="treasurer">Treasurer</option>
                <option value="admin">Administrator</option>
              </select>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100">Add User Account</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
