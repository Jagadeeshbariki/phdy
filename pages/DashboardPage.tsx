import React from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { MultiTierDashboard } from '../components/MultiTierDashboard';
import { LoggedInUser, Page } from '../App';
import { 
  Award, 
  Clock, 
  XCircle, 
  UserCheck, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  CheckCircle2,
  Sparkles,
  Users
} from 'lucide-react';

interface DashboardPageProps {
  loggedInUser?: LoggedInUser | null;
  onNavigate: (page: Page) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ loggedInUser, onNavigate }) => {
  const { user, profile, membership, membershipRequest, isAdmin, isMember, loading } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || loggedInUser?.email?.split('@')[0] || 'Member';

  return (
    <div className="min-h-screen bg-slate-50 pt-6 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-600/10 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>PHDY Member Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {displayName}!
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xl">
              Access village analytics, GIS mapping, gram panchayat accounting, and official membership services.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="px-4 py-2.5 bg-white text-orange-900 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-orange-50 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>Admin Portal</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('profile')}
              className="px-4 py-2.5 bg-black/20 hover:bg-black/30 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20"
            >
              <span>My Profile</span>
            </button>
          </div>
        </div>

        {/* SECTION 7: DYNAMIC MEMBERSHIP STATUS CARD */}
        <div className="mb-10">
          {membership && membership.status === 'active' ? (
            /* APPROVED MEMBER CARD */
            <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Status: Active</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-950 tracking-tight">
                      Official PHDY Member
                    </h3>
                    <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                      Membership No: {membership.membership_number}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => onNavigate('my-membership')}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>View My Membership</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('internal')}
                    className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all"
                  >
                    Internal Portal
                  </button>
                </div>
              </div>
            </div>
          ) : membershipRequest && membershipRequest.status === 'pending' ? (
            /* PENDING APPLICATION CARD */
            <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-lg shadow-amber-500/5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Status: Pending</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-950 tracking-tight">
                      Membership Application Under Review
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Your application submitted on {new Date(membershipRequest.submitted_at).toLocaleDateString()} is currently under review by our administrators.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('membership-status')}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <span>View Application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : membershipRequest && membershipRequest.status === 'rejected' ? (
            /* REJECTED APPLICATION CARD */
            <div className="bg-white border-2 border-red-300 rounded-3xl p-6 sm:p-8 shadow-lg shadow-red-500/5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider mb-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Status: Rejected</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-950 tracking-tight">
                      Membership Application Was Not Approved
                    </h3>
                    {membershipRequest.admin_remarks && (
                      <p className="text-xs text-red-800 italic mt-1 bg-red-50 p-2.5 rounded-xl border border-red-100">
                        Remarks: "{membershipRequest.admin_remarks}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => onNavigate('become-member')}
                    className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Apply Again</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('membership-status')}
                    className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all"
                  >
                    View Status
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* BECOME A MEMBER PROMPT CARD FOR STANDARD USERS */
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-200 rounded-3xl p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-950 tracking-tight">
                      Become a PHDY Member
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 max-w-md">
                      Want to officially join PHDY? Submit your application to receive an official digital membership ID and participate in youth governance.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('become-member')}
                  className="w-full sm:w-auto px-7 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <span>Become a Member</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing MultiTier Dashboard Analytics & RBAC Tools */}
        <MultiTierDashboard 
          loggedInUser={loggedInUser || (user ? { email: user.email || '', role: isAdmin ? 'admin' : isMember ? 'phdy_member' : 'user' } : null)} 
          onNavigate={onNavigate} 
          isStandalonePage={false} 
        />
      </div>
    </div>
  );
};
