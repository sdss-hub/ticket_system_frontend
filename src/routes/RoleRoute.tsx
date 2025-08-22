import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { UserRole } from '../api/types';

interface RoleRouteProps extends PropsWithChildren {
  allow: UserRole[];
}

const RoleRoute = ({ allow, children }: RoleRouteProps) => {
  const { user, restoring, token } = useAuth();
  const location = useLocation();

  if (restoring || (token && !user)) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-gray-600">Checking session…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allow.includes(user.role)) {
    // Redirect unauthorized users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
