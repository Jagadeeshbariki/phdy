import React from 'react';
import { useAuth } from './AuthProvider';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { hasAnyRole, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasAnyRole(allowedRoles)) {
    return (
      fallback || (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
            Access Restricted: Requires {allowedRoles.join(' or ')} role.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
};
