import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { MembershipRequest, OfficialMember } from './authService';

export const membershipService = {
  // 1. Upload Membership Photo to Supabase Storage
  async uploadMembershipPhoto(userId: string, file: File): Promise<string> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/profile_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('membership-photos')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('membership-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // 2. Submit "Become PHDY Member" Application
  async submitMembershipRequest(params: {
    userId: string;
    photoUrl?: string;
    dateOfBirth?: string;
    phone: string;
    qualification: string;
    reasonToJoin: string;
  }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    // Check if pending application already exists
    const { data: existing } = await supabase
      .from('membership_requests')
      .select('id, status')
      .eq('user_id', params.userId)
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      throw new Error('You already have a pending membership application under review.');
    }

    if (existing && existing.status === 'approved') {
      throw new Error('You are already an approved PHDY Member.');
    }

    // Insert or update request
    const { data, error } = await supabase
      .from('membership_requests')
      .upsert({
        user_id: params.userId,
        photo_url: params.photoUrl || null,
        date_of_birth: params.dateOfBirth || null,
        phone: params.phone,
        qualification: params.qualification,
        reason_to_join: params.reasonToJoin,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        admin_remarks: null,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 2b. Submit Join Request from Contact form (with auto-profile resolution)
  async submitJoinRequest(data: {
    fullName: string;
    phone: string;
    email?: string;
    education?: string;
    address?: string;
    motivation?: string;
    photoFile?: File | null;
    photoUrl?: string;
  }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    // 1. Get current logged in user if available
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else if (data.email) {
      const cleanEmail = data.email.toLowerCase().trim();
      // Check if profile exists
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (prof?.id) {
        userId = prof.id;
      } else {
        // Create auth user & profile for this applicant
        const { data: signUpData } = await supabase.auth.signUp({
          email: cleanEmail,
          password: 'Phdy@' + Math.random().toString(36).substring(2, 8) + '!',
          options: {
            data: {
              full_name: data.fullName,
            },
          },
        });
        if (signUpData?.user?.id) {
          userId = signUpData.user.id;
        }
      }
    }

    if (!userId) {
      throw new Error('Please sign in or register before submitting your membership application.');
    }

    // Upload photo if file provided
    let finalPhotoUrl = data.photoUrl || '';
    if (data.photoFile) {
      try {
        finalPhotoUrl = await this.uploadMembershipPhoto(userId, data.photoFile);
      } catch (e) {
        console.warn('Storage upload error:', e);
      }
    }

    // Insert or update into membership_requests
    const { data: inserted, error: insErr } = await supabase
      .from('membership_requests')
      .upsert({
        user_id: userId,
        photo_url: finalPhotoUrl || null,
        phone: data.phone,
        qualification: data.education || null,
        reason_to_join: data.motivation || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (insErr) throw insErr;
    return { success: true, data: inserted };
  },

  // 3. Admin: Fetch All Applications for Review
  async getAllMembershipRequests(): Promise<MembershipRequest[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('membership_requests')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          status,
          is_admin
        )
      `)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MembershipRequest[];
  },

  // 4. Admin: Approve Membership Request (Calls Atomic Database RPC)
  async approveMembershipRequest(requestId: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase.rpc('approve_membership_request', {
      request_id: requestId,
    });

    if (error) throw error;
    return data;
  },

  // 5. Admin: Reject Membership Request (Calls Atomic Database RPC)
  async rejectMembershipRequest(requestId: string, remarks?: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase.rpc('reject_membership_request', {
      request_id: requestId,
      remarks: remarks || 'Application does not meet the current membership criteria.',
    });

    if (error) throw error;
    return data;
  },

  // 6. Public / Members Directory: Fetch ONLY Approved Active Members
  async getActiveMembers(): Promise<OfficialMember[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .order('membership_number', { ascending: true });

    if (error) throw error;
    return (data || []) as OfficialMember[];
  },

  // 7. Get Specific Member Profile by User ID
  async getMemberProfile(userId: string): Promise<OfficialMember | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as OfficialMember;
  },
};
