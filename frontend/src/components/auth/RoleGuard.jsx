import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const RoleGuard = ({ allowedRoles, children }) => {
  const { user, dbUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07070B]">
        <div className="text-[#8A8A94] text-sm">Loading environment...</div>
      </div>
    );
  }

  if (!user || !dbUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

export const PublicGuard = ({ children }) => {
  const { user, dbUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07070B]">
        <div className="text-[#8A8A94] text-sm">Loading environment...</div>
      </div>
    );
  }

  if (user && dbUser) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};
