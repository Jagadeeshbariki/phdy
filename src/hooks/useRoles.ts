import { useAuth } from '../auth/AuthProvider';

export const useRoles = () => {
  const { roles, hasRole, hasAnyRole, isAdmin, isMember, isLoading } = useAuth();
  return {
    roles,
    hasRole,
    hasAnyRole,
    isAdmin: isAdmin(),
    isMember: isMember(),
    isModerator: hasRole('moderator'),
    isSuperAdmin: hasRole('super_admin'),
    isLoading,
  };
};
