import React from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { Page } from '../App';
import { 
  User, 
  Mail, 
  Shield, 
  Award, 
  Calendar, 
  CheckCircle2, 
  LogOut, 
  ArrowRight,
  Clock,
  Sparkles,
  Phone
} from 'lucide-react';

interface UserProfilePageProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ onNavigate, onLogout }) => {
  const { user, profile, membership, membershipRequest, isAdmin, isMember, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Sign In Required</h2>
        <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl"
        >
          Sign In
        </button>
      </div>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const email = profile?.email || user.email || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-3xl font-black flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-grow text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                {displayName}
              </h1>
              {isAdmin && (
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                  Administrator
                </span>
              )}
              {isMember && !isAdmin && (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                  Official Member
                </span>
              )}
              {!isMember && !isAdmin && (
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                  Registered User
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-gray-500 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{email}</span>
            </p>

            <p className="text-xs text-gray-400 pt-2">
              Account Status: <span className="font-bold text-emerald-600 uppercase">{profile?.status || 'Active'}</span>
            </p>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all self-center sm:self-start"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Membership Status Action Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
          Membership Status
        </h3>

        {membership && membership.status === 'active' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-emerald-950 text-base">
                  Approved PHDY Member
                </h4>
                <p className="text-xs font-bold text-emerald-800 font-mono mt-0.5">
                  ID: {membership.membership_number}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('my-membership')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>View Card</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : membershipRequest && membershipRequest.status === 'pending' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-amber-950 text-base">
                  Application Under Review
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Submitted on {new Date(membershipRequest.submitted_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('membership-status')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>View Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-orange-950 text-base">
                Want to become an official PHDY Member?
              </h4>
              <p className="text-xs text-orange-800 mt-1 max-w-md">
                Submit your details to join the official youth association of Pedda Harivanam.
              </p>
            </div>

            <button
              onClick={() => onNavigate('become-member')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span>Become a Member</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-5 bg-white border border-gray-200 hover:border-orange-300 rounded-2xl text-left transition-all shadow-sm group"
        >
          <h4 className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">
            Main Dashboard
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Access village map, accounting reports, and overview.
          </p>
        </button>

        <button
          onClick={() => onNavigate('members')}
          className="p-5 bg-white border border-gray-200 hover:border-orange-300 rounded-2xl text-left transition-all shadow-sm group"
        >
          <h4 className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">
            Official Members Directory
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Browse verified active members of PHDY.
          </p>
        </button>
      </div>
    </div>
  );
};
