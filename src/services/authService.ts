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
}

export const authService = {
  // 1. Sign Up (creates auth.users + triggers profiles insertion)
  async register(fullName: string, email: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl('#login'),
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // 2. Sign In
  async login(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // 3. Sign Out
  async logout() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  // 4. Request Password Reset Link
  async requestPasswordReset(email: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('#set-password'),
    });

    if (error) throw error;
  },

  // 5. Update Password
  async updatePassword(password: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },

  // 6. Get Current User Profile & Member Status
  async getCurrentUserProfile(): Promise<{
    profile: UserProfile | null;
    memberRecord: OfficialMember | null;
    pendingRequest: MembershipRequest | null;
  }> {
    if (!isSupabaseConfigured()) {
      return { profile: null, memberRecord: null, pendingRequest: null };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { profile: null, memberRecord: null, pendingRequest: null };
    }

    // Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch Official Member Record (if approved)
    const { data: memberRecord } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch Latest Membership Request
    const { data: pendingRequest } = await supabase
      .from('membership_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .maybeSingle();

    return {
      profile: profile as UserProfile,
      memberRecord: memberRecord as OfficialMember,
      pendingRequest: pendingRequest as MembershipRequest,
    };
  },
};
