import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const ProtectedRoute = ({ children }: PropsWithChildren) => {
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

  return <>{children}</>;
};

export default ProtectedRoute;
