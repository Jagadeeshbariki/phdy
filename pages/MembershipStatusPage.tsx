import React from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { Page } from '../App';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Award, 
  UserCheck, 
  ArrowRight, 
  Calendar, 
  AlertCircle,
  FileText,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface MembershipStatusPageProps {
  onNavigate: (page: Page) => void;
}

export const MembershipStatusPage: React.FC<MembershipStatusPageProps> = ({ onNavigate }) => {
  const { user, profile, membership, membershipRequest, loading, refreshAuth, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <UserCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
          Sign In Required
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Please sign in to your registered account to view your PHDY membership status.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-200"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // 1. APPROVED STATE (Record exists in `members` table)
  if (membership && membership.status === 'active') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-xl shadow-emerald-500/5 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>

          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Award className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span>Official Member</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
            Congratulations! You are an Official PHDY Member
          </h1>

          <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-8">
            Your application was approved by the PHDY administration. You have full access to official member privileges and internal association portals.
          </p>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 mb-8 text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Membership Number</span>
              <span className="text-lg font-black text-emerald-950 font-mono tracking-wider">
                {membership.membership_number}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Joined Date</span>
              <span className="text-sm font-bold text-emerald-950">
                {new Date(membership.joined_at || membership.approved_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('my-membership')}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
            >
              <span>View My Membership Card</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('members')}
              className="w-full sm:w-auto px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
              View Members Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. PENDING STATE (In `membership_requests` with status = 'pending')
  if (membershipRequest && membershipRequest.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-amber-200 rounded-3xl p-8 shadow-xl shadow-amber-500/5 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full mb-4">
            <Clock className="w-4 h-4" />
            <span>Status: Pending Review</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
            Membership Application Under Review
          </h1>

          <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-8">
            Your application has been submitted and is currently waiting for administrator review and approval. You will receive an email confirmation once processed.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-500">Applicant:</span>
              <span className="font-black text-gray-900">{profile?.full_name || user.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-500">Submitted On:</span>
              <span className="font-bold text-gray-800">
                {new Date(membershipRequest.submitted_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-500">Contact Phone:</span>
              <span className="font-bold text-gray-800">{membershipRequest.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => refreshAuth()}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check for Updates</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md shadow-orange-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. REJECTED STATE (In `membership_requests` with status = 'rejected')
  if (membershipRequest && membershipRequest.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-red-200 rounded-3xl p-8 shadow-xl shadow-red-500/5 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <XCircle className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 text-xs font-black uppercase tracking-wider rounded-full mb-4">
            <XCircle className="w-4 h-4" />
            <span>Status: Rejected</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
            Membership Application Rejected
          </h1>

          <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-6">
            Your recent PHDY membership application was reviewed and could not be approved at this time.
          </p>

          {membershipRequest.admin_remarks && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto">
              <span className="text-xs font-black text-red-800 uppercase tracking-wider block mb-1">
                Administrator Remarks:
              </span>
              <p className="text-sm text-red-900 italic">
                "{membershipRequest.admin_remarks}"
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('become-member')}
              className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
            >
              <span>Apply Again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. NO APPLICATION STATE
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <FileText className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
          No Application Submitted
        </h1>

        <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-8">
          You have not applied for PHDY membership yet. Submit your details to become an officially verified PHDY member.
        </p>

        <button
          onClick={() => onNavigate('become-member')}
          className="px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 mx-auto"
        >
          <span>Become a Member</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
