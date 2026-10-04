import React, { useState, useEffect } from 'react';
import { authService, PHDYMemberApplication } from '../auth/authService';
import { supabase } from '../lib/supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { CheckCircle2, XCircle, Clock, ShieldCheck, UserCheck, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';

export const AdminMembershipApplications: React.FC = () => {
  const { canApproveMembers } = usePermissions();
  const [applications, setApplications] = useState<PHDYMemberApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getMembershipApplications();
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

  const handleApprove = async (app: PHDYMemberApplication) => {
    if (!window.confirm(`Approve official PHDY Membership for ${app.profiles?.full_name || 'this applicant'}?`)) {
      return;
    }

    setProcessingId(app.user_id);
    setActionMessage(null);
    try {
      const res = await authService.approveMembership(app.user_id);
      
      // Dispatch activation email to the approved user's email
      const userEmail = app.profiles?.email;
      if (userEmail) {
        try {
          await supabase.auth.signInWithOtp({
            email: userEmail,
            options: {
              emailRedirectTo: 'https://phdy.vercel.app/#login',
              data: {
                full_name: app.profiles?.full_name || 'Member',
                role: 'phdy_member'
              }
            }
          });
        } catch (e) {
          console.warn('Supabase automated email dispatch notice:', e);
        }
      }

      setActionMessage({
        type: 'success',
        text: `Approved! Membership ID ${res.membership_id || ''} assigned to ${app.profiles?.full_name}. Activation notification dispatched to ${userEmail || 'user'}.`,
      });
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

  const handleReject = async (app: PHDYMemberApplication) => {
    const reason = window.prompt(`Enter rejection reason for ${app.profiles?.full_name}:`);
    if (reason === null) return;

    setProcessingId(app.user_id);
    setActionMessage(null);
    try {
      await authService.rejectMembership(app.user_id, reason);
      setActionMessage({
        type: 'success',
        text: `Application for ${app.profiles?.full_name} marked as rejected.`,
      });
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
    const statusMatch = filterStatus === 'all' ? true : app.application_status === filterStatus;
    const name = (app.profiles?.full_name || '').toLowerCase();
    const email = (app.profiles?.email || '').toLowerCase();
    const village = (app.village || '').toLowerCase();
    const searchMatch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase()) || village.includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              RBAC Authorization
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
            PHDY Membership Applications
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Review "Join Us" applicants, verify details, and approve official PHDY Member role.
          </p>
        </div>

        <button
          onClick={loadApplications}
          disabled={isLoading}
          className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-orange-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Applications</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by applicant name, email, or village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-gray-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter Status:
            </span>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100">
              <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <th className="pb-3">Applicant</th>
                <th className="pb-3">Location & Occupation</th>
                <th className="pb-3">Reason to Join</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-800 font-black text-xs flex items-center justify-center border border-orange-200 flex-shrink-0">
                        {(app.profiles?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{app.profiles?.full_name || 'Applicant'}</p>
                        <p className="text-xs text-gray-500">{app.profiles?.email}</p>
                        {app.profiles?.phone && <p className="text-[11px] text-gray-400">📞 {app.profiles.phone}</p>}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 pr-4 text-xs font-semibold text-gray-700">
                    <p>{app.village || 'Pedda Harivanam'}, {app.mandal || 'Adoni'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{app.occupation || 'Youth Leader'}</p>
                  </td>

                  <td className="py-4 pr-4 max-w-xs">
                    <p className="text-xs text-gray-600 line-clamp-2 italic">
                      "{app.reason_to_join || 'Wants to participate in village youth initiatives.'}"
                    </p>
                  </td>

                  <td className="py-4 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.application_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.application_status === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {app.application_status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {app.application_status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {app.application_status === 'pending' && <Clock className="w-3 h-3" />}
                      <span>{app.application_status}</span>
                    </span>
                    {app.membership_id && (
                      <p className="text-[10px] font-mono text-gray-400 mt-1 font-bold">
                        ID: {app.membership_id}
                      </p>
                    )}
                  </td>

                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {app.application_status === 'pending' && canApproveMembers && (
                        <>
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={processingId === app.user_id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => handleReject(app)}
                            disabled={processingId === app.user_id}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all"
                          >
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {app.application_status === 'approved' && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Approved Member
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 italic text-sm">
                    {isLoading ? 'Loading applications from Supabase...' : 'No membership applications found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
