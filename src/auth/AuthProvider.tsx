import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { authService, UserProfile, PHDYMemberApplication } from './authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: string[];
  permissions: string[];
  memberApplication: PHDYMemberApplication | null;
  isLoading: boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasPermission: (permCode: string) => boolean;
  hasAnyPermission: (permCodes: string[]) => boolean;
  isAdmin: () => boolean;
  isMember: () => boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>(['user']);
  const [permissions, setPermissions] = useState<string[]>(['view_public_data']);
  const [memberApplication, setMemberApplication] = useState<PHDYMemberApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async (currentUser: User) => {
    try {
      const data = await authService.getUserData(currentUser.id);
      setProfile(data.profile);
      setRoles(data.roles);
      setPermissions(data.permissions);
      setMemberApplication(data.memberApplication);
    } catch (err) {
      console.warn('Error fetching user roles/permissions:', err);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        loadUserData(initSession.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Real-time Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setProfile(null);
        setRoles(['user']);
        setPermissions(['view_public_data']);
        setMemberApplication(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (roleName: string) => {
    const rLower = roleName.toLowerCase();
    return roles.map(r => r.toLowerCase()).includes(rLower) || roles.map(r => r.toLowerCase()).includes('super_admin');
  };

  const hasAnyRole = (roleNames: string[]) => {
    const list = roleNames.map(r => r.toLowerCase());
    return roles.some(r => list.includes(r.toLowerCase()) || r.toLowerCase() === 'super_admin');
  };

  const hasPermission = (permCode: string) => {
    return permissions.includes(permCode) || hasRole('super_admin');
  };

  const hasAnyPermission = (permCodes: string[]) => {
    return permCodes.some(p => permissions.includes(p)) || hasRole('super_admin');
  };

  const isAdmin = () => hasRole('admin') || hasRole('super_admin');
  const isMember = () => hasRole('member') || isAdmin();

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles(['user']);
    setPermissions(['view_public_data']);
    setMemberApplication(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        permissions,
        memberApplication,
        isLoading,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasAnyPermission,
        isAdmin,
        isMember,
        refreshUserData,
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
