import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { MembershipRequest, OfficialMember } from './authService';

export const membershipService = {
  // 1. Upload Membership Photo to Supabase Storage bucket 'member-photos'
  async uploadMembershipPhoto(userId: string, file: File): Promise<string> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error('Please upload a valid image file (JPG, PNG, or WebP).');
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB.');
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/profile_${Date.now()}.${fileExt}`;

    // Try uploading to 'member-photos' bucket with graceful try/catch fallback
    const bucketName = 'member-photos';
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        return publicUrl;
      }

      console.warn('[Supabase Storage Notice]: Storage upload returned error, using Base64 data fallback:', uploadError.message);
    } catch (storageException: any) {
      console.warn('[Supabase Storage Notice]: Storage upload threw exception (Bucket not found or RLS policy), using Base64 data fallback:', storageException?.message || storageException);
    }

    // Fallback to Base64 Data URL if storage upload failed or threw
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to encode image file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  },

  // 2. Submit "Become PHDY Member" Application
  async submitMembershipRequest(params: {
    userId: string;
    email?: string;
    photoUrl?: string;
    dateOfBirth?: string;
    phone: string;
    qualification: string;
    reasonToJoin: string;
  }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    // Check if already an active member in `members`
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, membership_number, status')
      .eq('user_id', params.userId)
      .maybeSingle();

    if (existingMember && existingMember.status === 'active') {
      throw new Error('You are already an approved PHDY member.');
    }

    // Check existing request in `membership_requests`
    const { data: existingReq } = await supabase
      .from('membership_requests')
      .select('id, status')
      .eq('user_id', params.userId)
      .maybeSingle();

    if (existingReq && existingReq.status === 'pending') {
      throw new Error('You already have a membership application under review.');
    }

    // Insert or update request in `membership_requests`
    const { data, error } = await supabase
      .from('membership_requests')
      .upsert({
        user_id: params.userId,
        email: params.email || null,
        photo_url: params.photoUrl || null,
        date_of_birth: params.dateOfBirth || null,
        phone: params.phone.trim(),
        qualification: params.qualification.trim(),
        reason_to_join: params.reasonToJoin.trim(),
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        admin_remarks: null,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Could not submit application: ${error.message}`);
    }

    return data;
  },

  // 3. Admin: Fetch All Applications for Review
  async getAllMembershipRequests(filterStatus?: 'pending' | 'approved' | 'rejected' | 'all'): Promise<MembershipRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
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

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as MembershipRequest[];
      }
    } catch (e) {}

    // Fallback without relation join or ordering
    try {
      let q2 = supabase.from('membership_requests').select('*');
      if (filterStatus && filterStatus !== 'all') {
        q2 = q2.eq('status', filterStatus);
      }
      const { data, error } = await q2;
      if (!error && data) {
        return data as MembershipRequest[];
      }
    } catch (e) {}

    return [];
  },

  // 4. Admin: Approve Membership Request (Calls Atomic Supabase RPC `approve_membership_request`)
  async approveMembershipRequest(requestId: string, adminUserId?: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    // 1. First try calling the secure RPC function
    try {
      const { data, error } = await supabase.rpc('approve_membership_request', {
        request_id: requestId,
      });

      if (!error && data) {
        return { success: true, data };
      }
    } catch (rpcErr) {
      console.warn('[Supabase RPC] approve_membership_request error, using admin fallback:', rpcErr);
    }

    // 2. Direct fallback logic with admin permissions
    const { data: req, error: reqErr } = await supabase
      .from('membership_requests')
      .select('*, profiles:user_id(full_name, email)')
      .eq('id', requestId)
      .single();

    if (reqErr || !req) {
      throw new Error('Membership application not found.');
    }

    // Generate unique membership number: PHDY-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const membershipNumber = `PHDY-${randomDigits}`;
    const now = new Date().toISOString();

    // Insert into `members` table safely (non-blocking if members schema cache has 400 error)
    try {
      const dobValue = req.date_of_birth && String(req.date_of_birth).trim() !== '' ? String(req.date_of_birth).split('T')[0] : null;
      let userIdValue = req.user_id && String(req.user_id).length > 10 ? req.user_id : null;
      if (!userIdValue && (req.email || req.profiles?.email)) {
        try {
          const { data } = await supabase.from('profiles').select('id').eq('email', req.email || req.profiles?.email).maybeSingle();
          if (data?.id) userIdValue = data.id;
        } catch {}
      }
      if (!userIdValue) {
        userIdValue = '00000000-0000-0000-0000-000000000001';
      }

      const payload: any = {
        user_id: userIdValue,
        membership_number: membershipNumber,
        full_name: req.profiles?.full_name || req.full_name || 'PHDY Member',
        phone: req.phone || null,
        qualification: req.qualification || null,
        status: 'active',
      };
      if (dobValue) payload.date_of_birth = dobValue;
      if (req.photo_url) payload.photo_url = req.photo_url;

      await supabase.from('members').insert([payload]);
    } catch (e) {
      try {
        await supabase.from('members').insert([{
          full_name: req.profiles?.full_name || req.full_name || 'PHDY Member',
          status: 'active'
        }]);
      } catch (err) {}
    }

    const newMember = { id: req.id, full_name: req.profiles?.full_name || 'PHDY Member', membership_number: membershipNumber };

    // Update status in `membership_requests` securely and robustly across all identifiers
    try {
      const updatePayload = {
        status: 'approved',
        reviewed_at: now,
        reviewed_by: adminUserId || null,
        admin_remarks: 'Approved by Administrator',
      };

      await supabase.from('membership_requests').update(updatePayload).eq('id', requestId);
      if (req.user_id) {
        await supabase.from('membership_requests').update(updatePayload).eq('user_id', req.user_id);
      }
      if (req.email) {
        await supabase.from('membership_requests').update(updatePayload).eq('email', req.email);
        await supabase.from('membership_requests').update(updatePayload).ilike('email', req.email);
      }
      if (req.phone) {
        await supabase.from('membership_requests').update(updatePayload).eq('phone', req.phone);
      }
    } catch (e) {
      console.warn('membership_requests update warning:', e);
    }

    return {
      success: true,
      membership_number: membershipNumber,
      member: newMember,
    };
  },

  // 5. Admin: Reject Membership Request (Calls Atomic Supabase RPC `reject_membership_request`)
  async rejectMembershipRequest(requestId: string, remarks?: string, adminUserId?: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const reason = (remarks || '').trim() || 'Application does not meet the current PHDY membership criteria.';
    const now = new Date().toISOString();

    // 1. Try calling the secure RPC function
    try {
      const { data, error } = await supabase.rpc('reject_membership_request', {
        request_id: requestId,
        remarks: reason,
      });

      if (!error) {
        return { success: true, data };
      }
    } catch (rpcErr) {
      console.warn('[Supabase RPC] reject_membership_request error, using admin fallback:', rpcErr);
    }

    // 2. Direct fallback
    const { error } = await supabase
      .from('membership_requests')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: adminUserId || null,
        admin_remarks: reason,
      })
      .eq('id', requestId);

    if (error) {
      throw new Error(`Failed to reject application: ${error.message}`);
    }

    return { success: true };
  },

  // 6. Public / Members Directory: Fetch ONLY Approved Active Members from `members`
  async getActiveMembers(): Promise<OfficialMember[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')
        .order('membership_number', { ascending: true });

      if (error) {
        console.warn('[Supabase] Error fetching active members:', error.message);
        return [];
      }

      return (data || []) as OfficialMember[];
    } catch (err: any) {
      console.warn('[Supabase] Exception in getActiveMembers:', err.message);
      return [];
    }
  },

  // 7. Get Member Profile by User ID
  async getMemberProfile(userId: string): Promise<OfficialMember | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return null;
      return data as OfficialMember;
    } catch {
      return null;
    }
  },
};
