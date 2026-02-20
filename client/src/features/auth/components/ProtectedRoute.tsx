import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/stores/authStore';
import authService from '@/features/auth/services/authService';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isAuthVerified } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // On mount (or page reload), verify auth with server if not yet verified
    if (!isAuthVerified && isAuthenticated) {
      authService.getCurrentUser().catch(() => {
        // Token invalid or server down → clear auth state
        useAuth.getState().clearAuth();
      }).finally(() => {
        useAuth.getState().setAuthVerified(true);
      });
    } else if (!isAuthVerified && !isAuthenticated) {
      useAuth.getState().setAuthVerified(true);
    }
  }, [isAuthenticated, isAuthVerified]);

  // Show loading while verifying auth with server
  if (!isAuthVerified) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function PublicRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isAuthVerified } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthVerified && isAuthenticated) {
      authService.getCurrentUser().catch(() => {
        useAuth.getState().clearAuth();
      }).finally(() => {
        useAuth.getState().setAuthVerified(true);
      });
    } else if (!isAuthVerified && !isAuthenticated) {
      useAuth.getState().setAuthVerified(true);
    }
  }, [isAuthenticated, isAuthVerified]);

  if (!isAuthVerified) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
