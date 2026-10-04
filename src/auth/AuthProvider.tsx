import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { authService, UserProfile, MembershipRequest, OfficialMember } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  membership: OfficialMember | null;
  membershipRequest: MembershipRequest | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<OfficialMember | null>(null);
  const [membershipRequest, setMembershipRequest] = useState<MembershipRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setMembership(null);
      setMembershipRequest(null);
      return;
    }

    try {
      const [userProfile, userMember, userReq] = await Promise.all([
        authService.getCurrentProfile(currentUser.id),
        authService.getCurrentMember(currentUser.id),
        authService.getMembershipRequest(currentUser.id),
      ]);

      const currentEmail = (currentUser.email || userProfile?.email || '').toLowerCase().trim();
      const isDesignatedAdmin = currentEmail === 'vyomanautjagadeesh@gmail.com' || currentEmail === 'admin@phdy.org';

      // Auto-elevate admin in profiles table if designated
      if (isDesignatedAdmin) {
        if (userProfile && !userProfile.is_admin) {
          try {
            await supabase.from('profiles').update({ is_admin: true }).eq('id', currentUser.id);
            userProfile.is_admin = true;
          } catch (e) {
            console.warn('[Admin elevation notice]:', e);
          }
        }
      }

      setProfile(userProfile);
      setMembership(userMember);
      setMembershipRequest(userReq);

      // Sync user session state for backward compatibility
      const role = (isDesignatedAdmin || userProfile?.is_admin)
        ? 'admin'
        : userMember?.status === 'active'
        ? 'phdy_member'
        : 'user';

      sessionStorage.setItem(
        'phdy_admin_session',
        JSON.stringify({
          email: currentUser.email || userProfile?.email || '',
          role,
          id: currentUser.id,
          name: userProfile?.full_name || '',
        })
      );
    } catch (err) {
      console.warn('[AuthProvider] Error loading profile/membership state:', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    if (user) {
      await fetchUserData(user);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Resolution
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
        if (!mounted) return;
        setSession(initSession);
        setUser(initSession?.user ?? null);
        if (initSession?.user) {
          await fetchUserData(initSession.user);
        }
        if (mounted) setLoading(false);
      }).catch(() => {
        if (mounted) setLoading(false);
      });

      // 2. Real-time Auth State Change Listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchUserData(currentUser);
        } else {
          setProfile(null);
          setMembership(null);
          setMembershipRequest(null);
        }
        setLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [fetchUserData]);

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
    setProfile(null);
    setMembership(null);
    setMembershipRequest(null);
  };

  const isAuthenticated = Boolean(user);
  const emailLower = (user?.email || profile?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(profile?.is_admin === true || (user?.user_metadata?.role || '').toLowerCase() === 'admin' || emailLower === 'vyomanautjagadeesh@gmail.com' || emailLower === 'admin@phdy.org');
  const reqStatus = (membershipRequest?.status || '').trim().toLowerCase();
  const isMember = Boolean(
    membership?.status === 'active' || 
    reqStatus === 'approved' || 
    reqStatus === 'active' || 
    reqStatus === 'accepted' || 
    isAdmin
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        membership,
        membershipRequest,
        loading,
        isAuthenticated,
        isAdmin,
        isMember,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
