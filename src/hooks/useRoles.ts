import { useAuth } from '../auth/AuthProvider';

export const useRoles = () => {
  const { isAdmin, isMember, loading, profile, membership } = useAuth();
  return {
    isAdmin,
    isMember,
    isUser: !isAdmin && !isMember,
    isSuperAdmin: isAdmin,
    isModerator: isMember,
    isLoading: loading,
    profile,
    membership,
    hasRole: (role: string) => {
      const r = role.toLowerCase();
      if (r === 'admin' || r === 'super_admin') return isAdmin;
      if (r === 'member' || r === 'phdy_member') return isMember;
      return true;
    },
    hasAnyRole: (roleList: string[]) => {
      return roleList.some(role => {
        const r = role.toLowerCase();
        if (r === 'admin' || r === 'super_admin') return isAdmin;
        if (r === 'member' || r === 'phdy_member') return isMember;
        return true;
      });
    },
  };
};
