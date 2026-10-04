import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Users, 
  UserCheck, 
  FileText, 
  DollarSign, 
  MapPin, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Code2, 
  Sparkles, 
  ArrowRight,
  Database,
  Building,
  Calendar,
  Vote,
  Compass,
  AlertCircle
} from 'lucide-react';
import { LoggedInUser, Page } from '../App';

interface MultiTierDashboardProps {
  loggedInUser: LoggedInUser | null;
  onNavigate?: (page: Page) => void;
  isStandalonePage?: boolean;
}

type SimulationRole = 'actual' | 'user' | 'member' | 'moderator' | 'admin' | 'super_admin';

export const MultiTierDashboard: React.FC<MultiTierDashboardProps> = ({
  loggedInUser,
  onNavigate,
  isStandalonePage = false,
}) => {
  const [simulationRole, setSimulationRole] = useState<SimulationRole>('actual');
  const [activeTab, setActiveTab] = useState<'tiers' | 'architecture' | 'matrix'>('tiers');
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);

  // Compute effective role based on actual login vs simulation mode
  const effectiveRole = (() => {
    if (simulationRole !== 'actual') return simulationRole;
    if (!loggedInUser) return 'guest';
    const r = String(loggedInUser.role || '').toLowerCase();
    if (r === 'admin' || r === 'super_admin') return 'admin';
    if (r === 'phdy_member' || r === 'member') return 'member';
    if (r === 'moderator') return 'moderator';
    return 'user';
  })();

  // Access rules
  const hasTier1Access = true; // Public & all authenticated users
  const hasTier2Access = ['member', 'moderator', 'admin', 'super_admin'].includes(effectiveRole);
  const hasTier3Access = ['admin', 'super_admin'].includes(effectiveRole);

  // Sample Mock / State data for Tier views
  const [pendingApplications, setPendingApplications] = useState([
    {
      id: 'app-1',
      name: 'K. Venkatesh Reddy',
      email: 'venkatesh.reddy@gmail.com',
      village: 'Pedda Harivanam',
      occupation: 'Software Engineer & Youth Volunteer',
      appliedAt: '2026-03-28',
      status: 'pending'
    },
    {
      id: 'app-2',
      name: 'B. Sravani',
      email: 'sravani.b@outlook.com',
      village: 'Pedda Harivanam',
      occupation: 'Govt Teacher',
      appliedAt: '2026-04-01',
      status: 'pending'
    }
  ]);

  const handleApproveSample = (id: string, name: string) => {
    alert(`[SIMULATION] Approved membership for ${name}! Assigned role "member" and generated ID "PHDY-2026-${Math.floor(1000 + Math.random() * 9000)}".`);
    setPendingApplications(prev => prev.filter(a => a.id !== id));
  };

  const handleRejectSample = (id: string, name: string) => {
    alert(`[SIMULATION] Rejected membership request for ${name}.`);
    setPendingApplications(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className={`w-full ${isStandalonePage ? 'pt-24 pb-16 min-h-screen bg-slate-50' : 'py-12 bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-black uppercase tracking-wider mb-3 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>Role-Based Access Control (RBAC) Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Multi-Tier Dashboard Access Control
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Experience our hierarchical, PostgreSQL Row-Level-Security (RLS) protected interface. 
            Features automatically unlock or restrict based on verified user roles and database permissions.
          </p>
        </div>

        {/* Interactive Role Simulator Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-200 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Live Role Simulator & Identity Inspector
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Current Effective Role: <span className="font-bold text-orange-600 uppercase">{effectiveRole}</span>
                {loggedInUser && simulationRole === 'actual' && ` (Logged in as ${loggedInUser.email})`}
              </p>
            </div>

            {/* Role Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-gray-400 mr-1 hidden sm:inline">Simulate Role:</span>
              
              <button
                onClick={() => setSimulationRole('actual')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  simulationRole === 'actual'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Actual Session
              </button>

              <button
                onClick={() => setSimulationRole('user')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  simulationRole === 'user'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                1. Standard User
              </button>

              <button
                onClick={() => setSimulationRole('member')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  simulationRole === 'member'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                2. PHDY Member
              </button>

              <button
                onClick={() => setSimulationRole('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  simulationRole === 'admin'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                3. Administrator
              </button>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <div className="flex space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('tiers')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'tiers'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Interactive Tier Views</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'architecture'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Guard Code & Flow</span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>PostgreSQL RLS Matrix</span>
            </button>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE TIERS */}
        {activeTab === 'tiers' && (
          <div className="space-y-8">
            
            {/* Tier Selector Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1 */}
              <div 
                onClick={() => setSelectedTier(1)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden ${
                  selectedTier === 1 
                    ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black text-xs uppercase tracking-wider">
                    Tier 1: Public & User
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Unlock className="w-3.5 h-3.5" /> Unlocked
                  </span>
                </div>
                <h4 className="text-base font-black text-gray-900">Community & Public Data</h4>
                <p className="text-xs text-gray-500 mt-1">Village projects, GIS maps, application status tracker.</p>
                <div className="mt-3 text-[11px] font-mono text-gray-600 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" />
                  <span>Roles: user, member, moderator, admin</span>
                </div>
              </div>

              {/* Card 2 */}
              <div 
                onClick={() => setSelectedTier(2)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden ${
                  selectedTier === 2 
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-100' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider">
                    Tier 2: Member Tier
                  </span>
                  {hasTier2Access ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <Unlock className="w-3.5 h-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-gray-900">PHDY Verified Member</h4>
                <p className="text-xs text-gray-500 mt-1">Internal directory, meeting minutes, youth fund & voting.</p>
                <div className="mt-3 text-[11px] font-mono text-gray-600 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Roles: member, moderator, admin</span>
                </div>
              </div>

              {/* Card 3 */}
              <div 
                onClick={() => setSelectedTier(3)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden ${
                  selectedTier === 3 
                    ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-100' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-black text-xs uppercase tracking-wider">
                    Tier 3: Executive Admin
                  </span>
                  {hasTier3Access ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <Unlock className="w-3.5 h-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-gray-900">Governance & Control</h4>
                <p className="text-xs text-gray-500 mt-1">Approve Join Us requests, RBAC permissions, treasury audits.</p>
                <div className="mt-3 text-[11px] font-mono text-gray-600 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-orange-500" />
                  <span>Roles: admin, super_admin</span>
                </div>
              </div>

            </div>

            {/* DISPLAY SELECTED TIER CONTENT WITH ACCESS CONTROL */}

            {/* TIER 1 DISPLAY */}
            {selectedTier === 1 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-gray-100">
                  <div>
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Public & User Tier</span>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">Pedda Harivanam Public Village Dashboard</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold">
                      Permissions: <code className="font-mono">view_public_data</code>, <code className="font-mono">view_dashboard</code>
                    </span>
                  </div>
                </div>

                {/* Public Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <Building className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700">12 Active</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-3">24 Works</p>
                    <p className="text-xs text-gray-600 font-medium">Village Development Works</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <Users className="w-6 h-6 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">Active</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-3">150+ Youths</p>
                    <p className="text-xs text-gray-600 font-medium">PHDY Youth Community</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center justify-between">
                      <Compass className="w-6 h-6 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700">GIS Live</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-3">48 Points</p>
                    <p className="text-xs text-gray-600 font-medium">Water Tanks & Public Assets</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <Award className="w-6 h-6 text-purple-600" />
                      <span className="text-xs font-bold text-purple-700">Status</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-3">Registered</p>
                    <p className="text-xs text-gray-600 font-medium">Your Account Tier</p>
                  </div>
                </div>

                {/* Application Status Tracker for User */}
                <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent p-5 rounded-2xl border border-orange-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        PHDY Official Membership Status
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {hasTier2Access
                          ? '✅ You are an approved official PHDY Member! You have full access to Tier 2 Member privileges.'
                          : 'Want to access the Internal Members Directory, Financial Ledgers, and Resolutions? Submit a Join Us form.'}
                      </p>
                    </div>
                    {!hasTier2Access && onNavigate && (
                      <button
                        onClick={() => onNavigate('contact')}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>Apply For Membership</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Village Notice Board */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-3">
                    Public Village Notices & Announcements
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3 text-xs">
                      <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-900">Pedda Harivanam Youth Cleanliness Drive:</span>
                        <span className="text-gray-600 ml-1">Scheduled for this coming Sunday at Gram Panchayat square. All youths are invited.</span>
                      </div>
                    </div>
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3 text-xs">
                      <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-900">GIS Landmark Verification:</span>
                        <span className="text-gray-600 ml-1">Water supply pipelines and solar street lights mapping updated in Village GIS page.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIER 2 DISPLAY */}
            {selectedTier === 2 && (
              <div className="relative">
                {/* Security Lock Overlay if not permitted */}
                {!hasTier2Access ? (
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-amber-200 text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto flex items-center justify-center text-amber-600">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        Tier 2 Restricted: PHDY Member Access Required
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">
                        This view requires the <code className="bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">member</code> role 
                        and <code className="bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">view_member_data</code> permission.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        You can test this view by switching to <span className="font-bold text-emerald-700">&quot;2. PHDY Member&quot;</span> in the role simulator above, 
                        or submit a membership application via the Join Us page.
                      </p>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('contact')}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Submit Join Us Application</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-gray-100">
                      <div>
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Member Portal Tier</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">Verified PHDY Member Internal Workspace</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                          Permissions: <code className="font-mono">view_member_data</code>
                        </span>
                      </div>
                    </div>

                    {/* Member ID Card Preview */}
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Pedda Harivanam Development Youth</span>
                          <h4 className="text-xl font-black tracking-tight mt-0.5">Official Member Identity</h4>
                        </div>
                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg font-mono font-bold text-xs">
                          PHDY-2026-0842
                        </span>
                      </div>
                      <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pt-4 border-t border-emerald-500/40 text-xs">
                        <div>
                          <p className="text-emerald-200 text-[10px] uppercase font-bold">Member Name</p>
                          <p className="font-bold text-sm">{loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Simulated Member'}</p>
                        </div>
                        <div>
                          <p className="text-emerald-200 text-[10px] uppercase font-bold">Assigned Role</p>
                          <p className="font-bold">{effectiveRole.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-emerald-200 text-[10px] uppercase font-bold">Standing</p>
                          <p className="font-bold text-emerald-300">Active & Verified</p>
                        </div>
                      </div>
                    </div>

                    {/* Member Exclusive Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Youth General Body Resolutions</span>
                        </h4>
                        <ul className="space-y-2 text-xs text-gray-600">
                          <li className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Res #2026/03: Youth Hall Solar Inverter Purchase</span>
                            <span className="text-emerald-600 font-bold">Passed</span>
                          </li>
                          <li className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Res #2026/02: Street Nameplates Installation</span>
                            <span className="text-blue-600 font-bold">In Progress</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>PHDY Youth Welfare Fund Balance</span>
                        </h4>
                        <div className="p-3 bg-white rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Available Balance:</span>
                            <span className="text-base font-black text-emerald-700 font-mono">₹ 1,42,850.00</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">Audited and reconciled on 1st of every month.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TIER 3 DISPLAY */}
            {selectedTier === 3 && (
              <div className="relative">
                {!hasTier3Access ? (
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-red-200 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        Tier 3 Restricted: Administrator Clearance Only
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">
                        This view requires the <code className="bg-red-50 px-1.5 py-0.5 rounded font-mono font-bold text-red-800">admin</code> role 
                        and <code className="bg-red-50 px-1.5 py-0.5 rounded font-mono font-bold text-red-800">approve_members</code>, <code className="bg-red-50 px-1.5 py-0.5 rounded font-mono font-bold text-red-800">manage_users</code> permissions.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        You can test this view by clicking <span className="font-bold text-orange-600">&quot;3. Administrator&quot;</span> in the role simulator at the top of the page.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-gray-100">
                      <div>
                        <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Executive Admin Tier</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">PHDY Administration & RBAC Management</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-xs font-bold">
                          All Permissions Active (<code className="font-mono">approve_members</code>, <code className="font-mono">manage_users</code>)
                        </span>
                      </div>
                    </div>

                    {/* Pending Applications Approval Queue */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-orange-600" />
                          <span>Join Us Membership Approval Queue ({pendingApplications.length})</span>
                        </h4>
                        <span className="text-[11px] text-gray-500">Executes <code className="font-mono text-orange-700">approve_membership()</code> RPC</span>
                      </div>

                      {pendingApplications.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500">
                          All membership applications have been reviewed and processed.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {pendingApplications.map(app => (
                            <div key={app.id} className="p-4 bg-gray-50 hover:bg-orange-50/40 rounded-2xl border border-gray-200 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-900 text-sm">{app.name}</span>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">Pending Review</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {app.email} • {app.village} • <span className="italic">{app.occupation}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleApproveSample(app.id, app.name)}
                                  className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve & Grant Member</span>
                                </button>
                                <button
                                  onClick={() => handleRejectSample(app.id, app.name)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fast Navigation to Full Admin Portal */}
                    {onNavigate && (
                      <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-xs text-gray-500">Need full access to the database tables, ledger, or system logs?</p>
                        <button
                          onClick={() => onNavigate('admin')}
                          className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                        >
                          <span>Open Full Admin Portal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: ARCHITECTURE & GUARD CODE */}
        {activeTab === 'architecture' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
              Frontend Guard Components & Router Protection Pattern
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* RoleGuard Explanation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                  <h4 className="text-sm font-bold text-gray-900 font-mono">{'<RoleGuard roles={["admin"]} />'}</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Conditionally renders UI elements only when the active user possesses one of the required roles.
                </p>
                <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto">
                  <pre>{`// Example in JSX
<RoleGuard 
  roles={['admin', 'super_admin']} 
  fallback={<LockedBanner />}
>
  <ExecutiveAdminControls />
</RoleGuard>`}</pre>
                </div>
              </div>

              {/* PermissionGuard Explanation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-gray-900 font-mono">{'<PermissionGuard permission="approve_members" />'}</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Granular permission-based guard. Checks both user roles and permissions mapped in PostgreSQL.
                </p>
                <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto">
                  <pre>{`// Example in JSX
<PermissionGuard permission="approve_members">
  <ApproveApplicationButton 
    onApprove={handleApprove} 
  />
</PermissionGuard>`}</pre>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: POSTGRESQL RLS MATRIX */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                  PostgreSQL Row Level Security (RLS) Permission Matrix
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Server-side security enforced directly at the database engine level.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-50 border-b border-gray-200 font-black text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Resource / Table</th>
                    <th className="p-3">Guest</th>
                    <th className="p-3">User (Tier 1)</th>
                    <th className="p-3">Member (Tier 2)</th>
                    <th className="p-3">Admin (Tier 3)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-900">profiles</td>
                    <td className="p-3 text-gray-500">Public Active</td>
                    <td className="p-3 text-emerald-600 font-bold">Read & Update Own</td>
                    <td className="p-3 text-emerald-600 font-bold">Read & Update Own</td>
                    <td className="p-3 text-emerald-700 font-bold">Full Manage (ALL)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-900">phdy_members</td>
                    <td className="p-3 text-red-500">Blocked</td>
                    <td className="p-3 text-blue-600 font-bold">Insert & Read Own Pending</td>
                    <td className="p-3 text-emerald-600 font-bold">Read Directory</td>
                    <td className="p-3 text-emerald-700 font-bold">Full Manage & Approve</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-900">user_roles</td>
                    <td className="p-3 text-red-500">Blocked</td>
                    <td className="p-3 text-blue-600 font-bold">Read Own</td>
                    <td className="p-3 text-emerald-600 font-bold">Read Own</td>
                    <td className="p-3 text-emerald-700 font-bold">Full Manage (ALL)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-900">phdy_fund_transactions</td>
                    <td className="p-3 text-gray-500">Public Summary</td>
                    <td className="p-3 text-blue-600 font-bold">Read Summary</td>
                    <td className="p-3 text-emerald-600 font-bold">Full Ledger Audit</td>
                    <td className="p-3 text-emerald-700 font-bold">Create & Modify</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
