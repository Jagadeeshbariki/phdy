import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { membershipService } from '../services/membershipService';
import { MembershipRequest } from '../services/authService';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle,
  Eye,
  User,
  Calendar,
  Phone,
  GraduationCap,
  FileText,
  Mail,
  Award
} from 'lucide-react';

export const AdminMembershipApplications: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [applications, setApplications] = useState<MembershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState<MembershipRequest | null>(null);
  
  // Rejection Modal State
  const [rejectingApp, setRejectingApp] = useState<MembershipRequest | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await membershipService.getAllMembershipRequests();
      setApplications(data || []);
    } catch (err: any) {
      console.warn('Failed to load applications:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (app: MembershipRequest) => {
    const applicantName = app.profiles?.full_name || 'this applicant';
    if (!window.confirm(`Approve official PHDY Membership for ${applicantName}? This will create an official member record and generate a unique membership number.`)) {
      return;
    }

    setProcessingId(app.id);
    setActionMessage(null);

    try {
      const res = await membershipService.approveMembershipRequest(app.id, user?.id);
      
      setActionMessage({
        type: 'success',
        text: `Membership approved successfully! Assigned Membership Number: ${res.membership_number || 'Generated'}. An approval notification has been prepared for ${app.profiles?.email || 'user'}.`,
      });

      if (selectedApp?.id === app.id) {
        setSelectedApp(null);
      }

      await loadApplications();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Approval failed: ${err.message || 'Database error'}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApp) return;

    setProcessingId(rejectingApp.id);
    setActionMessage(null);

    try {
      await membershipService.rejectMembershipRequest(
        rejectingApp.id,
        rejectRemarks,
        user?.id
      );

      setActionMessage({
        type: 'success',
        text: `Application for ${rejectingApp.profiles?.full_name || 'applicant'} was rejected with remarks recorded.`,
      });

      setRejectingApp(null);
      setRejectRemarks('');
      if (selectedApp?.id === rejectingApp.id) {
        setSelectedApp(null);
      }

      await loadApplications();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Rejection failed: ${err.message || 'Database error'}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    const statusMatch = filterStatus === 'all' ? true : app.status === filterStatus;
    const nameMatch = 
      (app.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.phone || '').includes(searchTerm) ||
      (app.qualification || '').toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && nameMatch;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Membership Applications
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Review and officially approve or reject pending youth member applications.
          </p>
        </div>

        <button
          onClick={loadApplications}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-3 animate-fadeIn ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'pending' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'approved' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'rejected' 
                ? 'bg-red-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'all' 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({applications.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search applicants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
          />
        </div>
      </div>

      {/* Applications Table / Cards */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-500">Loading applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">No Applications in this Category</h3>
          <p className="text-xs text-gray-500 mt-1">There are no membership requests matching your current filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-6">Applicant</th>
                  <th className="py-4 px-6">Contact / Phone</th>
                  <th className="py-4 px-6">Qualification</th>
                  <th className="py-4 px-6">Submitted Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-orange-50/30 transition-colors">
                    
                    {/* Applicant Photo & Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                          {app.photo_url ? (
                            <img src={app.photo_url} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-gray-900">
                            {app.profiles?.full_name || 'Unnamed Applicant'}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate max-w-[160px]">
                            {app.profiles?.email || 'No email provided'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 font-bold text-gray-700">
                      {app.phone || 'N/A'}
                    </td>

                    {/* Qualification */}
                    <td className="py-4 px-6 font-semibold text-gray-600 truncate max-w-[150px]">
                      {app.qualification || 'N/A'}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-6 text-gray-500 font-medium">
                      {new Date(app.submitted_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {app.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {app.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {app.status === 'pending' && <Clock className="w-3 h-3" />}
                        <span>{app.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                          title="View Full Application"
                        >
                          View
                        </button>

                        {/* Quick Approve / Reject for Pending items */}
                        {app.status === 'pending' && (
                          <>
                            <button
                              disabled={processingId === app.id}
                              onClick={() => handleApprove(app)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={processingId === app.id}
                              onClick={() => { setRejectingApp(app); setRejectRemarks(''); }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Application Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition-all"
              >
                &times;
              </button>
            </div>

            {/* Profile Header in Modal */}
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-200 border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center">
                {selectedApp.photo_url ? (
                  <img src={selectedApp.photo_url} alt="Applicant" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <h4 className="font-black text-gray-950 text-base">
                  {selectedApp.profiles?.full_name || 'PHDY Applicant'}
                </h4>
                <p className="text-xs text-gray-500 font-bold">
                  {selectedApp.profiles?.email || 'N/A'}
                </p>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedApp.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    selectedApp.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedApp.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Application Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-bold text-gray-800">{selectedApp.phone || 'N/A'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date of Birth</span>
                <span className="font-bold text-gray-800">{selectedApp.date_of_birth || 'N/A'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Qualification / Occupation</span>
                <span className="font-bold text-gray-800">{selectedApp.qualification || 'N/A'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reason to Join PHDY</span>
                <p className="text-gray-800 font-medium mt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedApp.reason_to_join || 'No reason provided.'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Submitted Timestamp</span>
                <span className="font-bold text-gray-800">{new Date(selectedApp.submitted_at).toLocaleString()}</span>
              </div>
              {selectedApp.admin_remarks && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 sm:col-span-2">
                  <span className="text-[10px] font-black text-red-800 uppercase tracking-wider block">Admin Remarks</span>
                  <p className="text-red-900 font-medium mt-1">{selectedApp.admin_remarks}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
              >
                Close
              </button>

              {selectedApp.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setRejectingApp(selectedApp); setRejectRemarks(''); }}
                    className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs border border-red-200"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedApp)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-200"
                  >
                    Approve Membership
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REMARKS MODAL */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-lg font-black text-gray-900">
                Reject Membership Application
              </h3>
            </div>

            <p className="text-xs text-gray-600">
              Please enter the administrator remarks or reason for rejecting{' '}
              <strong className="text-gray-900">{rejectingApp.profiles?.full_name}</strong>'s application.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Admin Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Incomplete verification details or eligibility criteria not fulfilled..."
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingApp(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingApp.id}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-red-200 disabled:opacity-50"
                >
                  {processingId === rejectingApp.id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
