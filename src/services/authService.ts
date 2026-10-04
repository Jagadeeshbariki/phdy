import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  status: 'active' | 'blocked';
  is_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MembershipRequest {
  id: string;
  user_id: string;
  photo_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  qualification: string | null;
  reason_to_join: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  admin_remarks?: string | null;
  profiles?: UserProfile;
}

export interface OfficialMember {
  id: string;
  user_id: string;
  membership_number: string;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  qualification: string | null;
  reason_to_join: string | null;
  joined_at: string;
  approved_at: string;
  approved_by?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export const authService = {
  // 1. Sign Up (creates auth.users + profiles record)
  async register(fullName: string, email: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl('#login'),
        data: {
          full_name: cleanName,
          name: cleanName,
          role: 'user',
        },
      },
    });

    if (error) {
      const errLower = error.message?.toLowerCase() || '';
      if (errLower.includes('already registered') || errLower.includes('already exists') || errLower.includes('user already registered')) {
        throw new Error('This email address is already registered. Please log in.');
      }
      if (errLower.includes('password should be at least')) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (
        errLower.includes('rate limit') || 
        errLower.includes('too many requests') ||
        errLower.includes('over_email_send_rate_limit') ||
        errLower.includes('security purposes')
      ) {
        throw new Error('Supabase email verification rate limit reached (1 request per 60 seconds). Please check your email inbox and spam folder, or wait 60 seconds before trying again.');
      }
      throw error;
    }

    // Auto-create/upsert corresponding profiles record
    if (data?.user?.id) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: cleanName,
          email: cleanEmail,
          status: 'active',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (profErr) {
        console.warn('[Profiles upsert notice]:', profErr);
      }
    }

    return data;
  },

  // 2. Sign In with Password
  async login(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const errLower = error.message?.toLowerCase() || '';
      if (errLower.includes('email not confirmed') || errLower.includes('not confirmed')) {
        throw new Error('Please verify your email address before logging in.');
      }
      if (errLower.includes('invalid login credentials') || errLower.includes('invalid credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw error;
    }

    return data;
  },

  // 3. Resend Confirmation Email
  async resendVerificationEmail(email: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl('#login'),
      },
    });
    if (error) throw error;
  },

  // 4. Sign Out
  async logout() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('phdy_admin_session');
  },

  // 5. Request Password Reset Link
  async requestPasswordReset(email: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getAuthRedirectUrl('#set-password'),
    });

    if (error) throw error;
  },

  // 6. Update Password
  async updatePassword(newPassword: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  // 7. Get Current User Profile from `profiles`
  async getCurrentProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Profile] Error fetching profile:', error.message);
        return null;
      }
      return data as UserProfile;
    } catch {
      return null;
    }
  },

  // 8. Get Membership Request for User from `membership_requests`
  async getMembershipRequest(userId: string): Promise<MembershipRequest | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('membership_requests')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Membership Request] Fetch notice:', error.message);
        return null;
      }
      return data as MembershipRequest;
    } catch {
      return null;
    }
  },

  // 9. Get Approved Member Record for User from `members`
  async getCurrentMember(userId: string): Promise<OfficialMember | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && (data.status === 'active' || data.status === 'approved' || data.status === 'Approved')) {
        return data as OfficialMember;
      }
    } catch {}

    // Fallback: Check membership_requests table if approved manually in database
    try {
      const { data: reqData } = await supabase
        .from('membership_requests')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (reqData) {
        const st = String(reqData.status || '').trim().toLowerCase();
        if (st === 'approved' || st === 'active' || st === 'accepted') {
          const officialMember: OfficialMember = {
            id: reqData.id,
            user_id: userId,
            membership_number: `PHDY-${Math.floor(100000 + Math.random() * 900000)}`,
            full_name: reqData.full_name || 'PHDY Member',
            photo_url: reqData.photo_url || null,
            date_of_birth: reqData.date_of_birth || null,
            phone: reqData.phone || null,
            qualification: reqData.qualification || null,
            reason_to_join: reqData.reason_to_join || null,
            joined_at: reqData.submitted_at || new Date().toISOString(),
            approved_at: new Date().toISOString(),
            status: 'active',
          };

          try {
            await supabase.from('members').upsert({
              user_id: userId,
              membership_number: officialMember.membership_number,
              full_name: officialMember.full_name,
              photo_url: officialMember.photo_url,
              date_of_birth: officialMember.date_of_birth,
              phone: officialMember.phone,
              qualification: officialMember.qualification,
              reason_to_join: officialMember.reason_to_join,
              joined_at: officialMember.joined_at,
              approved_at: officialMember.approved_at,
              status: 'active',
            }, { onConflict: 'user_id' });
          } catch (e) {}

          return officialMember;
        }
      }
    } catch {}

    return null;
  },
};
