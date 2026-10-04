import { supabase } from '../services/supabase';
import { getAuthRedirectUrl } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  status: 'active' | 'blocked' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface PHDYMemberApplication {
  id: string;
  user_id: string;
  membership_id?: string;
  application_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  village?: string;
  mandal?: string;
  district?: string;
  occupation?: string;
  reason_to_join?: string;
  joined_at?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  profiles?: UserProfile;
}

export const authService = {
  // 1. Normal User Registration
  async register({
    email,
    password,
    fullName,
    phone,
  }: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    const redirectUrl = getAuthRedirectUrl('#login');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: phone?.trim(),
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // 2. Join Us (Member Application)
  async joinUs({
    email,
    password,
    fullName,
    phone,
    village,
    mandal,
    district,
    occupation,
    reasonToJoin,
  }: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    village?: string;
    mandal?: string;
    district?: string;
    occupation?: string;
    reasonToJoin?: string;
  }) {
    const redirectUrl = getAuthRedirectUrl('#login');
    
    // Step 1: Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: phone?.trim(),
        },
      },
    });

    if (authError) throw authError;

    const user = authData.user;
    if (user) {
      // Step 2: Insert into phdy_members with pending status
      const { error: memberError } = await supabase
        .from('phdy_members')
        .insert([
          {
            user_id: user.id,
            village: village?.trim(),
            mandal: mandal?.trim(),
            district: district?.trim(),
            occupation: occupation?.trim(),
            reason_to_join: reasonToJoin?.trim(),
            application_status: 'pending',
          },
        ]);

      if (memberError) {
        console.warn('phdy_members insert notice:', memberError.message);
      }
    }

    return authData;
  },

  // 3. Login
  async login(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  // 4. Logout
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 5. Password Reset Request
  async requestPasswordReset(email: string) {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  },

  // 6. Set New Password
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },

  // 7. Load Profile, Roles and Permissions
  async getUserData(userId: string) {
    try {
      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Roles via user_roles junction
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId);

      const roles = (userRoles || [])
        .map((ur: any) => ur.roles?.name)
        .filter(Boolean);

      // Call database security functions for exact authorization
      const { data: dbRoles } = await supabase.rpc('get_user_roles');
      const { data: dbPermissions } = await supabase.rpc('get_user_permissions');

      const mergedRoles = Array.from(new Set([...roles, ...(dbRoles || [])]));
      const permissions = (dbPermissions || []).map((p: any) => p.permission_code || p);

      // Check membership application status
      const { data: memberApp } = await supabase
        .from('phdy_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        profile,
        roles: mergedRoles.length > 0 ? mergedRoles : ['user'],
        permissions,
        memberApplication: memberApp,
      };
    } catch (err) {
      console.warn('Failed to load user permissions from DB:', err);
      return {
        profile: null,
        roles: ['user'],
        permissions: ['view_public_data', 'view_dashboard'],
        memberApplication: null,
      };
    }
  },

  // 8. Admin RPC: Approve Membership
  async approveMembership(targetUserId: string) {
    const { data, error } = await supabase.rpc('approve_membership', {
      target_user_id: targetUserId,
    });
    if (error) throw error;
    return data;
  },

  // 9. Admin RPC: Reject Membership
  async rejectMembership(targetUserId: string, reason?: string) {
    const { data, error } = await supabase.rpc('reject_membership', {
      target_user_id: targetUserId,
      rejection_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  // 10. Fetch Applications for Admin Review
  async getMembershipApplications() {
    const { data, error } = await supabase
      .from('phdy_members')
      .select('*, profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PHDYMemberApplication[];
  },
};
