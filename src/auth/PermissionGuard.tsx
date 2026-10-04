import React from 'react';
import { useAuth } from './AuthProvider';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  fallback,
}) => {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasPermission(requiredPermission)) {
    return (
      fallback || (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500 font-medium">
          Missing required permission: {requiredPermission}
        </div>
      )
    );
  }

  return <>{children}</>;
};
