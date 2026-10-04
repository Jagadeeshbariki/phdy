import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, ShieldCheck, UserCheck, Search, Sparkles, MapPin, Clock, Award, User } from 'lucide-react';
import { membershipService } from '../src/services/membershipService';
import { OfficialMember } from '../src/services/authService';
import aboutConfigData from '../public/AboutConfig.json';

export interface DisplayMember {
  id: string;
  membershipNumber: string;
  name: string;
  role: string;
  qualification: string;
  image: string;
  joinedDate: string;
  status: 'active';
  isFounding?: boolean;
}

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'official' | 'founding'>('all');

  const fetchMembers = async () => {
    try {
      setLoading(true);

      // 1. Fetch official approved members from Supabase `members` table (WHERE status = 'active')
      let officialApprovedMembers: OfficialMember[] = [];
      try {
        officialApprovedMembers = await membershipService.getActiveMembers();
      } catch (err) {
        console.warn('[Supabase Members Fetch]:', err);
      }

      // 2. Fetch founding team from config as baseline
      const config = Array.isArray(aboutConfigData) ? aboutConfigData[0] : aboutConfigData;
      const legacyFounding: any[] = config?.members || [];

      const list: DisplayMember[] = [];
      const seenNames = new Set<string>();

      // A. Add official approved members from `members` table first
      officialApprovedMembers.forEach((m) => {
        const name = m.full_name?.trim() || 'PHDY Member';
        const key = name.toLowerCase();
        seenNames.add(key);

        list.push({
          id: m.id,
          membershipNumber: m.membership_number,
          name: name,
          role: 'Official Member',
          qualification: m.qualification || 'Active Contributor',
          image: m.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          joinedDate: new Date(m.joined_at || m.approved_at || m.created_at || Date.now()).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          status: 'active',
          isFounding: false
        });
      });

      // B. Add founding members from config
      legacyFounding.forEach((f: any, idx: number) => {
        const name = String(f.Name || f.name || '').trim();
        const key = name.toLowerCase();
        if (key && !seenNames.has(key)) {
          seenNames.add(key);
          list.push({
            id: `founding-${idx + 1}`,
            membershipNumber: `PHDY-F${String(idx + 1).padStart(3, '0')}`,
            name: name,
            role: 'Founding Member',
            qualification: f.Qualification || f.qualification || 'Community Leader',
            image: f.ImageURL || f.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
            joinedDate: 'Founding Batch (2020)',
            status: 'active',
            isFounding: true
          });
        }
      });

      setMembers(list);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.membershipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.qualification.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'official') return !m.isFounding;
      if (activeFilter === 'founding') return m.isFounding;
      return true;
    });
  }, [members, searchTerm, activeFilter]);

  const officialCount = members.filter(m => !m.isFounding).length;
  const foundingCount = members.filter(m => m.isFounding).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider mb-3 shadow-sm">
          <Award className="w-4 h-4 text-orange-600" />
          <span>Official Members Directory</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
          Pedda Harivanam Youth Members
        </h2>
        <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
          Meet the officially approved members and founding leaders driving social progress, education, and development across Pedda Harivanam.
        </p>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID or qualification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full sm:w-auto justify-center sm:justify-start">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'all' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setActiveFilter('official')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'official' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Official Verified ({officialCount})
          </button>
          <button
            onClick={() => setActiveFilter('founding')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'founding' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Founding Team ({foundingCount})
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-4">
              <div className="w-full h-48 bg-gray-200 rounded-2xl"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 max-w-md mx-auto">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Members Found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms or filter selection.</p>
        </div>
      ) : (
        /* Members Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMembers.map((member) => (
            <div 
              key={member.id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Photo Area */}
              <div className="relative w-full h-56 bg-slate-100 overflow-hidden">
                <img 
                  src={member.image} 
                  alt={member.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback on broken image link
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                {/* Membership Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-orange-950 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm font-mono border border-orange-100">
                    {member.membershipNumber}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    member.isFounding 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'bg-emerald-500 text-white shadow-sm'
                  }`}>
                    {member.isFounding ? 'Founding' : 'Official'}
                  </span>
                </div>

                {/* Bottom title inside image */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-black text-base tracking-tight truncate drop-shadow-sm">
                    {member.name}
                  </h3>
                  <p className="text-[11px] text-orange-200 font-bold truncate drop-shadow-sm">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-400">Qualification:</span>
                    <span className="font-bold text-gray-800 text-right truncate max-w-[140px]">
                      {member.qualification}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-400">Joined Date:</span>
                    <span className="font-bold text-gray-700">
                      {member.joinedDate}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Verified Member</span>
                  </span>
                  <span className="text-gray-400">Pedda Harivanam</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembersList;
