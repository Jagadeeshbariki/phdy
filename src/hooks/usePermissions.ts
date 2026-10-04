import { useAuth } from '../auth/AuthProvider';

export const usePermissions = () => {
  const { permissions, hasPermission, hasAnyPermission, isLoading } = useAuth();
  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    canViewMemberData: hasPermission('view_member_data'),
    canViewBeneficiaryData: hasPermission('view_beneficiary_data'),
    canViewFinancialData: hasPermission('view_financial_data'),
    canManageMembers: hasPermission('manage_members'),
    canManageUsers: hasPermission('manage_users'),
    canManageData: hasPermission('manage_data'),
    canApproveMembers: hasPermission('approve_members'),
    isLoading,
  };
};
