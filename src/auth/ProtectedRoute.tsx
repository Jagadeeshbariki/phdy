import React from 'react';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectToLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectToLogin,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    if (redirectToLogin) {
      redirectToLogin();
      return null;
    }
    return (
      fallback || (
        <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-3xl max-w-lg mx-auto my-12">
          <h3 className="text-lg font-bold text-amber-900 mb-2">Authentication Required</h3>
          <p className="text-sm text-amber-700 mb-4">Please sign in to access this protected section.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
};
