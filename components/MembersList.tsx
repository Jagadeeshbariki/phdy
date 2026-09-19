import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, ShieldCheck, UserCheck, Search, MapPin, Clock } from 'lucide-react';
import aboutConfigData from '../public/AboutConfig.json';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';

export interface DisplayMember {
  id: string;
  name: string;
  role: string;
  age: string;
  dob?: string;
  qualification: string;
  motivation: string;
  image: string;
  status: 'Approved' | 'In Progress';
  statusLabel: string;
  address?: string;
  email?: string;
  phone?: string;
  source: 'join_request' | 'user' | 'legacy' | 'join_request_pending' | 'firestore';
}

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'founding' | 'join_requests'>('all');

  useEffect(() => {
    setLoading(true);
    
    // 1. Get static legacy founding members
    const config = Array.isArray(aboutConfigData) ? aboutConfigData[0] : aboutConfigData;
    const legacyMembers: DisplayMember[] = (config?.members || []).map((m: any, idx: number) => ({
      id: m["Id.No"] || m.id || `LEGACY-${idx}`,
      name: m.Name || m.name || '',
      role: 'Founding Member',
      age: String(m.Age || m.age || ''),
      qualification: String(m.Qualification || m.qualification || 'Nill'),
      motivation: String(m.Motivation || m.motivation || 'Dedicated to the progress of Pedda Harivanam.'),
      image: m.ImageURL || m.image || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
      status: 'Approved',
      statusLabel: 'Founding Member',
      address: 'Pedda Harivanam',
      source: 'legacy'
    }));

    const unsubscribers: (() => void)[] = [];

    // 2. Listen to Members collection
    try {
      const qMembers = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
      const unsubMembers = onSnapshot(qMembers, (snapshot) => {
        const firestoreMembers: DisplayMember[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.idNo || doc.id,
            name: data.name || '',
            role: data.role || 'PHDY Member',
            age: String(data.age || ''),
            qualification: data.qualification || 'Graduate',
            motivation: data.motivation || '',
            image: data.imageUrl || data.image || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
            status: data.status || 'Approved',
            statusLabel: data.status === 'Approved' ? 'Approved Member' : 'In Progress',
            address: data.address || 'Pedda Harivanam',
            email: data.email || '',
            phone: data.phone || '',
            source: 'firestore'
          };
        });

        // 3. Listen to Join Requests - Only show In Progress ones publicly
        const qJoin = query(
          collection(db, 'join_requests'), 
          where('status', '==', 'In Progress'),
          orderBy('createdAt', 'desc')
        );
        const unsubJoin = onSnapshot(qJoin, (joinSnapshot) => {
          const joinRequests: DisplayMember[] = joinSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.fullName || '',
                role: 'Membership Applicant',
                age: String(data.age || ''),
                qualification: data.qualification || 'Applicant',
                motivation: data.reason || '',
                image: data.photoUrl || 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png',
                status: 'In Progress',
                statusLabel: 'In Progress',
                address: data.address || 'Pedda Harivanam',
                email: data.email || '',
                phone: data.phone || '',
                source: 'join_request_pending'
              };
            });

          // Combine all
          const combined = [...legacyMembers, ...firestoreMembers, ...joinRequests];
          
          // Deduplicate by email/name
          const seen = new Set<string>();
          const unique = combined.filter(m => {
            const key = (m.email || m.name).toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          setMembers(unique);
          setLoading(false);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'join_requests'));
        unsubscribers.push(unsubJoin);

      }, (err) => handleFirestoreError(err, OperationType.LIST, 'members'));
      unsubscribers.push(unsubMembers);
    } catch (e) {
      setLoading(false);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.qualification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.address && m.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        m.role.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'all') return true; // Show both Approved and In Progress in the "All" view if requested
      if (activeFilter === 'approved') return (m.source === 'join_request' || m.source === 'user') && m.status === 'Approved';
      if (activeFilter === 'founding') return m.source === 'legacy';
      if (activeFilter === 'join_requests') return m.status === 'In Progress';
      return true;
    });
  }, [members, searchTerm, activeFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-t-orange-600"></div>
        <p className="text-orange-600 font-bold animate-pulse text-xs tracking-widest uppercase">
          Loading Approved Members...
        </p>
      </div>
    );
  }

  const approvedCount = members.filter(m => m.status === 'Approved').length;
  const joinRequestApprovedCount = members.filter(m => (m.source === 'join_request' || m.source === 'user') && m.status === 'Approved').length;
  const inProgressCount = members.filter(m => m.status === 'In Progress').length;
  const foundingCount = members.filter(m => m.source === 'legacy').length;

  return (
    <div className="space-y-8">
      {/* Controls Bar: Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-6 rounded-[28px] border border-orange-100 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Members ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved Applicants ({joinRequestApprovedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('founding')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeFilter === 'founding'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Founding Team ({foundingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('join_requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeFilter === 'join_requests'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Join Requests ({inProgressCount})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member, role, or qualification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
        {filteredMembers.map((member) => (
          <div 
            key={member.id + member.name} 
            className="group bg-white rounded-2xl sm:rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col transform hover:-translate-y-1 sm:hover:-translate-y-2"
          >
            {/* Member Image Header */}
            <div className="relative h-52 sm:h-72 overflow-hidden bg-gray-50 flex items-center justify-center p-3">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white opacity-40"></div>
              
              {/* Status Badge Overlaid on Image */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-sm border border-emerald-200 rounded-full shadow-sm">
                <span className={`w-2 h-2 rounded-full animate-pulse ${member.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${member.status === 'Approved' ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {member.status === 'Approved' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-600" />
                  )}
                  {member.statusLabel || `Status: ${member.status}`}
                </span>
              </div>

              {/* ID Badge */}
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 bg-gray-900/80 backdrop-blur-sm text-white rounded-full text-[9px] font-mono font-bold tracking-wider">
                #{member.id}
              </div>

              <img 
                src={member.image} 
                alt={member.name} 
                className="relative z-10 max-w-full max-h-full object-contain rounded-xl sm:rounded-2xl transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png';
                }}
              />
            </div>

            {/* Member Info Body */}
            <div className="p-4 sm:p-6 flex-grow flex flex-col space-y-3 sm:space-y-4">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-0.5">
                  {member.role}
                </span>
                <h3 className="text-base sm:text-xl font-black text-gray-900 line-clamp-1">
                  {member.name}
                </h3>
              </div>

              {/* Quick Details Row */}
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs border-t border-gray-100 pt-3">
                <div className="bg-gray-50/80 p-2 rounded-xl">
                  <span className="text-gray-400 uppercase text-[8px] sm:text-[9px] font-bold tracking-wider block">
                    {member.age ? 'Age' : 'Status'}
                  </span>
                  <span className="text-gray-900 font-bold">
                    {member.age ? `${member.age} Yrs` : 'Approved'}
                  </span>
                </div>
                <div className="bg-gray-50/80 p-2 rounded-xl text-right">
                  <span className="text-gray-400 uppercase text-[8px] sm:text-[9px] font-bold tracking-wider block">
                    Education
                  </span>
                  <span className="text-gray-900 font-bold truncate block">
                    {member.qualification || 'Nill'}
                  </span>
                </div>
              </div>

              {/* Address / Location Tag */}
              {member.address && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <span className="truncate">{member.address}</span>
                </div>
              )}

              {/* Motivation Box */}
              <div className="flex-grow">
                <span className="text-gray-400 uppercase text-[9px] font-bold block mb-1.5 tracking-wider">
                  Motivation & Commitment
                </span>
                <div className="bg-orange-50/40 p-3.5 rounded-2xl border border-orange-100/60 min-h-[85px] flex items-start">
                  <p className="text-gray-700 text-xs italic leading-relaxed line-clamp-3">
                    "{member.motivation}"
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/40">
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                Verified PHDY Youth
              </span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-bold text-sm mb-1">No matching members found</p>
          <p className="text-xs text-gray-400 mb-4">Try adjusting your search term or filter.</p>
          <button
            onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default MembersList;
