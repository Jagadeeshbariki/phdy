import React, { useRef, useState } from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { Page } from '../App';
import html2canvas from 'html2canvas';
import { 
  Award, 
  ShieldCheck, 
  Calendar, 
  Phone, 
  GraduationCap, 
  User, 
  CheckCircle2, 
  ArrowRight,
  Share2,
  Download,
  Building
} from 'lucide-react';

interface MyMembershipPageProps {
  onNavigate: (page: Page) => void;
}

export const MyMembershipPage: React.FC<MyMembershipPageProps> = ({ onNavigate }) => {
  const { user, profile, membership, loading, isAuthenticated } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `PHDY_Member_Card_${membership?.membership_number || 'ID'}.png`;
      link.click();
    } catch (e) {
      console.error('Download card error:', e);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">Please log in to access your official membership details.</p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!membership || membership.status !== 'active') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">No Active Membership</h2>
        <p className="text-gray-600 mb-6">You are registered as a standard user. Apply for official PHDY membership to unlock full member features.</p>
        <button
          onClick={() => onNavigate('become-member')}
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200"
        >
          Apply for Membership
        </button>
      </div>
    );
  }

  const fullName = membership.full_name || profile?.full_name || 'PHDY Member';
  const joinedDate = new Date(membership.joined_at || membership.approved_at || membership.created_at || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified Official Member</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            My PHDY Membership
          </h1>
        </div>
        
        <button
          onClick={handleDownloadCard}
          disabled={isDownloading}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-orange-200 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Generating PNG...' : 'Download ID Card (PNG)'}</span>
        </button>
      </div>

      {/* Official Digital Membership Card */}
      <div ref={cardRef} className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700 mb-8">
        {/* Decorative background watermark */}
        <div className="absolute -right-16 -bottom-16 opacity-10 pointer-events-none">
          <Award className="w-80 h-80 text-orange-500" />
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-md">
              <img 
                src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" 
                alt="PHDY" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-tight">
                Pedda Harivanam Development Youth
              </h2>
              <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">
                Official Digital Member Card
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full">
              Active
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          {/* Member Photo */}
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 border-orange-500/40 shadow-xl flex-shrink-0 flex items-center justify-center">
            {membership.photo_url ? (
              <img 
                src={membership.photo_url} 
                alt={fullName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-slate-500" />
            )}
          </div>

          {/* Member Attributes */}
          <div className="flex-grow space-y-4 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Member Full Name
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                {fullName}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 block">
                  Membership No.
                </span>
                <span className="text-sm font-black font-mono tracking-wider text-white">
                  {membership.membership_number}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Joined Date
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {joinedDate}
                </span>
              </div>
              {membership.qualification && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                    Qualification
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {membership.qualification}
                  </span>
                </div>
              )}
              {membership.phone && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                    Phone
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {membership.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Pedda Harivanam Village, Adoni Mandal, Kurnool Dist.</span>
          <span className="font-mono text-orange-400/80">phdy.org</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => onNavigate('members')}
          className="bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-5 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">
              Members Directory
            </h4>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Browse other approved PHDY members in our community.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('internal')}
          className="bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-5 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">
              PHDY Internal Portal
            </h4>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Access internal youth association treasury, documents & meetings.
          </p>
        </div>
      </div>
    </div>
  );
};
