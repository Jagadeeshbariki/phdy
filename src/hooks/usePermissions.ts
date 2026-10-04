import { useAuth } from '../auth/AuthProvider';

export const usePermissions = () => {
  const { isAdmin, isMember, loading } = useAuth();
  return {
    canViewMemberData: isMember || isAdmin,
    canViewBeneficiaryData: isMember || isAdmin,
    canViewFinancialData: isMember || isAdmin,
    canManageMembers: isAdmin,
    canManageUsers: isAdmin,
    canManageData: isAdmin,
    canApproveMembers: isAdmin,
    isLoading: loading,
    hasPermission: (perm: string) => {
      if (isAdmin) return true;
      if (isMember && ['view_member_data', 'view_financial_data', 'view_internal'].includes(perm)) return true;
      return perm === 'view_public_data';
    },
    hasAnyPermission: (_perms: string[]) => true,
  };
};
